const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { scanFolder } = require('./scanner');
const { analyzeFiles, sanitizeFileName, testConnection } = require('./ai');
const { listFreeOpenRouterModels } = require('./openrouterFree');
const { attachContentSamples } = require('./contentSampler');
const { organizeFiles, undoOrganize } = require('./organizer');

let mainWindow;
let lastOrganizeLog = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1220,
    height: 780,
    minWidth: 960,
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

ipcMain.handle('pick-folder', async (_event, title) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: title || 'انتخاب پوشه',
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

ipcMain.handle('ai-test', async (_event, settings) => {
  try {
    return await testConnection(settings || {});
  } catch (err) {
    return { ok: false, error: err.message || 'تست اتصال ناموفق بود' };
  }
});

ipcMain.handle('openrouter-free-models', async () => {
  try {
    return await listFreeOpenRouterModels();
  } catch (err) {
    return { ok: false, error: err.message || 'خطا در دریافت مدل‌های رایگان' };
  }
});

ipcMain.handle('ai-analyze', async (event, payload) => {
  const files = payload?.files || [];
  const settings = payload?.settings || {};
  if (!files.length) return { ok: false, error: 'فایلی برای تحلیل نیست.' };

  try {
    const useSamples = settings.includeContentSample !== false;
    event.sender.send('ai-progress', {
      done: 0,
      total: files.length,
      batchIndex: 0,
      batchCount: 0,
      phase: 'sample',
    });

    const enriched = await attachContentSamples(files, {
      enabled: useSamples,
      onProgress: (p) => {
        event.sender.send('ai-progress', {
          done: p.done,
          total: p.total,
          batchIndex: 0,
          batchCount: 0,
          phase: 'sample',
        });
      },
    });

    const sampledCount = enriched.filter((f) => f.contentSample).length;
    const results = await analyzeFiles(enriched, settings, (progress) => {
      event.sender.send('ai-progress', { ...progress, phase: progress.phase || 'ai' });
    });
    return {
      ok: true,
      results,
      provider: settings.aiProvider,
      count: results.length,
      sampledCount,
    };
  } catch (err) {
    return { ok: false, error: err.message || 'خطا در تحلیل هوش مصنوعی' };
  }
});

ipcMain.handle('rename-file', async (_event, { filePath, newName }) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { ok: false, error: 'فایل یافت نشد.' };
    }
    const dir = path.dirname(filePath);
    const oldName = path.basename(filePath);
    const ext = path.extname(oldName);
    const safe = sanitizeFileName(newName, ext);
    if (!safe) return { ok: false, error: 'نام پیشنهادی نامعتبر است.' };
    if (safe === oldName) return { ok: true, path: filePath, name: oldName, skipped: true };

    let target = path.join(dir, safe);
    if (fs.existsSync(target)) {
      const base = safe.slice(0, safe.length - ext.length);
      let n = 2;
      while (fs.existsSync(target)) {
        target = path.join(dir, `${base} (${n})${ext}`);
        n += 1;
      }
    }

    await fs.promises.rename(filePath, target);
    return { ok: true, path: target, name: path.basename(target) };
  } catch (err) {
    return { ok: false, error: err.message || 'خطا در تغییر نام' };
  }
});

ipcMain.handle('organize-files', async (event, payload) => {
  const items = payload?.items || [];
  const options = payload?.options || {};
  if (!items.length) return { ok: false, error: 'موردی برای جابه‌جایی نیست.' };

  try {
    const result = await organizeFiles(items, options, (progress) => {
      event.sender.send('organize-progress', progress);
    });
    lastOrganizeLog = {
      ...result,
      sourceFolder: options.sourceFolder || null,
    };
    return { ...result, canUndo: result.moved > 0 };
  } catch (err) {
    return { ok: false, error: err.message || 'خطا در مرتب‌سازی' };
  }
});

ipcMain.handle('undo-organize', async () => {
  if (!lastOrganizeLog) {
    return { ok: false, error: 'عملیات قابل برگشتی وجود ندارد.' };
  }
  try {
    const result = await undoOrganize(lastOrganizeLog);
    if (result.ok) lastOrganizeLog = null;
    return result;
  } catch (err) {
    return { ok: false, error: err.message || 'خطا در برگشت' };
  }
});

ipcMain.handle('can-undo-organize', () => ({
  ok: true,
  canUndo: !!(lastOrganizeLog && lastOrganizeLog.moved > 0),
  moved: lastOrganizeLog?.moved || 0,
}));

ipcMain.handle('open-path', async (_event, targetPath) => {
  if (targetPath && fs.existsSync(targetPath)) {
    await shell.openPath(targetPath);
  }
});

ipcMain.handle('get-app-info', () => ({
  version: app.getVersion(),
  name: 'نظم‌یار',
  stage: 'نسخه ۰٫۳ — جابه‌جایی به پوشه دسته',
}));
