/**
 * Free OpenRouter models — live fetch + offline fallback.
 * Only models with ":free" suffix (plus openrouter/free router).
 */

const FALLBACK_FREE_MODELS = [
  { id: 'openrouter/free', name: 'Free Models Router', context: 200000 },
  { id: 'openai/gpt-oss-20b:free', name: 'OpenAI: gpt-oss-20b (free)', context: 131072 },
  { id: 'google/gemma-4-26b-a4b-it:free', name: 'Google: Gemma 4 26B A4B (free)', context: 262144 },
  { id: 'google/gemma-4-31b-it:free', name: 'Google: Gemma 4 31B (free)', context: 262144 },
  { id: 'nvidia/nemotron-nano-9b-v2:free', name: 'NVIDIA: Nemotron Nano 9B V2 (free)', context: 128000 },
  { id: 'nvidia/nemotron-3-nano-30b-a3b:free', name: 'NVIDIA: Nemotron 3 Nano 30B (free)', context: 256000 },
  { id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', name: 'NVIDIA: Nemotron 3 Nano Omni (free)', context: 256000 },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'NVIDIA: Nemotron 3 Super (free)', context: 262144 },
  { id: 'nvidia/nemotron-nano-12b-v2-vl:free', name: 'NVIDIA: Nemotron Nano 12B VL (free)', context: 128000 },
  { id: 'inclusionai/ling-3.0-flash:free', name: 'Ling-3.0-flash (free)', context: 262144 },
  { id: 'poolside/laguna-xs-2.1:free', name: 'Poolside: Laguna XS 2.1 (free)', context: 262144 },
  { id: 'poolside/laguna-s-2.1:free', name: 'Poolside: Laguna S 2.1 (free)', context: 262144 },
  { id: 'cohere/north-mini-code:free', name: 'Cohere: North Mini Code (free)', context: 256000 },
];

function isFreeChatModel(model) {
  const id = model?.id || '';
  if (!id) return false;
  if (id.includes('lyria')) return false;
  if (!(id.endsWith(':free') || id === 'openrouter/free')) return false;

  const outs = model.architecture?.output_modalities;
  if (Array.isArray(outs) && outs.length && !outs.includes('text')) return false;

  const modality = String(model.architecture?.modality || '').toLowerCase();
  if (modality.includes('audio') && !modality.includes('text')) return false;

  // Not useful for file naming/classify
  if (id.includes('content-safety')) return false;
  if (id.includes('ultra-550b')) return false; // huge / often unavailable on free tier

  return true;
}

function normalizeModel(model) {
  return {
    id: model.id,
    name: (model.name || model.id).replace(/\s+/g, ' ').trim(),
    context: model.context_length || model.context || null,
  };
}

async function fetchFreeOpenRouterModels() {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      Accept: 'application/json',
      'HTTP-Referer': 'https://github.com/h00seinzareei25-blip/Hiklknvv',
      'X-Title': 'Nazmyar',
    },
  });
  if (!res.ok) {
    throw new Error(`دریافت لیست مدل‌ها ناموفق بود (${res.status})`);
  }
  const data = await res.json();
  const list = (data.data || [])
    .filter(isFreeChatModel)
    .map(normalizeModel)
    .sort((a, b) => {
      if (a.id === 'openrouter/free') return -1;
      if (b.id === 'openrouter/free') return 1;
      return a.name.localeCompare(b.name, 'en');
    });

  if (!list.length) throw new Error('هیچ مدل رایگانی پیدا نشد');
  return list;
}

async function listFreeOpenRouterModels() {
  try {
    const live = await fetchFreeOpenRouterModels();
    return { ok: true, source: 'live', models: live };
  } catch (err) {
    return {
      ok: true,
      source: 'fallback',
      models: FALLBACK_FREE_MODELS,
      warning: err.message || 'لیست آنلاین در دسترس نبود؛ از لیست ذخیره‌شده استفاده شد.',
    };
  }
}

module.exports = {
  FALLBACK_FREE_MODELS,
  listFreeOpenRouterModels,
  fetchFreeOpenRouterModels,
  isFreeChatModel,
};
