const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

// Whether the app is packaged
const isPackaged = app.isPackaged;

// Get the correct path for resources
function getResourcePath(...relativePaths) {
  if (isPackaged) {
    return path.join(process.resourcesPath, ...relativePaths);
  } else {
    return path.join(__dirname, ...relativePaths);
  }
}

let mainWindow;
let isOnlineMode = true; // Add default online mode state
let tokenUsage = 0;
let callUsage = 0;
const TOKEN_LIMIT = 30000;
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
  const iconPath = getResourcePath('assets', 'icon.png');
  
  // Register protocol handler for loading local files
  if (isPackaged) {
    protocol.registerFileProtocol('app', (request, callback) => {
      const url = request.url.substring(6);
      try {
        const filePath = path.join(process.resourcesPath, url);
        debug(`Protocol handler: ${request.url} -> ${filePath}`);
        if (fs.existsSync(filePath)) {
          callback({ path: filePath });
        } else {
          debug(`Protocol handler: File not found at ${filePath}`);
          callback({ error: -6 }); // FILE_NOT_FOUND
        }
      } catch (err) {
        debug(`Protocol handler error: ${err.message}`);
        callback({ error: -2 }); // FAILED
      }
    });
  }
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Fylr',
    frame: false, // Remove the default window frame
    titleBarStyle: 'hidden', // Hide the title bar
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false // Allow loading local resources
    }
  });

  // Try different approaches to load the HTML
  const possiblePaths = [
    path.join(__dirname, 'renderer', 'index.html'),
    path.join(app.getAppPath(), 'renderer', 'index.html'),
    isPackaged ? path.join(process.resourcesPath, 'app.asar', 'renderer', 'index.html') : null,
    isPackaged ? path.join(process.resourcesPath, 'renderer', 'index.html') : null,
    isPackaged ? path.join(process.resourcesPath, 'app', 'renderer', 'index.html') : null
  ].filter(Boolean);

  let loaded = false;
  
  for (const htmlPath of possiblePaths) {
    debug(`Trying to load HTML from: ${htmlPath}`);
    if (fs.existsSync(htmlPath)) {
      debug(`File exists, loading: ${htmlPath}`);
      mainWindow.loadFile(htmlPath).catch(err => {
        debug(`Error loading file ${htmlPath}: ${err.message}`);
      });
      loaded = true;
      break;
    }
  }
  
  // If normal file loading fails, try with the app protocol
  if (!loaded && isPackaged) {
    const protocolUrls = [
      'app://./renderer/index.html',
      'file://' + path.join(process.resourcesPath, 'renderer', 'index.html')
    ];
    
    let protocolAttempts = 0;
    const tryNextProtocol = () => {
      if (protocolAttempts >= protocolUrls.length) {
        debug('All protocol attempts failed, opening dev tools');
        mainWindow.webContents.openDevTools();
        return;
      }
      
      const url = protocolUrls[protocolAttempts];
      debug(`Trying to load via protocol (${protocolAttempts + 1}/${protocolUrls.length}): ${url}`);
      
      mainWindow.loadURL(url).catch(err => {
        debug(`Protocol load failed (${url}): ${err.message}`);
        protocolAttempts++;
        tryNextProtocol();
      });
    };
    
    tryNextProtocol();
  }
  
  // Add general error handler
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    debug(`Page load failed: ${errorDescription} (${errorCode})`);
    mainWindow.webContents.openDevTools();
  });
  
  mainWindow.on('closed', () => mainWindow = null);

  // Set the dock icon on macOS
  if (process.platform === 'darwin') {
    app.dock.setIcon(iconPath);
  }

  // Handle token usage updates from Python process
  mainWindow.webContents.on('console-message', (event, level, message) => {
    if (message.startsWith('TOKEN_USAGE:')) {
      const tokens = parseInt(message.split(':')[1]);
      tokenUsage = tokens;
      debug('Token usage updated:', tokens);
      mainWindow.webContents.send('token-usage-update', tokens);
    } else if (message.startsWith('CALL_USAGE:')) {
      const calls = parseInt(message.split(':')[1]);
      callUsage = calls;
      debug('Call usage updated:', calls);
      mainWindow.webContents.send('call-usage-update', calls);
    } else if (message.startsWith('TOKEN_LIMIT_REACHED:')) {
      const tokens = parseInt(message.split(':')[1]);
      debug('Token limit reached:', tokens);
      mainWindow.webContents.send('token-limit-reached', tokens);
      isOnlineMode = false;
    } else if (message.startsWith('CALL_LIMIT_REACHED:')) {
      const calls = parseInt(message.split(':')[1]);
      debug('Call limit reached:', calls);
      mainWindow.webContents.send('call-limit-reached', calls);
      isOnlineMode = false;
    } else if (message === 'MODE_SWITCH:offline') {
      debug('Switching to offline mode');
      isOnlineMode = false;
      mainWindow.webContents.send('mode-switch', 'offline');
    }
  });
}

