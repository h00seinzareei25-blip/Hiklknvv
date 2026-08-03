/**
 * AI helpers for Nazmyar — Gemini + OpenRouter
 * Sends filenames + optional short content samples (never full files).
 */

const BATCH_SIZE = 18;
const BATCH_SIZE_WITH_CONTENT = 12;

const GEMINI_FALLBACK_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-2.5-flash',
  'gemini-flash-latest',
];

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

function cleanKey(key) {
  return String(key || '')
    .replace(/^\uFEFF/, '')
    .replace(/\s+/g, '')
    .trim();
}

function buildPrompt(files) {
  const hasSamples = files.some((f) => f.contentSample);
  const list = files.map((f, i) => {
    const row = {
      i,
      name: f.name,
      ext: f.ext,
      offlineCategory: f.category || '',
    };
    if (f.contentSample) {
      row.contentSample = f.contentSample;
      row.contentSource = f.contentSource || 'sample';
    }
    return row;
  });

  const contentHint = hasSamples
    ? 'برای بعضی فایل‌ها فیلد contentSample آمده (فقط چند صد کاراکتر اول). از آن برای تشخیص دقیق‌تر نوع سند استفاده کن، ولی اطلاعات حساس را در reason تکرار نکن.'
    : 'فقط بر اساس نام و پسوند فایل کار کن.';

  return `تو دستیار مرتب‌سازی فایل هستی. ${contentHint}
برای هر آیتم سه چیز بده:
1) category: دسته مناسب به فارسی، در صورت نیاز با زیرپوشه مثل «نرم‌افزارها/گرافیک» یا «اسناد/فاکتورها»
2) suggestedName: نام فایل تمیزتر و خواناتر بر اساس محتوا/اسم. پسوند اصلی را حفظ کن. از کاراکترهای غیرمجاز ویندوز استفاده نکن. اگر نام فعلی خوب است همان را برگردان.
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

function formatGeminiError(status, data) {
  const raw = data?.error?.message || data?.error?.status || '';
  const statusName = data?.error?.status || '';
  const lower = `${raw} ${statusName}`.toLowerCase();

  if (status === 403 || statusName === 'PERMISSION_DENIED' || lower.includes('permission')) {
    return [
      'Gemini خطای 403 (دسترسی رد شد) داد.',
      'راه‌حل‌های رایج:',
      '۱) کلید را از https://aistudio.google.com/apikey بساز (نه کلید قدیمی با محدودیت HTTP Referrer).',
      '۲) در Google Cloud → Credentials، محدودیت Application را روی None بگذار یا فقط Generative Language API را مجاز کن.',
      '۳) اگر پروژه «denied access» شده، از OpenRouter استفاده کن یا پروژه/کلید جدید بساز.',
      '۴) اگر از ایران هستی، معمولاً با VPN پایدار باید تست شود.',
      raw ? `جزئیات: ${raw}` : '',
    ].filter(Boolean).join('\n');
  }

  if (status === 400 && lower.includes('api key')) {
    return `کلید Gemini نامعتبر است. یک کلید جدید از AI Studio بگیر.\n${raw}`;
  }

  if (status === 404 || lower.includes('not found') || lower.includes('is not found')) {
    return `مدل Gemini پیدا نشد. مدل را روی gemini-2.0-flash یا gemini-1.5-flash بگذار.\n${raw}`;
  }

  if (status === 429) {
    return `سقف استفاده Gemini پر شده؛ کمی بعد دوباره تلاش کن.\n${raw}`;
  }

  return raw || `خطای Gemini (${status})`;
}

async function geminiRequest({ apiKey, model, body }) {
  const key = cleanKey(apiKey);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': key,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function callGemini({ apiKey, model, prompt }) {
  const preferred = (model || 'gemini-2.0-flash').trim();
  const candidates = [preferred, ...GEMINI_FALLBACK_MODELS.filter((m) => m !== preferred)];
  let lastError = null;

  for (const m of candidates) {
    const { res, data } = await geminiRequest({
      apiKey,
      model: m,
      body: {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      },
    });

    if (res.ok) {
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
      if (!text) throw new Error('Gemini پاسخی برنگرداند (ممکن است فیلتر ایمنی محتوا را خالی کرده باشد).');
      return text;
    }

    const msg = formatGeminiError(res.status, data);
    lastError = new Error(msg);

    // Don't keep trying other models on auth/permission failures
    if (res.status === 401 || res.status === 403) throw lastError;

    // Try next model only for not-found / unsupported model
    const raw = `${data?.error?.message || ''}`.toLowerCase();
    const modelIssue = res.status === 404 || raw.includes('not found') || raw.includes('not supported');
    if (!modelIssue) throw lastError;
  }

  throw lastError || new Error('خطای ناشناخته Gemini');
}

async function openRouterOnce({ apiKey, model, prompt, useJsonFormat }) {
  const body = {
    model,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: 'You are a file organizer. Reply with valid JSON only.',
      },
      { role: 'user', content: prompt },
    ],
  };
  if (useJsonFormat) body.response_format = { type: 'json_object' };

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cleanKey(apiKey)}`,
      'HTTP-Referer': 'https://github.com/h00seinzareei25-blip/Hiklknvv',
      'X-Title': 'Nazmyar',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

function openRouterErrorMessage(status, data) {
  const msg = data?.error?.message || data?.error || `خطای OpenRouter (${status})`;
  return typeof msg === 'string' ? msg : JSON.stringify(msg);
}

async function callOpenRouter({ apiKey, model, prompt, fallbackModels = [] }) {
  const queue = [];
  const pushUnique = (id) => {
    const m = String(id || '').trim();
    if (m && !queue.includes(m)) queue.push(m);
  };
  pushUnique(model);
  for (const m of fallbackModels) pushUnique(m);
  if (!queue.length) pushUnique('openrouter/free');

  let lastError = null;
  for (const m of queue) {
    // First try with json_object; some free models reject it — retry without.
    for (const useJsonFormat of [true, false]) {
      const { res, data } = await openRouterOnce({
        apiKey,
        model: m,
        prompt,
        useJsonFormat,
      });
      if (res.ok) {
        const text = data?.choices?.[0]?.message?.content || '';
        if (text) return text;
        lastError = new Error(`مدل ${m} پاسخ خالی داد`);
        continue;
      }

      const errText = openRouterErrorMessage(res.status, data);
      lastError = new Error(`${m}: ${errText}`);
      const lower = errText.toLowerCase();
      const jsonFormatIssue = useJsonFormat && (
        lower.includes('response_format')
        || lower.includes('json_object')
        || lower.includes('not supported')
      );
      if (jsonFormatIssue) continue; // retry same model without json format
      break; // try next model
    }
  }
  throw lastError || new Error('همه مدل‌های رایگان OpenRouter ناموفق بودند');
}

function resolveOpenRouterModels(settings) {
  const selected = Array.isArray(settings.openrouterFreeSelected)
    ? settings.openrouterFreeSelected.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const primary = String(settings.openrouterModel || '').trim();
  const ordered = [];
  if (primary) ordered.push(primary);
  for (const id of selected) {
    if (!ordered.includes(id)) ordered.push(id);
  }
  return ordered;
}

async function callProvider(settings, prompt) {
  const provider = settings.aiProvider;
  if (provider === 'gemini') {
    if (!cleanKey(settings.geminiKey)) throw new Error('کلید Gemini تنظیم نشده است.');
    return callGemini({
      apiKey: settings.geminiKey,
      model: settings.geminiModel,
      prompt,
    });
  }
  if (provider === 'openrouter') {
    if (!cleanKey(settings.openrouterKey)) throw new Error('کلید OpenRouter تنظیم نشده است.');
    const models = resolveOpenRouterModels(settings);
    return callOpenRouter({
      apiKey: settings.openrouterKey,
      model: models[0],
      fallbackModels: models.slice(1),
      prompt,
    });
  }
  throw new Error('ارائه‌دهنده هوش مصنوعی انتخاب نشده است.');
}

async function testConnection(settings) {
  const provider = settings?.aiProvider;
  if (!provider || provider === 'none') {
    return { ok: false, error: 'اول ارائه‌دهنده را روی Gemini یا OpenRouter بگذار.' };
  }

  try {
    if (provider === 'gemini') {
      const key = cleanKey(settings.geminiKey);
      if (!key) return { ok: false, error: 'کلید Gemini خالی است.' };

      // Lightweight probe: list models (does not need generateContent)
      const listRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=5', {
        headers: { 'x-goog-api-key': key },
      });
      const listData = await listRes.json().catch(() => ({}));
      if (!listRes.ok) {
        return { ok: false, error: formatGeminiError(listRes.status, listData) };
      }

      // Then a tiny generateContent check
      const prompt = 'فقط این JSON را برگردان: {"ok":true}';
      const text = await callGemini({
        apiKey: key,
        model: settings.geminiModel || 'gemini-2.0-flash',
        prompt,
      });
      return {
        ok: true,
        provider: 'gemini',
        detail: `اتصال برقرار شد. نمونه پاسخ: ${String(text).slice(0, 80)}`,
      };
    }

    if (provider === 'openrouter') {
      const key = cleanKey(settings.openrouterKey);
      if (!key) return { ok: false, error: 'کلید OpenRouter خالی است.' };
      const models = resolveOpenRouterModels(settings);
      if (!models.length) return { ok: false, error: 'حداقل یک مدل رایگان را تیک بزن.' };
      const text = await callOpenRouter({
        apiKey: key,
        model: models[0],
        fallbackModels: models.slice(1),
        prompt: 'Return JSON only: {"ok":true}',
      });
      return {
        ok: true,
        provider: 'openrouter',
        detail: `اتصال برقرار شد با ${models[0]}. نمونه: ${String(text).slice(0, 80)}`,
      };
    }

    return { ok: false, error: 'ارائه‌دهنده نامعتبر است.' };
  } catch (err) {
    return { ok: false, error: err.message || 'تست اتصال ناموفق بود' };
  }
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

  const hasContent = files.some((f) => f.contentSample);
  const batchSize = hasContent ? BATCH_SIZE_WITH_CONTENT : BATCH_SIZE;
  const batches = [];
  for (let i = 0; i < files.length; i += batchSize) {
    batches.push(files.slice(i, i + batchSize));
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
  testConnection,
  sanitizeFileName,
  buildPrompt,
  extractJson,
  formatGeminiError,
  cleanKey,
  resolveOpenRouterModels,
};
