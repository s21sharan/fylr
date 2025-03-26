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
const addDirBtn = document.getElementById('addDirBtn');
const expandAllBtn = document.getElementById('expandAllBtn');
const collapseAllBtn = document.getElementById('collapseAllBtn');
const resetBtn = document.getElementById('resetBtn');

// Store file structure data
let fileStructureData = null;

// Add at the beginning of the file
const DEBUG = true;

// Store the original file structure for reset functionality
let originalFileStructure = null;
// Track the current, potentially modified structure
let currentStructure = { files: [] };

// Create modal for adding directories
const modal = document.createElement('div');
modal.className = 'modal';
modal.innerHTML = `
  <div class="modal-content">
    <h3>Add New Directory</h3>
    <input type="text" id="newDirName" placeholder="Enter directory name">
    <div class="modal-buttons">
      <button id="cancelAddDir">Cancel</button>
      <button id="confirmAddDir">Add</button>
    </div>
  </div>
`;
document.body.appendChild(modal);

const newDirNameInput = document.getElementById('newDirName');
const cancelAddDirBtn = document.getElementById('cancelAddDir');
const confirmAddDirBtn = document.getElementById('confirmAddDir');

function debugLog(message, data) {
  if (DEBUG) {
    if (data) {
      console.log(`[DEBUG] ${message}`, data);
    } else {
      console.log(`[DEBUG] ${message}`);
    }
  }
}

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
  
  debugLog(`Starting analysis for directory: ${directoryPath}`);
  
  // Show loader
  loader.style.display = 'flex';
  resultsContainer.style.display = 'none';
  messageContainer.innerHTML = '';
  
  try {
    // Call backend to analyze directory
    debugLog("Calling IPC to analyze directory");
    
    const startTime = performance.now();
    fileStructureData = await ipcRenderer.invoke('analyze-directory', directoryPath);
    const endTime = performance.now();
    
    debugLog(`Analysis completed in ${(endTime - startTime) / 1000} seconds`);
    debugLog("File structure data received:", fileStructureData);
    
    // Build the file tree visualization
    debugLog("Building file tree visualization");
    buildFileTree(fileStructureData);
    
    // Hide loader and show results
    loader.style.display = 'none';
    resultsContainer.style.display = 'block';
    debugLog("UI updated to show results");
  } catch (error) {
    debugLog("Error during analysis:", error);
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
    // Call backend to apply changes with current structure
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

// Build file tree visualization with drag-and-drop support
function buildFileTree(data) {
  // Store original data for reset
  originalFileStructure = JSON.parse(JSON.stringify(data));
  currentStructure = JSON.parse(JSON.stringify(data));
  
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
  rootElement.className = 'folder open';
  rootElement.setAttribute('data-dir', 'ROOT');
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
      
      // Set the data-type attribute based on file extension
      const isImage = /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(file.fileName);
      const isPdf = file.fileName.toLowerCase().endsWith('.pdf');
      li.setAttribute('data-type', isImage ? 'image' : (isPdf ? 'document' : 'other'));
      
      // Remove the file icon span since we're using CSS ::before
      li.textContent = file.fileName;
      
      li.title = `Original: ${file.originalPath}\nNew: ${file.newPath}`;
      li.setAttribute('data-src', file.originalPath);
      li.setAttribute('data-dst', file.newPath);
      li.setAttribute('data-filename', file.fileName);
      li.setAttribute('draggable', 'true');
      rootList.appendChild(li);
    });
  }
  
  // Add directories and their files
  sortedDirs.filter(dir => dir !== '').forEach(dir => {
    // Create directory element
    const dirLi = document.createElement('li');
    dirLi.className = 'folder open';
    
    // Use span for the text to prevent interference with the action buttons
    dirLi.innerHTML = `<span class="folder-name">${dir}</span>`;
    dirLi.setAttribute('data-dir', dir);
    
    // Add folder actions with stopPropagation
    const folderActions = document.createElement('span');
    folderActions.className = 'folder-actions';
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-dir';
    removeBtn.innerHTML = '×';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeDirectory(dirLi);
    });
    folderActions.appendChild(removeBtn);
    dirLi.appendChild(folderActions);
    
    rootList.appendChild(dirLi);
    
    // Create list for files in this directory
    const dirFiles = document.createElement('ul');
    dirLi.appendChild(dirFiles);
    
    // Add files to this directory
    dirStructure[dir].forEach(file => {
      const fileLi = document.createElement('li');
      fileLi.className = 'file';
      
      // Set the data-type attribute based on file extension
      const isImage = /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(file.fileName);
      const isPdf = file.fileName.toLowerCase().endsWith('.pdf');
      fileLi.setAttribute('data-type', isImage ? 'image' : (isPdf ? 'document' : 'other'));
      
      // Remove the file icon span since we're using CSS ::before
      fileLi.textContent = file.fileName;
      
      fileLi.title = `Original: ${file.originalPath}\nNew: ${file.newPath}`;
      fileLi.setAttribute('data-src', file.originalPath);
      fileLi.setAttribute('data-dst', file.newPath);
      fileLi.setAttribute('data-filename', file.fileName);
      fileLi.setAttribute('draggable', 'true');
      dirFiles.appendChild(fileLi);
    });
  });
  
  // Setup drag and drop
  setupDragAndDrop();
  
  // Add event listeners for folders
  document.querySelectorAll('.folder').forEach(folder => {
    folder.addEventListener('click', (e) => {
      // Don't toggle if clicking on action buttons
      if (e.target.closest('.folder-actions')) return;
      
      // Toggle folder
      folder.classList.toggle('open');
      const filesList = folder.querySelector('ul');
      if (filesList) {
        filesList.style.display = folder.classList.contains('open') ? 'block' : 'none';
      }
    });
  });
}

