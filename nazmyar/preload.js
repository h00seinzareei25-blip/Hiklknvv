const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nazmyar', {
  pickFolder: (title) => ipcRenderer.invoke('pick-folder', title),
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
  organizeFiles: (payload) => ipcRenderer.invoke('organize-files', payload),
  undoOrganize: () => ipcRenderer.invoke('undo-organize'),
  canUndoOrganize: () => ipcRenderer.invoke('can-undo-organize'),
  onOrganizeProgress: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on('organize-progress', handler);
    return () => ipcRenderer.removeListener('organize-progress', handler);
  },
  openPath: (targetPath) => ipcRenderer.invoke('open-path', targetPath),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
});
