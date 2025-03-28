const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { PythonShell } = require('python-shell');
const fs = require('fs');
const { getPythonPath } = require('./find_python.js');

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
    fs.writeFileSync(configPath, JSON.stringify({ directory: directoryPath }));
    
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
    const { default: fetch } = await import('node-fetch');

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral',
        prompt: `Organize the following files:\n${JSON.stringify(currentFileStructure)}\n\nUser instruction: ${message}`,
        stream: false
      })
    });

    const data = await response.json();
    return { response: data.response };
  } catch (err) {
    console.error('Error in chat-query handler:', err);
    return { error: err.message };
  }
});