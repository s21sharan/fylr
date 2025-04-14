const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { PythonShell } = require('python-shell');
const fs = require('fs');
const { getPythonPath } = require('./find_python.js');

let mainWindow;
let isOnlineMode = true; // Add default online mode state
let tokenUsage = 0;
let callUsage = 0;
const TOKEN_LIMIT = 15000;
const CALL_LIMIT = 10;

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
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Fylr',
    frame: false, // Remove the default window frame
    titleBarStyle: 'hidden', // Hide the title bar
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.on('closed', () => mainWindow = null);

  // Set the dock icon on macOS
  if (process.platform === 'darwin') {
    app.dock.setIcon(iconPath);
  }
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
  debug(`Current online mode state: ${isOnlineMode}`);
  return new Promise((resolve, reject) => {
    // Create a temporary JSON file to pass the directory path to Python
    const configPath = path.join(app.getPath('temp'), 'file_organizer_config.json');
    debug(`Creating config file at: ${configPath}`);
    
    const configData = { 
      directory: directoryPath,
      online_mode: isOnlineMode  // Include online mode in config
    };
    
    debug(`Config data for Python: ${JSON.stringify(configData)}`);
    fs.writeFileSync(configPath, JSON.stringify(configData));
    
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
    const pythonProcess = PythonShell.run(scriptPath, options, (err, results) => {
      if (err) {
        console.error('Python script error:', err);
        debug('Python execution failed with error', err);
        reject(err);
        return;
      }
      
      debug(`Python script execution completed with ${results.length} lines of output`);
      
      // Process results and track token usage
      let jsonOutput = '';
      let foundRawLLMResponse = false;
      
      for (const line of results) {
        if (line.startsWith('TOKEN_USAGE:') && isOnlineMode) {
          // Only track tokens and calls in online mode
          const tokens = parseInt(line.split(':')[1]);
          updateTokenUsage(tokens);
          updateCallUsage();
        } else if (foundRawLLMResponse) {
          jsonOutput += line;
        } else if (line.includes('RAW LLM RESPONSE:')) {
          foundRawLLMResponse = true;
          debug('Found LLM response marker in output');
        }
      }
      
      try {
        const jsonRegex = /{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*}/g;
        const matches = jsonOutput.match(jsonRegex);
        
        if (matches && matches.length > 0) {
          debug(`Found ${matches.length} potential JSON matches`);
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
    
    // Handle process output
    pythonProcess.on('message', (message) => {
      if (message.startsWith('TOKEN_USAGE:') && isOnlineMode) {
        // Only track tokens and calls in online mode
        const tokens = parseInt(message.split(':')[1]);
        updateTokenUsage(tokens);
        updateCallUsage();
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

    // Include the current online mode in the configuration
    fs.writeFileSync(configPath, JSON.stringify({
      message,
      currentFileStructure,
      online_mode: isOnlineMode
    }));

    // Call usage will only be updated if we're in online mode 
    // due to the check inside updateCallUsage
    updateCallUsage();

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
          // Process results for token usage tracking
          let lastLine = '';
          for (const line of results) {
            // Only track token usage when in online mode
            if (line.startsWith('TOKEN_USAGE:') && isOnlineMode) {
              const tokens = parseInt(line.split(':')[1]);
              updateTokenUsage(tokens);
            } else {
              lastLine = line;
            }
          }
          
          // If no content was found, use the last line
          if (!lastLine && results.length > 0) {
            lastLine = results[results.length - 1];
          }
          
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
      .map(file => {
        const filePath = path.join(directoryPath, file.name);
        const stats = fs.statSync(filePath);
        return {
          name: file.name,
          path: filePath,
          size: stats.size // File size in bytes
        };
      });
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

// Add handler to get current online mode
ipcMain.handle('get-online-mode', async (event) => {
  debug(`Getting current online mode: ${isOnlineMode}`);
  return isOnlineMode;
});

// Update generate-filenames handler
ipcMain.handle('generate-filenames', async (event, { files, online_mode }) => {
  try {
    const configPath = path.join(app.getPath('temp'), 'rename_files_config.json');
    const scriptPath = path.join(__dirname, 'backend', 'rename_files.py');
    const pythonPath = getPythonPath();

    debug('Generating filenames with config:', { files, online_mode });
    
    // Add check for online mode and API key availability
    if (online_mode) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        debug('WARNING: OpenAI API key not found but online mode requested');
        return {
          success: false,
          error: "OpenAI API key not found. Please add your API key or switch to offline mode.",
          generated_names: {}
        };
      }
    }
    
    // Call usage will only be updated if we're in online mode
    // and the online_mode parameter is true
    if (online_mode) {
      updateCallUsage();
    }
    
    fs.writeFileSync(configPath, JSON.stringify({
      action: 'generate',
      files: files,
      online_mode: online_mode
    }));

    const options = {
      mode: 'text',
      pythonPath: pythonPath,
      pythonOptions: ['-u'],
      args: [configPath]
    };

    return new Promise((resolve, reject) => {
      debug('Starting Python process with options:', options);
      const pythonProcess = PythonShell.run(scriptPath, options, (err, results) => {
        if (err) {
          console.error('Python script error:', err);
          debug('Python execution failed with error:', err);
          
          // Provide a more helpful error message
          if (err.message && err.message.includes('ModuleNotFoundError: No module named \'moondream\'')) {
            reject(new Error('The Moondream module is not installed. Try using online mode or install the required dependencies.'));
          } else {
            reject(err);
          }
          return;
        }

        debug('Python script output:', results);
        try {
          // Process all output lines to capture token usage
          let lastLine = '';
          for (const line of results) {
            // Only track token usage when in online mode
            if (line.startsWith('TOKEN_USAGE:') && online_mode) {
              const tokens = parseInt(line.split(':')[1]);
              updateTokenUsage(tokens);
            } else {
              lastLine = line;
            }
          }

          // Parse the final JSON result
          debug('Last line of output:', lastLine);
          const data = JSON.parse(lastLine);
          resolve(data);
        } catch (parseError) {
          console.error('Failed to parse Python output:', parseError);
          debug('Failed to parse output:', parseError);
          reject(parseError);
        }
      });

      // Handle process output in real-time
      pythonProcess.on('message', (message) => {
        // Only track token usage when in online mode
        if (message.startsWith('TOKEN_USAGE:') && online_mode) {
          const tokens = parseInt(message.split(':')[1]);
          updateTokenUsage(tokens);
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('Python process error:', error);
        debug('Python process error:', error);
      });
    });
  } catch (error) {
    console.error('Error in generate-filenames handler:', error);
    debug('Error in generate-filenames handler:', error);
    return { success: false, error: error.message };
  }
});

// Update rename-files handler
ipcMain.handle('rename-files', async (event, filesToProcess) => {
  try {
    const configPath = path.join(app.getPath('temp'), 'rename_files_config.json');
    const scriptPath = path.join(__dirname, 'backend', 'rename_files.py');
    const pythonPath = getPythonPath();

    // Convert the file list to the format expected by the Python script
    const files = filesToProcess.map(file => ({
      path: file.oldPath,
      name: path.basename(file.oldPath)
    }));
    
    const new_names = {};
    filesToProcess.forEach(file => {
      new_names[path.basename(file.oldPath)] = file.newName;
    });
    
    // Call usage will only be updated if we're in online mode
    // due to the check inside updateCallUsage
    updateCallUsage();

    fs.writeFileSync(configPath, JSON.stringify({
      action: 'rename',
      files: files,
      new_names: new_names,
      online_mode: isOnlineMode
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
          // Process results for token usage (if any) and get the last line
          let lastLine = '';
          for (const line of results) {
            // Only track token usage when in online mode
            if (line.startsWith('TOKEN_USAGE:') && isOnlineMode) {
              const tokens = parseInt(line.split(':')[1]);
              updateTokenUsage(tokens);
            } else {
              lastLine = line;
            }
          }
          
          // If no content was found in the results, use the last line
          if (!lastLine && results.length > 0) {
            lastLine = results[results.length - 1];
          }
          
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

// Add window control handlers
ipcMain.handle('minimize-window', () => {
  mainWindow.minimize();
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle('close-window', () => {
  mainWindow.close();
});

// Add rate limit tracking functions
function updateTokenUsage(tokens) {
  tokenUsage += tokens;
  if (mainWindow) {
    mainWindow.webContents.send('update-token-usage', tokenUsage);
  }
}

function updateCallUsage(forceUpdate = false) {
  // Only increment the call count if explicitly in online mode or forced
  if (isOnlineMode || forceUpdate) {
    callUsage += 1;
    if (mainWindow) {
      mainWindow.webContents.send('update-call-usage', callUsage);
    }
  }
}

function resetRateLimits() {
  tokenUsage = 0;
  callUsage = 0;
  if (mainWindow) {
    mainWindow.webContents.send('update-token-usage', tokenUsage);
    mainWindow.webContents.send('update-call-usage', callUsage);
  }
}

// Add IPC handler for checking rate limits
ipcMain.handle('check-rate-limits', async () => {
  return {
    tokenUsage,
    callUsage,
    tokenLimit: TOKEN_LIMIT,
    callLimit: CALL_LIMIT,
    canProceed: tokenUsage < TOKEN_LIMIT && callUsage < CALL_LIMIT
  };
});

// Add IPC handler for resetting rate limits
ipcMain.handle('reset-rate-limits', async () => {
  resetRateLimits();
  return true;
});

// Add IPC handler for updating call usage
ipcMain.handle('update-call-usage', async (event, forceUpdate = false) => {
  updateCallUsage(forceUpdate);
  return true;
});