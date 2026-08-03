/**
 * AI helpers for Nazmyar — Gemini + OpenRouter
 * Only filenames/metadata are sent; never file contents.
 */

const BATCH_SIZE = 25;

function sanitizeFileName(name, originalExt) {
  if (!name || typeof name !== 'string') return null;
  let cleaned = name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .slice(0, 180);

  if (!cleaned) return null;

  const ext = (originalExt || '').toLowerCase();
  if (ext && ext !== '(بدون پسوند)') {
    const hasExt = cleaned.toLowerCase().endsWith(ext);
    if (!hasExt) cleaned += ext;
  }
  return cleaned;
}

function buildPrompt(files) {
  const list = files.map((f, i) => ({
    i,
    name: f.name,
    ext: f.ext,
    offlineCategory: f.category || '',
  }));

  return `تو دستیار مرتب‌سازی فایل هستی. فقط بر اساس نام فایل (بدون محتوا) کار کن.
برای هر آیتم دو چیز بده:
1) category: دسته مناسب به فارسی، در صورت نیاز با زیرپوشه مثل «نرم‌افزارها/گرافیک» یا «اسناد/فاکتورها»
2) suggestedName: نام فایل تمیزتر و خواناتر. پسوند اصلی را حفظ کن. از کاراکترهای غیرمجاز ویندوز استفاده نکن. اگر نام فعلی خوب است همان را برگردان.
3) reason: یک جمله کوتاه فارسی درباره دلیل دسته/نام

فقط JSON خالص برگردان (بدون markdown)، به این شکل:
{"items":[{"i":0,"category":"...","suggestedName":"...","reason":"..."}]}

فایل‌ها:
${JSON.stringify(list, null, 0)}`;
}

function extractJson(text) {
  if (!text) throw new Error('پاسخ خالی از هوش مصنوعی');
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('پاسخ هوش مصنوعی قابل خواندن نبود');
  }
}

async function callGemini({ apiKey, model, prompt }) {
  const m = model || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `خطای Gemini (${res.status})`;
    throw new Error(msg);
  }
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  return text;
}

async function callOpenRouter({ apiKey, model, prompt }) {
  const m = model || 'openai/gpt-4o-mini';
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/h00seinzareei25-blip/Hiklknvv',
      'X-Title': 'Nazmyar',
    },
    body: JSON.stringify({
      model: m,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a file organizer. Reply with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || data?.error || `خطای OpenRouter (${res.status})`;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return data?.choices?.[0]?.message?.content || '';
}

async function callProvider(settings, prompt) {
  const provider = settings.aiProvider;
  if (provider === 'gemini') {
    if (!settings.geminiKey) throw new Error('کلید Gemini تنظیم نشده است.');
    return callGemini({
      apiKey: settings.geminiKey,
      model: settings.geminiModel,
      prompt,
    });
  }
  if (provider === 'openrouter') {
    if (!settings.openrouterKey) throw new Error('کلید OpenRouter تنظیم نشده است.');
    return callOpenRouter({
      apiKey: settings.openrouterKey,
      model: settings.openrouterModel,
      prompt,
    });
  }
  throw new Error('ارائه‌دهنده هوش مصنوعی انتخاب نشده است.');
}

function mapBatchResults(batch, parsed) {
  const items = Array.isArray(parsed?.items) ? parsed.items : [];
  const byIndex = new Map();
  for (const item of items) {
    if (item && typeof item.i === 'number') byIndex.set(item.i, item);
  }

  return batch.map((file, i) => {
    const hit = byIndex.get(i) || {};
    const category = (hit.category || file.category || 'متفرقه').toString().trim().slice(0, 80);
    const suggestedName = sanitizeFileName(hit.suggestedName || file.name, file.ext) || file.name;
    return {
      id: file.id,
      category,
      suggestedName,
      reason: (hit.reason || '').toString().trim().slice(0, 160),
      method: 'ai',
      confidence: 'بالا',
    };
  });
}

/**
 * Analyze files in batches. onProgress({done, total, batchIndex, batchCount})
 */
async function analyzeFiles(files, settings, onProgress) {
  if (!files?.length) return [];
  if (!settings || settings.aiProvider === 'none') {
    throw new Error('هوش مصنوعی در تنظیمات خاموش است.');
  }

  const batches = [];
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    batches.push(files.slice(i, i + BATCH_SIZE));
  }

  const results = [];
  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const prompt = buildPrompt(batch);
    const raw = await callProvider(settings, prompt);
    const parsed = extractJson(raw);
    results.push(...mapBatchResults(batch, parsed));
    if (typeof onProgress === 'function') {
      onProgress({
        done: results.length,
        total: files.length,
        batchIndex: b + 1,
        batchCount: batches.length,
      });
    }
  }
  return results;
}

module.exports = {
  analyzeFiles,
  sanitizeFileName,
  buildPrompt,
  extractJson,
};
