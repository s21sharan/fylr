const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getPythonPath() {
  // Check for environment variable
  if (process.env.VIRTUAL_ENV) {
    const pythonBin = process.platform === 'win32' ? 'python.exe' : 'python';
    const pythonPath = path.join(process.env.VIRTUAL_ENV, 'bin', pythonBin);
    
    if (fs.existsSync(pythonPath)) {
      return pythonPath;
    }
  }
  
  // Try to find using commands
  try {
    if (process.platform === 'win32') {
      return execSync('where python').toString().trim().split('\n')[0];
    } else {
      return execSync('which python').toString().trim();
    }
  } catch (e) {
    // Fall back to system Python
    return 'python';
  }
}

module.exports = { getPythonPath }; 