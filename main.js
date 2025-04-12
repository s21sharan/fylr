const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { PythonShell } = require('python-shell');
const fs = require('fs');
const { getPythonPath } = require('./find_python.js');

let mainWindow;
let isOnlineMode = true; // Add default online mode state

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
      nodeIntegration: true,
      contextIsolation: false
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
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled) {
    return result.filePaths[0];
  }
  return null;
});

// Run Python script to analyze directory
ipcMain.handle('analyze-directory', async (event, directoryPath) => {
  debug(`Starting directory analysis: ${directoryPath}`);
  return new Promise((resolve, reject) => {
    // Create a temporary JSON file to pass the directory path to Python
    const configPath = path.join(app.getPath('temp'), 'file_organizer_config.json');
    debug(`Creating config file at: ${configPath}`);
    fs.writeFileSync(configPath, JSON.stringify({ 
      directory: directoryPath,
      online_mode: isOnlineMode  // Include online mode in config
    }));
    
    // Path to Python script
    const scriptPath = path.join(__dirname, 'backend', 'initial_organize_electron.py');
    debug(`Using Python script: ${scriptPath}`);
    
    // Get the path to the virtual environment's Python executable
    const pythonPath = getPythonPath();
    debug(`Using Python interpreter: ${pythonPath}`);
    
    const options = {
      mode: 'text',
      pythonPath: pythonPath,
      pythonOptions: ['-u'],
      args: [configPath]
    };
    
    debug('Starting Python process with options', options);
    PythonShell.run(scriptPath, options, (err, results) => {
      if (err) {
        console.error('Python script error:', err);
        debug('Python execution failed with error', err);
        reject(err);
        return;
      }
      
      debug(`Python script execution completed with ${results.length} lines of output`);
      
      // The last line of output should be the file structure JSON
      try {
        // Find the JSON output (the line after RAW LLM RESPONSE)
        debug('Processing Python output to find JSON response');
        let jsonOutput = '';
        let foundRawLLMResponse = false;
        
        for (const line of results) {
          if (foundRawLLMResponse) {
            jsonOutput += line;
          }
          if (line.includes('RAW LLM RESPONSE:')) {
            foundRawLLMResponse = true;
            debug('Found LLM response marker in output');
          }
        }
        
        debug('Attempting to parse JSON output');
        debug('JSON content to parse:', jsonOutput.substring(0, 500) + '...');
        
        // Extract JSON using a more robust approach
        const jsonRegex = /{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*}/g;
        const matches = jsonOutput.match(jsonRegex);
        
        if (matches && matches.length > 0) {
          debug(`Found ${matches.length} potential JSON matches`);
          // Try each potential JSON match until one parses successfully
          let result = null;
          for (const match of matches) {
            try {
              debug('Trying to parse JSON match', match.substring(0, 100) + '...');
              result = JSON.parse(match);
              if (result) {
                debug('Successfully parsed JSON data');
                break;
              }
            } catch (e) {
              debug(`Failed to parse potential JSON match: ${e.message}`);
              // Continue to next match
            }
          }
          
          if (result) {
            debug('Returning parsed result structure', result);
            resolve(result);
          } else {
            debug('No valid JSON structures found');
            throw new Error('None of the extracted JSON structures were valid');
          }
        } else {
          debug('No JSON patterns found in output');
          throw new Error('Could not find valid JSON structure in Python output');
        }
      } catch (error) {
        console.error('Error parsing Python output:', error);
        debug('Error parsing output', error);
        debug('Raw output:', results.join('\n'));
        reject(error);
      }
    });
  });
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

// Add new IPC handler for online mode toggle
ipcMain.handle('toggle-online-mode', async (event, online) => {
  debug(`Toggling online mode: ${online}`);
  isOnlineMode = online;
  return isOnlineMode;
});

// Update generate-filenames handler
ipcMain.handle('generate-filenames', async (event, { files }) => {
  try {
    const configPath = path.join(app.getPath('temp'), 'rename_files_config.json');
    const scriptPath = path.join(__dirname, 'backend', 'rename_files.py');
    const pythonPath = getPythonPath();

    debug('Generating filenames with config:', { files });
    fs.writeFileSync(configPath, JSON.stringify({
      action: 'generate',
      files: files,
      online_mode: isOnlineMode
    }));

    const options = {
      mode: 'text',
      pythonPath: pythonPath,
      pythonOptions: ['-u'],  // Unbuffered output
      args: [configPath]
    };

    return new Promise((resolve, reject) => {
      debug('Starting Python process with options:', options);
      const pythonProcess = PythonShell.run(scriptPath, options, (err, results) => {
        if (err) {
          console.error('Python script error:', err);
          debug('Python execution failed with error:', err);
          reject(err);
          return;
        }

        debug('Python script output:', results);
        try {
          const lastLine = results[results.length - 1];
          debug('Last line of output:', lastLine);
          const data = JSON.parse(lastLine);
          resolve(data);
        } catch (parseError) {
          console.error('Failed to parse Python output:', parseError);
          debug('Failed to parse output:', parseError);
          reject(parseError);
        }
      });

      // Log all output from the Python process
      pythonProcess.on('message', (message) => {
        console.log('Python output:', message);  // Log to console
        debug('Python output:', message);  // Log to debug
      });

      pythonProcess.on('error', (error) => {
        console.error('Python process error:', error);
        debug('Python process error:', error);
      });

      // Log stdout and stderr
      pythonProcess.stdout.on('data', (data) => {
        console.log('Python stdout:', data.toString());
        debug('Python stdout:', data.toString());
      });

      pythonProcess.stderr.on('data', (data) => {
        console.error('Python stderr:', data.toString());
        debug('Python stderr:', data.toString());
      });
    });
  } catch (error) {
    console.error('Error in generate-filenames handler:', error);
    debug('Error in generate-filenames handler:', error);
    return { success: false, error: error.message };
  }
});

// Update rename-files handler
ipcMain.handle('rename-files', async (event, { files, new_names }) => {
  try {
    const configPath = path.join(app.getPath('temp'), 'rename_files_config.json');
    const scriptPath = path.join(__dirname, 'backend', 'rename_files.py');
    const pythonPath = getPythonPath();

    fs.writeFileSync(configPath, JSON.stringify({
      action: 'rename',
      files: files,
      new_names: new_names,
      online_mode: isOnlineMode  // Include online mode in config
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