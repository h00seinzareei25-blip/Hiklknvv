const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nazmyar', {
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  scanFolder: (folderPath) => ipcRenderer.invoke('scan-folder', folderPath),
  openPath: (targetPath) => ipcRenderer.invoke('open-path', targetPath),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
});
