const { ipcRenderer } = require('electron');

// DOM Elements
const directoryInput = document.getElementById('directoryPath');
const browseBtn = document.getElementById('browseBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const loader = document.getElementById('loader');
const resultsContainer = document.getElementById('resultsContainer');
const fileTree = document.getElementById('fileTree');
const applyBtn = document.getElementById('applyBtn');
const messageContainer = document.getElementById('messageContainer');

// Store file structure data
let fileStructureData = null;

// Event listeners
browseBtn.addEventListener('click', async () => {
  const directoryPath = await ipcRenderer.invoke('select-directory');
  if (directoryPath) {
    directoryInput.value = directoryPath;
    analyzeBtn.disabled = false;
  }
});

analyzeBtn.addEventListener('click', async () => {
  const directoryPath = directoryInput.value;
  if (!directoryPath) return;
  
  // Show loader
  loader.style.display = 'flex';
  resultsContainer.style.display = 'none';
  messageContainer.innerHTML = '';
  
  try {
    // Call backend to analyze directory
    fileStructureData = await ipcRenderer.invoke('analyze-directory', directoryPath);
    
    // Build the file tree visualization
    buildFileTree(fileStructureData);
    
    // Hide loader and show results
    loader.style.display = 'none';
    resultsContainer.style.display = 'block';
  } catch (error) {
    loader.style.display = 'none';
    showMessage(`Error analyzing directory: ${error.message}`, 'error');
  }
});

applyBtn.addEventListener('click', async () => {
  if (!fileStructureData) return;
  
  // Show loader
  loader.style.display = 'flex';
  applyBtn.disabled = true;
  
  try {
    // Call backend to apply changes
    const result = await ipcRenderer.invoke('apply-changes', fileStructureData);
    
    loader.style.display = 'none';
    applyBtn.disabled = false;
    
    if (result.success) {
      showMessage('File structure reorganization completed successfully!', 'success');
    } else {
      showMessage(`Error applying changes: ${result.message}`, 'error');
    }
  } catch (error) {
    loader.style.display = 'none';
    applyBtn.disabled = false;
    showMessage(`Error applying changes: ${error.message}`, 'error');
  }
});

// Build file tree visualization
function buildFileTree(data) {
  fileTree.innerHTML = '';
  
  // Group files by directory
  const dirStructure = {};
  
  // Process all files
  for (const file of data.files) {
    const srcPath = file.src_path;
    const dstPath = file.dst_path;
    
    // Get destination directory
    const lastSlashIndex = dstPath.lastIndexOf('/');
    const dirPath = lastSlashIndex > 0 ? dstPath.substring(0, lastSlashIndex) : '';
    const fileName = lastSlashIndex > 0 ? dstPath.substring(lastSlashIndex + 1) : dstPath;
    
    // Add to directory structure
    if (!dirStructure[dirPath]) {
      dirStructure[dirPath] = [];
    }
    
    dirStructure[dirPath].push({
      originalPath: srcPath,
      newPath: dstPath,
      fileName: fileName
    });
  }
  
  // Create root element
  const rootElement = document.createElement('div');
  rootElement.textContent = 'ROOT';
  rootElement.className = 'folder';
  fileTree.appendChild(rootElement);
  
  // Create an unordered list for the root
  const rootList = document.createElement('ul');
  fileTree.appendChild(rootList);
  
  // Sort directories
  const sortedDirs = Object.keys(dirStructure).sort();
  
  // Add root files first
  if (dirStructure['']) {
    dirStructure[''].forEach(file => {
      const li = document.createElement('li');
      li.className = 'file';
      li.textContent = file.fileName;
      li.title = `Original: ${file.originalPath}\nNew: ${file.newPath}`;
      rootList.appendChild(li);
    });
  }
  
  // Add directories and their files
  sortedDirs.filter(dir => dir !== '').forEach(dir => {
    // Create directory element
    const dirLi = document.createElement('li');
    dirLi.className = 'folder';
    dirLi.textContent = dir;
    rootList.appendChild(dirLi);
    
    // Create list for files in this directory
    const dirFiles = document.createElement('ul');
    dirLi.appendChild(dirFiles);
    
    // Add files to this directory
    dirStructure[dir].forEach(file => {
      const fileLi = document.createElement('li');
      fileLi.className = 'file';
      fileLi.textContent = file.fileName;
      fileLi.title = `Original: ${file.originalPath}\nNew: ${file.newPath}`;
      dirFiles.appendChild(fileLi);
    });
  });
}

// Show message
function showMessage(message, type) {
  messageContainer.innerHTML = message;
  messageContainer.className = `message-container ${type}`;
}