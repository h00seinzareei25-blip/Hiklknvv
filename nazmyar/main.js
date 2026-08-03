const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { scanFolder } = require('./scanner');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 920,
    minHeight: 640,
    backgroundColor: '#0c1219',
    title: 'نظم‌یار',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('pick-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'انتخاب پوشه برای مرتب‌سازی',
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

ipcMain.handle('scan-folder', async (_event, folderPath) => {
  if (!folderPath || !fs.existsSync(folderPath)) {
    return { ok: false, error: 'پوشه یافت نشد.' };
  }
  try {
    const files = await scanFolder(folderPath);
    return { ok: true, folderPath, files, count: files.length };
  } catch (err) {
    return { ok: false, error: err.message || 'خطا در اسکن پوشه' };
  }
});

ipcMain.handle('open-path', async (_event, targetPath) => {
  if (targetPath && fs.existsSync(targetPath)) {
    await shell.openPath(targetPath);
  }
});

ipcMain.handle('get-app-info', () => ({
  version: app.getVersion(),
  name: 'نظم‌یار',
  stage: 'نسخه ۰٫۱ — ظاهر و اسکن پایه',
}));
