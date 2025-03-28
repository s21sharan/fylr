const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  analyzeDirectory: (data) => ipcRenderer.invoke('analyze-directory', data),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  validateDirectory: (path) => ipcRenderer.invoke('validate-directory', path),
  applyChanges: (data) => ipcRenderer.invoke('apply-changes', data)
}); 