const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendInputResult: (result) => ipcRenderer.send('input-result', result)
});