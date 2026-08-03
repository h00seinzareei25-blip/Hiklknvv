/**
 * Lightweight content sampling for AI — never reads whole large files.
 * Supports plain text, code, HTML/XML, RTF, PDF (best-effort), DOCX.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const MAX_READ_BYTES = 256 * 1024;
const MAX_SNIPPET_CHARS = 450;

const TEXT_EXTS = new Set([
  '.txt', '.md', '.markdown', '.csv', '.tsv', '.json', '.jsonl',
  '.xml', '.html', '.htm', '.css', '.js', '.ts', '.jsx', '.tsx',
  '.py', '.java', '.c', '.cpp', '.h', '.cs', '.php', '.rb', '.go',
  '.rs', '.sql', '.yml', '.yaml', '.toml', '.ini', '.log', '.rtf',
  '.svg', '.bat', '.cmd', '.ps1', '.sh', '.env', '.cfg', '.conf',
]);

function cleanSnippet(text) {
  return String(text || '')
    .replace(/\u0000/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\S\n]{2,}/g, ' ')
    .trim()
    .slice(0, MAX_SNIPPET_CHARS);
}

function looksBinary(buf) {
  const n = Math.min(buf.length, 512);
  let weird = 0;
  for (let i = 0; i < n; i++) {
    const b = buf[i];
    if (b === 0) return true;
    if (b < 7 || (b > 14 && b < 32 && b !== 9 && b !== 10 && b !== 13)) weird += 1;
  }
  return weird / n > 0.3;
}

function decodeBuffer(buf) {
  // UTF-8 BOM
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.slice(3).toString('utf8');
  }
  // UTF-16 LE BOM
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.slice(2).toString('utf16le');
  }
  const asUtf8 = buf.toString('utf8');
  if (!asUtf8.includes('\uFFFD')) return asUtf8;
  return buf.toString('latin1');
}

function stripHtml(text) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"');
}

function stripRtf(text) {
  return text
    .replace(/\{\\.*?\}/g, ' ')
    .replace(/\\[a-z]+\d* ?/gi, ' ')
    .replace(/[{}]/g, ' ');
}

function extractPdfText(buf) {
  const raw = buf.toString('latin1');
  const chunks = [];

  // Literal strings: (....) with basic escape handling
  const litRe = /\((?:\\.|[^\\()])*\)/g;
  let m;
  while ((m = litRe.exec(raw)) && chunks.join(' ').length < MAX_SNIPPET_CHARS * 2) {
    let s = m[0].slice(1, -1)
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\n')
      .replace(/\\t/g, ' ')
      .replace(/\\(.)/g, '$1');
    s = s.replace(/[^\x09\x0A\x0D\x20-\x7E\u0600-\u06FF\u200C\u200D]/g, ' ').trim();
    if (s.length >= 3) chunks.push(s);
  }

  // UTF-16BE hex strings often used for Persian/Unicode: <FEFF...>
  const hexRe = /<((?:FEFF|fffe)?[0-9A-Fa-f]{8,})>/g;
  while ((m = hexRe.exec(raw)) && chunks.join(' ').length < MAX_SNIPPET_CHARS * 2) {
    const hex = m[1];
    if (hex.length % 2 !== 0) continue;
    try {
      const bytes = Buffer.from(hex, 'hex');
      let decoded = '';
      if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
        // UTF-16BE
        for (let i = 2; i + 1 < bytes.length; i += 2) {
          decoded += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
        }
      } else if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
        decoded = bytes.slice(2).toString('utf16le');
      } else if (bytes.length >= 4 && bytes[0] === 0 && bytes[2] === 0) {
        for (let i = 0; i + 1 < bytes.length; i += 2) {
          decoded += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
        }
      }
      decoded = decoded.replace(/[^\x09\x0A\x0D\x20-\x7E\u0600-\u06FF\u200C\u200D]/g, ' ').trim();
      if (decoded.length >= 3) chunks.push(decoded);
    } catch {
      /* ignore bad hex */
    }
  }

  // Fallback: long printable runs
  if (!chunks.length) {
    const runs = raw.match(/[\x20-\x7E\u0600-\u06FF]{5,}/g) || [];
    for (const run of runs.slice(0, 40)) chunks.push(run);
  }

  return cleanSnippet(chunks.join(' '));
}

