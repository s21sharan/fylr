const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { PythonShell } = require('python-shell');
const fs = require('fs');

let mainWindow;

const DEBUG = true;

function debug(message, data) {
  if (DEBUG) {
    if (data) {
      console.log(`[DEBUG] ${message}`, data);
    } else {
      console.log(`[DEBUG] ${message}`);
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Fylr',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.on('closed', () => mainWindow = null);
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

// Add new IPC handler for directory validation
ipcMain.handle('validate-directory', async (event, dirPath) => {
  try {
    const stats = await fs.promises.stat(dirPath);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
});

// Existing directory selection handler
ipcMain.handle('select-directory', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Directory to Organize',
      buttonLabel: 'Select Folder'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  } catch (error) {
    console.error('Error selecting directory:', error);
    throw error;
  }
});

// Function to get Python path based on the environment
function getPythonPath() {
  // First check for virtual environment
  const venvPath = path.join(__dirname, 'venv');
  const pythonPath = process.platform === 'win32' 
    ? path.join(venvPath, 'Scripts', 'python.exe')
    : path.join(venvPath, 'bin', 'python');
    
  if (fs.existsSync(pythonPath)) {
    return pythonPath;
  }
  
  // Fallback to system Python
  return process.platform === 'win32' ? 'python' : 'python3';
}

// Function to analyze directory using Python script
async function analyzeDirectory(directory, specificity) {
  return new Promise((resolve, reject) => {
    // Create a temporary JSON file to pass the configuration to Python
    const configPath = path.join(app.getPath('temp'), 'file_organizer_config.json');
    fs.writeFileSync(configPath, JSON.stringify({ 
      directory: directory,
      specificity: specificity 
    }));
    
    // Path to Python script
    const scriptPath = path.join(__dirname, 'backend', 'initial_organize_electron.py');
    
    // Get the path to the Python executable
    const pythonPath = getPythonPath();
    
    const options = {
      mode: 'text',
      pythonPath: pythonPath,
      pythonOptions: ['-u'],
      args: [configPath]
    };
    
    PythonShell.run(scriptPath, options, (err, results) => {
      if (err) {
        console.error('Python script error:', err);
        reject(err);
        return;
      }
      
      try {
        // Find the JSON output (the line after RAW LLM RESPONSE)
        let jsonOutput = '';
        let foundRawLLMResponse = false;
        
        for (const line of results) {
          if (foundRawLLMResponse) {
            jsonOutput += line;
          }
          if (line.includes('RAW LLM RESPONSE:')) {
            foundRawLLMResponse = true;
          }
        }
        
        // Extract JSON using a more robust approach
        const jsonRegex = /{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*}/g;
        const matches = jsonOutput.match(jsonRegex);
        
        if (matches && matches.length > 0) {
          // Try each potential JSON match until one parses successfully
          for (const match of matches) {
            try {
              const result = JSON.parse(match);
              if (result) {
                resolve(result);
                return;
              }
            } catch (e) {
              // Continue to next match
              console.log('Failed to parse JSON match:', e);
            }
          }
        }
        
        reject(new Error('Could not find valid JSON structure in Python output'));
      } catch (error) {
        console.error('Error parsing Python output:', error);
        reject(error);
      }
    });
  });
}

// Handle directory analysis request
ipcMain.handle('analyze-directory', async (event, { directory, specificity }) => {
  try {
    const result = await analyzeDirectory(directory, specificity);
    return JSON.stringify(result);
  } catch (error) {
    console.error('Error analyzing directory:', error);
    throw error;
  }
});

// Apply changes
ipcMain.handle('apply-changes', async (event, fileStructure) => {
  return new Promise((resolve, reject) => {
    // Create a temporary JSON file to pass the file structure to Python
    const structurePath = path.join(app.getPath('temp'), 'file_structure.json');
    fs.writeFileSync(structurePath, JSON.stringify(fileStructure));
    
    // Path to Python script
    const scriptPath = path.join(__dirname, 'backend', 'apply_changes.py');
    
    // Get the path to the virtual environment's Python executable
    const pythonPath = getPythonPath();
    
    const options = {
      mode: 'text',
      pythonPath: pythonPath,
      pythonOptions: ['-u'],
      args: [structurePath]
    };
    
    PythonShell.run(scriptPath, options, (err, results) => {
      if (err) {
        reject(err);
        return;
      }
      
      resolve({ success: true, message: results.join('\n') });
    });
  });
});

// Check if test.json exists in the project root directory
ipcMain.handle('check-test-json', async (event) => {
  const testJsonPath = path.join(__dirname, 'test.json');
  debug(`Checking for test.json at: ${testJsonPath}`);
  return fs.existsSync(testJsonPath);
});

// Read test.json from the project root directory
ipcMain.handle('read-test-json', async (event) => {
  const testJsonPath = path.join(__dirname, 'test.json');
  try {
    debug(`Reading test.json from: ${testJsonPath}`);
    const data = fs.readFileSync(testJsonPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    debug(`Error reading test.json: ${error.message}`);
    throw new Error(`Failed to read test.json: ${error.message}`);
  }
});

ipcMain.handle('chat-query', async (event, { message, currentFileStructure }) => {
  try {
    const configPath = path.join(app.getPath('temp'), 'chat_query_config.json');
    const scriptPath = path.join(__dirname, 'backend', 'chat_agent_runner.py');
    const pythonPath = getPythonPath();

    fs.writeFileSync(configPath, JSON.stringify({
      message,
      currentFileStructure
    }));

    const options = {
      mode: 'text',
      pythonPath: pythonPath,
      pythonOptions: ['-u'],
      args: [configPath]
    };

    return new Promise((resolve, reject) => {
      PythonShell.run(scriptPath, options, (err, results) => {
        if (err) {
          console.error('Chat agent error:', err);
          reject(err);
          return;
        }

        try {
          const lastLine = results[results.length - 1];
          const data = JSON.parse(lastLine);
          resolve(data);
        } catch (parseError) {
          console.error('Failed to parse chat agent output:', parseError);
          reject(parseError);
        }
      });
    });

  } catch (err) {
    console.error('Error in chat-query handler:', err);
    return { error: err.message };
  }
});

// Add after existing IPC handlers
ipcMain.handle('get-files', async (event, directoryPath) => {
  try {
    const files = await fs.promises.readdir(directoryPath, { withFileTypes: true });
    return files
      .filter(file => file.isFile())
      .map(file => ({
        name: file.name,
        path: path.join(directoryPath, file.name)
      }));
  } catch (error) {
    console.error('Error reading directory:', error);
    throw error;
  }
});

// Add new IPC handler for generating filenames
ipcMain.handle('generate-filenames', async (event, { files }) => {
  try {
    // Create a temporary JSON file to pass the files to Python
    const configPath = path.join(app.getPath('temp'), 'rename_files_config.json');
    const scriptPath = path.join(__dirname, 'backend', 'rename_files.py');
    const pythonPath = getPythonPath();

    // Write the config file
    fs.writeFileSync(configPath, JSON.stringify({
      action: 'generate',
      files: files
    }));

    const options = {
      mode: 'text',
      pythonPath: pythonPath,
      pythonOptions: ['-u'],
      args: [configPath]
    };

    return new Promise((resolve, reject) => {
      PythonShell.run(scriptPath, options, (err, results) => {
        if (err) {
          console.error('Python script error:', err);
          reject(err);
          return;
        }

        try {
          const lastLine = results[results.length - 1];
          const data = JSON.parse(lastLine);
          resolve(data);
        } catch (parseError) {
          console.error('Failed to parse Python output:', parseError);
          reject(parseError);
        }
      });
    });
  } catch (error) {
    console.error('Error in generate-filenames handler:', error);
    return { success: false, error: error.message };
  }
});

// Update the rename-files handler
ipcMain.handle('rename-files', async (event, { files, new_names }) => {
  try {
    // Create a temporary JSON file to pass the files and new names to Python
    const configPath = path.join(app.getPath('temp'), 'rename_files_config.json');
    const scriptPath = path.join(__dirname, 'backend', 'rename_files.py');
    const pythonPath = getPythonPath();

    // Write the config file
    fs.writeFileSync(configPath, JSON.stringify({
      action: 'rename',
      files: files,
      new_names: new_names
    }));

    const options = {
      mode: 'text',
      pythonPath: pythonPath,
      pythonOptions: ['-u'],
      args: [configPath]
    };

    return new Promise((resolve, reject) => {
      PythonShell.run(scriptPath, options, (err, results) => {
        if (err) {
          console.error('Python script error:', err);
          reject(err);
          return;
        }

        try {
          const lastLine = results[results.length - 1];
          const data = JSON.parse(lastLine);
          resolve(data);
        } catch (parseError) {
          console.error('Failed to parse Python output:', parseError);
          reject(parseError);
        }
      });
    });
  } catch (error) {
    console.error('Error in rename-files handler:', error);
    return { success: false, error: error.message };
  }
});

function generateNewFileName(originalName, pattern) {
  if (!pattern) return originalName;
  
  const extension = originalName.split('.').pop();
  const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
  
  // Replace pattern variables
  let newName = pattern
    .replace(/{filename}/g, baseName)
    .replace(/{date}/g, new Date().toISOString().split('T')[0])
    .replace(/{timestamp}/g, Date.now());
  
  // Add extension if not present
  if (!newName.includes('.')) {
    newName += `.${extension}`;
  }
  
  return newName;
}