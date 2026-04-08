const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ---- File Picker Dialogs ----
  pickAudioFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
  pickFiles: (options) => ipcRenderer.invoke('dialog:openFiles', options),
  pickFolder: (options) => ipcRenderer.invoke('dialog:openFolder', options),
  saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  
  // ---- File System ----
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  statFile: (filePath) => ipcRenderer.invoke('fs:stat', filePath),
  
  // ---- Shell ----
  showInFolder: (filePath) => ipcRenderer.invoke('shell:showItemInFolder', filePath),
  openPath: (targetPath) => ipcRenderer.invoke('shell:openPath', targetPath),
  
  // ---- App Info ----
  getAppPath: (name) => ipcRenderer.invoke('app:getPath', name),
  getUserDataDir: () => ipcRenderer.invoke('app:getUserDataDir'),
  
  // ---- Detect if running in Electron ----
  isElectron: true
});
