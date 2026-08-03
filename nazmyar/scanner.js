const fs = require('fs');
const path = require('path');

const EXT_MAP = {
  // تصاویر
  '.jpg': 'تصاویر', '.jpeg': 'تصاویر', '.png': 'تصاویر', '.gif': 'تصاویر',
  '.webp': 'تصاویر', '.bmp': 'تصاویر', '.svg': 'تصاویر', '.heic': 'تصاویر',
  '.tif': 'تصاویر', '.tiff': 'تصاویر', '.ico': 'تصاویر',
  // ویدیو
  '.mp4': 'ویدیوها', '.mkv': 'ویدیوها', '.avi': 'ویدیوها', '.mov': 'ویدیوها',
  '.wmv': 'ویدیوها', '.flv': 'ویدیوها', '.webm': 'ویدیوها', '.m4v': 'ویدیوها',
  // صوت
  '.mp3': 'موسیقی', '.wav': 'موسیقی', '.flac': 'موسیقی', '.aac': 'موسیقی',
  '.ogg': 'موسیقی', '.m4a': 'موسیقی', '.wma': 'موسیقی',
  // اسناد
  '.pdf': 'اسناد', '.doc': 'اسناد', '.docx': 'اسناد', '.xls': 'اسناد',
  '.xlsx': 'اسناد', '.ppt': 'اسناد', '.pptx': 'اسناد', '.txt': 'اسناد',
  '.rtf': 'اسناد', '.odt': 'اسناد', '.csv': 'اسناد',
  // فشرده
  '.zip': 'فشرده‌ها', '.rar': 'فشرده‌ها', '.7z': 'فشرده‌ها', '.tar': 'فشرده‌ها',
  '.gz': 'فشرده‌ها', '.iso': 'فشرده‌ها',
  // کد
  '.js': 'کدها', '.ts': 'کدها', '.py': 'کدها', '.java': 'کدها',
  '.cpp': 'کدها', '.c': 'کدها', '.cs': 'کدها', '.html': 'کدها',
  '.css': 'کدها', '.json': 'کدها', '.xml': 'کدها', '.php': 'کدها',
  // اجرایی
  '.exe': 'نرم‌افزارها', '.msi': 'نرم‌افزارها', '.bat': 'نرم‌افزارها',
  '.cmd': 'نرم‌افزارها', '.apk': 'نرم‌افزارها',
};

const NAME_RULES = [
  { re: /photoshop|illustrator|indesign|lightroom|corel|affinity|figma|blender|gimp|canva/i, cat: 'نرم‌افزارها/گرافیک' },
  { re: /premiere|after\s*effects|davinci|vegas|camtasia|obs/i, cat: 'نرم‌افزارها/ویرایش ویدیو' },
  { re: /autocad|solidworks|revit|sketchup|archicad/i, cat: 'نرم‌افزارها/مهندسی' },
  { re: /office|word|excel|powerpoint|outlook|libreoffice/i, cat: 'نرم‌افزارها/اداری' },
  { re: /screenshot|screen\s*shot|اسکرین|تصوير صفحه|تصویر صفحه/i, cat: 'تصاویر/اسکرین‌شات‌ها' },
  { re: /invoice|فاکتور|فاكتور|receipt|رسید/i, cat: 'اسناد/فاکتورها' },
  { re: /resume|cv|رزومه|cv_/i, cat: 'اسناد/رزومه' },
  { re: /setup|installer|install|نصب/i, cat: 'نرم‌افزارها/نصب‌کننده‌ها' },
  { re: /driver|درایور/i, cat: 'نرم‌افزارها/درایورها' },
  { re: /crack|keygen|patch/i, cat: 'نرم‌افزارها/متفرقه' },
];

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function classify(fileName, ext) {
  for (const rule of NAME_RULES) {
    if (rule.re.test(fileName)) {
      return { category: rule.cat, method: 'name', confidence: 'بالا' };
    }
  }
  if (EXT_MAP[ext]) {
    return { category: EXT_MAP[ext], method: 'ext', confidence: 'متوسط' };
  }
  return { category: 'متفرقه', method: 'none', confidence: 'کم' };
}

async function scanFolder(folderPath) {
  const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.name.startsWith('.') || entry.name.startsWith('~')) continue;

    const fullPath = path.join(folderPath, entry.name);
    let stat;
    try {
      stat = await fs.promises.stat(fullPath);
    } catch {
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    const result = classify(entry.name, ext);

    files.push({
      name: entry.name,
      path: fullPath,
      ext: ext || '(بدون پسوند)',
      size: stat.size,
      sizeLabel: formatSize(stat.size),
      modified: stat.mtime.toISOString(),
      category: result.category,
      method: result.method,
      confidence: result.confidence,
    });
  }

  files.sort((a, b) => a.category.localeCompare(b.category, 'fa') || a.name.localeCompare(b.name, 'fa'));
  return files;
}

module.exports = { scanFolder, classify };
