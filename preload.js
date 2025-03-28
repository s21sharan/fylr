const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electronAPI', {
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    sendChatQuery: (data) => ipcRenderer.invoke('send-chat-query', data)
    // Add any other methods you need to expose
  }
); 