// Expand all folders
expandAllBtn.addEventListener('click', () => {
  document.querySelectorAll('.folder').forEach(folder => {
    folder.classList.add('open');
    const filesList = folder.querySelector('ul');
    if (filesList) {
      filesList.style.display = 'block';
    }
  });
});

// Collapse all folders
collapseAllBtn.addEventListener('click', () => {
  document.querySelectorAll('.folder').forEach(folder => {
    if (folder.getAttribute('data-dir') !== 'ROOT') {
      folder.classList.remove('open');
      const filesList = folder.querySelector('ul');
      if (filesList) {
        filesList.style.display = 'none';
      }
    }
  });
});

// Reset to original structure
resetBtn.addEventListener('click', () => {
  if (confirm('Reset to the original suggested file structure?')) {
    buildFileTree(originalFileStructure);
  }
});

// Setup drag and drop functionality
function setupDragAndDrop() {
  const draggableItems = document.querySelectorAll('.file[draggable="true"]');
  const dropTargets = document.querySelectorAll('.folder');
  
  let draggedItem = null;
  
  // Add event listeners for draggable items
  draggableItems.forEach(item => {
    item.addEventListener('dragstart', function() {
      draggedItem = this;
      setTimeout(() => this.classList.add('dragging'), 0);
    });
    
    item.addEventListener('dragend', function() {
      draggedItem = null;
      this.classList.remove('dragging');
      document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
    });
  });
  
  // Add event listeners for drop targets
  dropTargets.forEach(target => {
    target.addEventListener('dragover', function(e) {
      e.preventDefault();
      if (!this.classList.contains('drop-target')) {
        this.classList.add('drop-target');
      }
    });
    
    target.addEventListener('dragleave', function(e) {
      // Only remove the class if we're not hovering over any child element
      if (!this.contains(e.relatedTarget)) {
        this.classList.remove('drop-target');
      }
    });
    
    target.addEventListener('drop', function(e) {
      e.preventDefault();
      if (!draggedItem) return;
      
      const targetDir = this.getAttribute('data-dir');
      const targetList = this === fileTree.firstChild 
        ? fileTree.querySelector('ul') 
        : this.querySelector('ul');
      
      // Move the item in the DOM
      targetList.appendChild(draggedItem);
      
      // Add a subtle highlight instead of dark blue
      draggedItem.style.backgroundColor = '#f0f7ff';
      setTimeout(() => {
        draggedItem.style.backgroundColor = '';
      }, 800);
      
      // Update the path
      updateFilePathAfterDrag(draggedItem, targetDir);
      
      // Update file structure data
      updateFileStructure();
      
      this.classList.remove('drop-target');
    });
  });
}

// Update file path after dragging to a new directory
function updateFilePathAfterDrag(fileElement, newDir) {
  const fileName = fileElement.getAttribute('data-filename') || fileElement.textContent.trim();
  const srcPath = fileElement.getAttribute('data-src');
  let newPath;
  
  if (newDir === 'ROOT') {
    newPath = fileName;
  } else {
    newPath = `${newDir}/${fileName}`;
  }
  
  fileElement.setAttribute('data-dst', newPath);
  fileElement.title = `Original: ${srcPath}\nNew: ${newPath}`;
}

