const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nazmyar', {
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  scanFolder: (folderPath) => ipcRenderer.invoke('scan-folder', folderPath),
  aiAnalyze: (payload) => ipcRenderer.invoke('ai-analyze', payload),
  aiTest: (settings) => ipcRenderer.invoke('ai-test', settings),
  listFreeOpenRouterModels: () => ipcRenderer.invoke('openrouter-free-models'),
  onAiProgress: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on('ai-progress', handler);
    return () => ipcRenderer.removeListener('ai-progress', handler);
  },
  renameFile: (payload) => ipcRenderer.invoke('rename-file', payload),
  openPath: (targetPath) => ipcRenderer.invoke('open-path', targetPath),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
});