function findZipLocalFiles(buf) {
  const files = [];
  let offset = 0;
  while (offset + 30 < buf.length) {
    if (buf.readUInt32LE(offset) !== 0x04034b50) break;
    const compression = buf.readUInt16LE(offset + 8);
    const compSize = buf.readUInt32LE(offset + 18);
    const uncompSize = buf.readUInt32LE(offset + 22);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = buf.slice(nameStart, nameStart + nameLen).toString('utf8');
    const dataStart = nameStart + nameLen + extraLen;
    const dataEnd = dataStart + compSize;
    if (dataEnd > buf.length) break;
    files.push({
      name,
      compression,
      compSize,
      uncompSize,
      data: buf.slice(dataStart, dataEnd),
    });
    offset = dataEnd;
  }
  return files;
}

function inflateZipEntry(entry) {
  if (entry.compression === 0) return entry.data;
  if (entry.compression === 8) return zlib.inflateRawSync(entry.data);
  throw new Error(`zip compression ${entry.compression} unsupported`);
}

function extractDocxText(buf) {
  const entries = findZipLocalFiles(buf);
  const doc = entries.find((e) => e.name === 'word/document.xml');
  if (!doc) return '';
  const xml = inflateZipEntry(doc).toString('utf8');
  // Word stores text in <w:t>
  const parts = [];
  const re = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
  let m;
  while ((m = re.exec(xml)) && parts.join(' ').length < MAX_SNIPPET_CHARS * 2) {
    parts.push(m[1]);
  }
  return cleanSnippet(parts.join(' '));
}

async function readHead(filePath) {
  const fh = await fs.promises.open(filePath, 'r');
  try {
    const stat = await fh.stat();
    const size = Math.min(stat.size, MAX_READ_BYTES);
    const buf = Buffer.alloc(size);
    await fh.read(buf, 0, size, 0);
    return buf;
  } finally {
    await fh.close();
  }
}

/**
 * @returns {Promise<{snippet:string, source:string}|null>}
 */
async function sampleFileContent(filePath, ext) {
  const e = (ext || path.extname(filePath) || '').toLowerCase();
  if (!e || e === '(بدون پسوند)') return null;

  try {
    if (e === '.pdf') {
      const buf = await readHead(filePath);
      const snippet = extractPdfText(buf);
      return snippet ? { snippet, source: 'pdf' } : null;
    }

    if (e === '.docx') {
      const buf = await readHead(filePath);
      const snippet = extractDocxText(buf);
      return snippet ? { snippet, source: 'docx' } : null;
    }

    if (e === '.rtf') {
      const buf = await readHead(filePath);
      if (looksBinary(buf)) return null;
      const snippet = cleanSnippet(stripRtf(decodeBuffer(buf)));
      return snippet ? { snippet, source: 'rtf' } : null;
    }

    if (e === '.html' || e === '.htm' || e === '.xml' || e === '.svg') {
      const buf = await readHead(filePath);
      if (looksBinary(buf)) return null;
      const snippet = cleanSnippet(stripHtml(decodeBuffer(buf)));
      return snippet ? { snippet, source: e.slice(1) } : null;
    }

    if (TEXT_EXTS.has(e)) {
      const buf = await readHead(filePath);
      if (looksBinary(buf)) return null;
      const snippet = cleanSnippet(decodeBuffer(buf));
      return snippet ? { snippet, source: 'text' } : null;
    }
  } catch {
    return null;
  }

  return null;
}

async function attachContentSamples(files, { enabled = true, onProgress } = {}) {
  if (!enabled || !files?.length) {
    return files.map((f) => ({ ...f, contentSample: '', contentSource: '' }));
  }

  const out = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    let sample = null;
    if (f.path && fs.existsSync(f.path)) {
      sample = await sampleFileContent(f.path, f.ext);
    }
    out.push({
      ...f,
      contentSample: sample?.snippet || '',
      contentSource: sample?.source || '',
    });
    if (typeof onProgress === 'function' && (i % 8 === 0 || i === files.length - 1)) {
      onProgress({ done: i + 1, total: files.length });
    }
  }
  return out;
}

module.exports = {
  sampleFileContent,
  attachContentSamples,
  cleanSnippet,
  MAX_SNIPPET_CHARS,
};