app.on('ready', () => {
  createWindow();
  
  // Check for updates on startup (in a packaged app)
  if (isPackaged) {
    setTimeout(() => {
      debug('Checking for Python dependencies...');
      try {
        const requirementsPath = path.join(process.resourcesPath, 'requirements.txt');
        if (fs.existsSync(requirementsPath)) {
          debug(`Requirements file found at ${requirementsPath}`);
          mainWindow.webContents.send('status-update', 'Checking Python dependencies...');
        } else {
          debug('Requirements file not found');
        }
      } catch (error) {
        debug('Error checking Python dependencies:', error);
      }
    }, 5000);
  }
});

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

// Function to get the path to the backend executable
function getBackendExePath(scriptName) {
  const baseName = scriptName.replace('.py', '');
  const exeExtension = process.platform === 'win32' ? '.exe' : '';
  const exeName = `${baseName}${exeExtension}`;
  
  if (isPackaged) {
    // Path in packaged app (copied by electron-builder)
    return getResourcePath('backend_bin', exeName);
  } else {
    // Path during development (output of build_backend.sh)
    return path.join(__dirname, 'dist_pyinstaller', exeName);
  }
}

// Helper function to run backend executables
function runBackendExecutable(scriptName, args, callback) {
  const exePath = getBackendExePath(scriptName);
  debug(`Executing backend: ${exePath} with args: ${args.join(' ')}`);
  
  if (!fs.existsSync(exePath)) {
    const errorMsg = `Backend executable not found: ${exePath}`;
    console.error(errorMsg);
    debug(errorMsg);
    if (callback) {
      callback(new Error(errorMsg), null);
    }
    return Promise.reject(new Error(errorMsg));
  }

  return new Promise((resolve, reject) => {
    execFile(exePath, args, (error, stdout, stderr) => {
      if (error) {
        debug(`Error executing backend: ${error.message}`);
        if (stderr) {
          debug(`Stderr: ${stderr}`);
        }
        
        if (callback) {
          callback(error, null);
        }
        reject(error);
        return;
      }
      
      debug(`Backend execution completed with stdout length: ${stdout.length} bytes`);
      if (stderr) {
        debug(`Stderr: ${stderr}`);
      }
      
      // Try to extract JSON result if present
      let result = stdout;
      try {
        // Look for a JSON marker in the output
        const jsonMarker = 'JSONRESULT';
        const jsonIndex = stdout.indexOf(jsonMarker);
        
        if (jsonIndex !== -1) {
          // Extract the JSON part after the marker
          const jsonPart = stdout.substring(jsonIndex + jsonMarker.length).trim();
          // Try to parse it as JSON
          const parsedJson = JSON.parse(jsonPart);
          result = parsedJson;
          debug('Successfully extracted and parsed JSON from output');
        } else {
          // Try to parse the entire output as JSON
          const parsedJson = JSON.parse(stdout);
          result = parsedJson;
          debug('Successfully parsed entire output as JSON');
        }
      } catch (parseError) {
        // If parsing fails, return the raw output
        debug(`Failed to parse output as JSON: ${parseError.message}`);
        result = stdout;
      }
      
      if (callback) {
        callback(null, result);
      }
      resolve({
        success: true,
        output: result,
        error: stderr || null
      });
    });
  });
}

// Update IPC handlers to use runBackendExecutable

ipcMain.handle('analyze-directory', async (event, directoryPath) => {
  return new Promise((resolve, reject) => {
    const configPath = path.join(app.getPath('temp'), 'file_organizer_config.json');
    const configData = { directory: directoryPath, online_mode: isOnlineMode };
    fs.writeFileSync(configPath, JSON.stringify(configData));
    
    runBackendExecutable('initial_organize_electron.py', [configPath], (err, result) => {
      if (err) {
        reject(err);
      } else {
        // If result is expected to be JSON, it should be parsed in runBackendExecutable
        resolve(result);
      }
    });
  });
});

ipcMain.handle('apply-changes', async (event, fileStructure) => {
  return new Promise((resolve, reject) => {
    const structurePath = path.join(app.getPath('temp'), 'file_structure.json');
    fs.writeFileSync(structurePath, JSON.stringify(fileStructure));
    
    runBackendExecutable('apply_changes.py', [structurePath], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result); // Assuming result is stdout confirmation
      }
    });
  });
});

ipcMain.handle('chat-query', async (event, { message, currentFileStructure }) => {
  return new Promise((resolve, reject) => {
    const configPath = path.join(app.getPath('temp'), 'chat_query_config.json');
    const configData = { query: message, file_structure: currentFileStructure };
    fs.writeFileSync(configPath, JSON.stringify(configData));
    
    runBackendExecutable('chat_agent_runner.py', [configPath], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result); // Assuming result is the chat response (maybe JSON?)
      }
    });
  });
});

