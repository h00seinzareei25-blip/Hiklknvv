/**
 * Move files into category folders with safe conflict handling + undo log.
 */

const fs = require('fs');
const path = require('path');
const { sanitizeFileName } = require('./ai');

function sanitizeSegment(segment) {
  return String(segment || '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .slice(0, 80);
}

function categoryToSegments(category) {
  return String(category || 'متفرقه')
    .split(/[/\\]+/)
    .map(sanitizeSegment)
    .filter(Boolean);
}

function uniqueTargetPath(dir, fileName) {
  let target = path.join(dir, fileName);
  if (!fs.existsSync(target)) return target;

  const ext = path.extname(fileName);
  const base = ext ? fileName.slice(0, -ext.length) : fileName;
  let n = 2;
  while (fs.existsSync(target)) {
    target = path.join(dir, `${base} (${n})${ext}`);
    n += 1;
  }
  return target;
}

function resolveOrganizeRoot({ mode, sourceFolder, fixedRoot }) {
  if (mode === 'fixed') {
    const root = String(fixedRoot || '').trim();
    if (!root) throw new Error('مسیر ثابت مقصد تنظیم نشده است.');
    return root;
  }
  const root = String(sourceFolder || '').trim();
  if (!root) throw new Error('پوشه مبدأ مشخص نیست.');
  return root;
}

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

/**
 * items: [{ id, path, name, category, suggestedName? }]
 * options: { mode: 'same'|'fixed', sourceFolder, fixedRoot, applySuggestedName }
 */
async function organizeFiles(items, options = {}, onProgress) {
  const root = resolveOrganizeRoot(options);
  const applyName = options.applySuggestedName !== false;
  const moves = [];
  const errors = [];
  let moved = 0;
  let skipped = 0;

  await ensureDir(root);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      if (!item?.path || !fs.existsSync(item.path)) {
        errors.push({ id: item?.id, error: 'فایل یافت نشد', path: item?.path });
        continue;
      }

      const segments = categoryToSegments(item.category);
      const destDir = path.join(root, ...segments);
      await ensureDir(destDir);

      const currentName = path.basename(item.path);
      const ext = path.extname(currentName);
      let finalName = currentName;
      if (applyName && item.suggestedName && item.suggestedName !== currentName) {
        finalName = sanitizeFileName(item.suggestedName, ext) || currentName;
      }

      let targetPath = path.join(destDir, finalName);
      // already in place
      if (path.resolve(item.path) === path.resolve(targetPath)) {
        skipped += 1;
        moves.push({
          id: item.id,
          from: item.path,
          to: targetPath,
          skipped: true,
          category: segments.join('/'),
        });
      } else {
        if (fs.existsSync(targetPath)) {
          targetPath = uniqueTargetPath(destDir, finalName);
        }
        await fs.promises.rename(item.path, targetPath);
        moved += 1;
        moves.push({
          id: item.id,
          from: item.path,
          to: targetPath,
          skipped: false,
          category: segments.join('/'),
          name: path.basename(targetPath),
        });
      }
    } catch (err) {
      errors.push({
        id: item?.id,
        path: item?.path,
        error: err.message || 'خطا در جابه‌جایی',
      });
    }

    if (typeof onProgress === 'function') {
      onProgress({ done: i + 1, total: items.length, moved, skipped, errors: errors.length });
    }
  }

  return {
    ok: true,
    root,
    mode: options.mode || 'same',
    moved,
    skipped,
    failed: errors.length,
    moves,
    errors,
    createdAt: new Date().toISOString(),
  };
}

async function undoOrganize(log) {
  if (!log?.moves?.length) {
    return { ok: false, error: 'لاگ برگشت موجود نیست.' };
  }

  let restored = 0;
  let failed = 0;
  const errors = [];

  // reverse order helps with nested conflicts a bit
  const list = [...log.moves].reverse();
  for (const move of list) {
    if (move.skipped || !move.from || !move.to) continue;
    try {
      if (!fs.existsSync(move.to)) {
        errors.push({ to: move.to, error: 'فایل مقصد دیگر وجود ندارد' });
        failed += 1;
        continue;
      }
      const backDir = path.dirname(move.from);
      await ensureDir(backDir);
      let backPath = move.from;
      if (fs.existsSync(backPath)) {
        backPath = uniqueTargetPath(backDir, path.basename(move.from));
      }
      await fs.promises.rename(move.to, backPath);
      restored += 1;
    } catch (err) {
      failed += 1;
      errors.push({ to: move.to, error: err.message || 'خطا در برگشت' });
    }
  }

  return { ok: true, restored, failed, errors };
}

module.exports = {
  organizeFiles,
  undoOrganize,
  categoryToSegments,
  resolveOrganizeRoot,
  uniqueTargetPath,
};