// Update the file structure based on current UI
function updateFileStructure() {
  const updatedFiles = [];
  
  // Get all files
  document.querySelectorAll('.file').forEach(file => {
    const srcPath = file.getAttribute('data-src');
    const dstPath = file.getAttribute('data-dst');
    
    updatedFiles.push({
      src_path: srcPath,
      dst_path: dstPath
    });
  });
  
  // Update current structure
  currentStructure = { files: updatedFiles };
  fileStructureData = currentStructure;
  
  debugLog("Updated file structure:", currentStructure);
}

// Show message
function showMessage(message, type) {
  messageContainer.innerHTML = message;
  messageContainer.className = `message-container ${type}`;
}

// Show modal for adding directory
addDirBtn.addEventListener('click', () => {
  newDirNameInput.value = '';
  modal.style.display = 'block';
});

// Hide modal
cancelAddDirBtn.addEventListener('click', () => {
  modal.style.display = 'none';
});

// Add new directory
confirmAddDirBtn.addEventListener('click', () => {
  const dirName = newDirNameInput.value.trim();
  if (dirName) {
    // Add the new directory to the structure
    addNewDirectory(dirName);
    modal.style.display = 'none';
  }
});

// Handle clicks outside the modal to close it
window.addEventListener('click', (event) => {
  if (event.target === modal) {
    modal.style.display = 'none';
  }
});

// Add a new directory to the structure
function addNewDirectory(dirName) {
  // Update UI
  const rootList = fileTree.querySelector('ul');
  const dirLi = document.createElement('li');
  dirLi.className = 'folder';
  dirLi.innerHTML = `<span class="folder-name">${dirName}</span>`;
  dirLi.setAttribute('data-dir', dirName);
  
  // Add folder actions with stopPropagation
  const folderActions = document.createElement('span');
  folderActions.className = 'folder-actions';
  const removeBtn = document.createElement('button');
  removeBtn.className = 'remove-dir';
  removeBtn.innerHTML = '×';
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removeDirectory(dirLi);
  });
  folderActions.appendChild(removeBtn);
  dirLi.appendChild(folderActions);
  
  // Add the directory's file list
  const dirFiles = document.createElement('ul');
  dirLi.appendChild(dirFiles);
  rootList.appendChild(dirLi);
  
  // Setup drag and drop for the new directory
  setupDragAndDrop();
  
  // Add event listener for folder expansion/collapse
  dirLi.addEventListener('click', (e) => {
    if (e.target.closest('.folder-actions')) return;
    
    dirLi.classList.toggle('open');
    const filesList = dirLi.querySelector('ul');
    if (filesList) {
      filesList.style.display = dirLi.classList.contains('open') ? 'block' : 'none';
    }
  });
}

// Remove a directory
function removeDirectory(dirElement) {
  // Highlight the directory being removed
  dirElement.style.backgroundColor = '#ffebee';
  dirElement.style.borderColor = '#ffcdd2';
  
  // Check if directory has files
  const filesList = dirElement.querySelector('ul');
  const files = filesList ? filesList.querySelectorAll('li.file') : [];
  
  if (files.length > 0) {
    if (!confirm(`Directory "${dirElement.getAttribute('data-dir')}" contains ${files.length} files. Move them to the root directory?`)) {
      // Reset the highlighting if cancelled
      dirElement.style.backgroundColor = '';
      dirElement.style.borderColor = '';
      return;
    }
    
    // Move files to root
    const rootList = fileTree.querySelector('ul');
    
    // Animate files being moved to root
    files.forEach(file => {
      const clone = file.cloneNode(true);
      rootList.appendChild(clone);
      
      // Add animation to highlight the moved files
      clone.style.backgroundColor = '#e8f5e9';
      setTimeout(() => {
        clone.style.backgroundColor = '';
      }, 1000);
      
      updateFilePathAfterDrag(clone, 'ROOT');
    });
  }
  
  // Add a quick fade-out animation
  dirElement.style.transition = 'opacity 0.3s, transform 0.3s';
  dirElement.style.opacity = '0';
  dirElement.style.transform = 'translateX(20px)';
  
  // Remove the directory from the UI after animation
  setTimeout(() => {
    dirElement.remove();
    // Update the data structure
    updateFileStructure();
  }, 300);
}

// Remove or simplify the getFileIcon function since it's no longer needed
function getFileIcon(fileName) {
  return ''; // Return empty string since we're using CSS for icons
}