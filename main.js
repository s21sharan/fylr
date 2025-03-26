const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { PythonShell } = require('python-shell');
const fs = require('fs');
const { getPythonPath } = require('./find_python.js');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
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

// Handle directory selection
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
  return new Promise((resolve, reject) => {
    // Create a temporary JSON file to pass the directory path to Python
    const configPath = path.join(app.getPath('temp'), 'file_organizer_config.json');
    fs.writeFileSync(configPath, JSON.stringify({ directory: directoryPath }));
    
    // Path to Python script
    const scriptPath = path.join(__dirname, 'backend', 'initial_organize_electron.py');
    
    // Get the path to the virtual environment's Python executable
    const pythonPath = getPythonPath();
    console.log(`Using Python interpreter: ${pythonPath}`);
    
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
      
      // The last line of output should be the file structure JSON
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
        
        console.log('Attempting to parse:', jsonOutput);
        
        // Extract JSON using a more robust approach
        // Look for a valid JSON structure - matching outermost braces
        const jsonRegex = /{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*}/g;
        const matches = jsonOutput.match(jsonRegex);
        
        if (matches && matches.length > 0) {
          // Try each potential JSON match until one parses successfully
          let result = null;
          for (const match of matches) {
            try {
              result = JSON.parse(match);
              if (result) break;
            } catch (e) {
              console.log('Failed to parse potential JSON match:', e);
              // Continue to next match
            }
          }
          
          if (result) {
            resolve(result);
          } else {
            throw new Error('None of the extracted JSON structures were valid');
          }
        } else {
          throw new Error('Could not find valid JSON structure in Python output');
        }
      } catch (error) {
        console.error('Error parsing Python output:', error);
        console.error('Raw output:', results.join('\n'));
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