ipcMain.handle('generate-filenames', async (event, { files, online_mode }) => {
  return new Promise((resolve, reject) => {
    const configPath = path.join(app.getPath('temp'), 'rename_files_config.json');
    const configData = { files: files, online_mode: online_mode, action: 'generate' };
    fs.writeFileSync(configPath, JSON.stringify(configData));
    
    runBackendExecutable('rename_files.py', [configPath], (err, result) => {
      if (err) {
        console.error("Error from generate-filenames backend:", err);
        reject(err); // Reject the promise for the renderer
      } else {
        // 'result' should be the parsed JSON { success: bool, generated_names: {...} } or stdout string
        debug("Received result from generate-filenames backend:", result);
        // We resolve the promise, which sends the result back to the renderer
        resolve(result); 
      }
    });
  });
});

ipcMain.handle('rename-files', async (event, filesToProcess) => {
  return new Promise((resolve, reject) => {
    const configPath = path.join(app.getPath('temp'), 'rename_files_config.json');
    const configData = { files: filesToProcess, action: 'rename' };
    fs.writeFileSync(configPath, JSON.stringify(configData));
    
    runBackendExecutable('rename_files.py', [configPath], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result); // Assuming result is stdout confirmation
      }
    });
  });
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

// Add handler to check for test.json
ipcMain.handle('check-test-json', async (event) => {
  const testJsonPath = getResourcePath('test.json');
  debug(`Checking for test.json at: ${testJsonPath}`);
  return fs.existsSync(testJsonPath);
});

// Add handler to read test.json
ipcMain.handle('read-test-json', async (event) => {
  const testJsonPath = getResourcePath('test.json');
  debug(`Reading test.json from: ${testJsonPath}`);
  try {
    const data = fs.readFileSync(testJsonPath, 'utf8');
    return data;
  } catch (error) {
    debug(`Error reading test.json: ${error.message}`);
    return null;
  }
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

// Handle file organization
ipcMain.handle('organize-files', async (event, { directory, onlineMode }) => {
  try {
    debug(`==================================================================`);
    debug(`STARTING FILE ORGANIZATION WITH:`);
    debug(`Directory: ${directory}`);
    debug(`Online Mode: ${onlineMode} (${typeof onlineMode})`);
    debug(`==================================================================`);
    
    // Check if we've reached limits
    if (onlineMode && (tokenUsage >= TOKEN_LIMIT || callUsage >= CALL_LIMIT)) {
      debug('Limits reached, forcing offline mode');
      onlineMode = false;
    }

    // Convert onlineMode to a definite boolean in case it's passed as a string
    if (typeof onlineMode === 'string') {
      const originalValue = onlineMode;
      onlineMode = (onlineMode.toLowerCase() === 'true');
      debug(`Converted string online mode "${originalValue}" to boolean: ${onlineMode}`);
    } else {
      onlineMode = Boolean(onlineMode);
    }
    
    const config = {
      directory: directory,
      online_mode: onlineMode
    };

    debug(`SAVING CONFIG WITH EXPLICIT VALUES:`);
    debug(`- directory: ${config.directory}`);
    debug(`- online_mode: ${config.online_mode} (${typeof config.online_mode})`);

    // Use a more specific config file name for clarity
    const configPath = path.join(app.getPath('temp'), 'organize_files_config.json');
    
    // Write the config file with indentation for readability in case we need to inspect it
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    // Verify the written file contents
    try {
      const writtenContent = fs.readFileSync(configPath, 'utf8');
      debug(`Verified config file contents:`);
      debug(writtenContent);
    } catch (err) {
      debug(`Error reading back config file: ${err.message}`);
    }

    debug(`Executing initial_organize_electron.py with config at: ${configPath}`);
    const result = await runBackendExecutable('initial_organize_electron.py', [configPath]);
    
    debug(`Organization completed with result type: ${typeof result.output}`);
    if (typeof result.output === 'object') {
      debug(`Output is an object with keys: ${Object.keys(result.output).join(', ')}`);
    }

    return {
      success: true,
      output: result.output,
      error: result.error,
      tokenUsage,
      callUsage,
      isOnlineMode: onlineMode,
      configUsed: config // Return the actual config used for debugging
    };
  } catch (error) {
    debug(`ERROR ORGANIZING FILES: ${error.message}`);
    debug(error.stack);
    
    return {
      success: false,
      error: error.message,
      tokenUsage,
      callUsage,
      isOnlineMode: onlineMode
    };
  }
});

// Add after the existing IPC handlers
ipcMain.handle('toggle-devtools', () => {
  if (mainWindow) {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools();
    }
  }
});

// Open dev tools in development mode
if (!isPackaged) {
  mainWindow.webContents.openDevTools();
}

// Add global error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  debug('UNCAUGHT EXCEPTION:', error);
  
  if (mainWindow) {
    mainWindow.webContents.send('error-notification', {
      title: 'Application Error',
      message: `An unexpected error occurred: ${error.message}`,
      type: 'error'
    });
  }
  
  // Don't quit the app, just log the error
});