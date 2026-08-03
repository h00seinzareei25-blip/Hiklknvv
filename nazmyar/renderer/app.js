(() => {
  const state = {
    folderPath: null,
    files: [],
    aiRunning: false,
    freeModels: [],
    freeModelsSource: '',
    selectedFreeIds: ['openrouter/free'],
  };

  const SETTINGS_KEY = 'nazmyar.settings.v1';
  const DEFAULT_FREE_MODEL = 'openrouter/free';
  const $ = (id) => document.getElementById(id);
  const views = {
    home: $('view-home'),
    preview: $('view-preview'),
    settings: $('view-settings'),
  };

  function showToast(msg, opts = {}) {
    const el = $('toast');
    el.textContent = msg;
    el.hidden = false;
    el.classList.toggle('long', !!opts.long || String(msg).length > 80);
    clearTimeout(showToast._t);
    const ms = opts.long ? 9000 : 3200;
    showToast._t = setTimeout(() => { el.hidden = true; }, ms);
  }

  function switchView(name) {
    Object.entries(views).forEach(([key, el]) => {
      el.classList.toggle('active', key === name);
    });
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === name);
    });
  }

  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  function syncPrimaryModel() {
    const primary = state.selectedFreeIds[0] || DEFAULT_FREE_MODEL;
    $('openrouterModel').value = primary;
    return primary;
  }

  function getSelectedFreeFromDom() {
    const boxes = [...document.querySelectorAll('#freeModelsList input[type="checkbox"]')];
    if (!boxes.length) return [...state.selectedFreeIds];
    const checkedBoxes = boxes.filter((b) => b.checked);
    const checked = new Set(checkedBoxes.map((b) => b.value));
    // Keep previous order when possible, append newly checked at end
    const ordered = state.selectedFreeIds.filter((id) => checked.has(id));
    for (const id of checked) {
      if (!ordered.includes(id)) ordered.push(id);
    }
    return ordered.length ? ordered : [boxes[0].value];
  }

  function getSettings() {
    state.selectedFreeIds = getSelectedFreeFromDom();
    const primary = syncPrimaryModel();
    return {
      aiProvider: $('aiProvider').value || 'none',
      geminiKey: ($('geminiKey').value || '').trim(),
      geminiModel: ($('geminiModel').value || 'gemini-2.0-flash').trim(),
      openrouterKey: ($('openrouterKey').value || '').trim(),
      openrouterModel: primary,
      openrouterFreeSelected: [...state.selectedFreeIds],
      includeContentSample: !!$('includeContentSample').checked,
      autoAiAfterScan: !!$('autoAiAfterScan').checked,
      multiModelVote: !!$('multiModelVote').checked,
    };
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      $('aiProvider').value = data.aiProvider || 'none';
      $('geminiKey').value = data.geminiKey || '';
      $('geminiModel').value = data.geminiModel || 'gemini-2.0-flash';
      $('openrouterKey').value = data.openrouterKey || '';
      $('autoAiAfterScan').checked = !!data.autoAiAfterScan;
      $('includeContentSample').checked = data.includeContentSample !== false;
      $('multiModelVote').checked = data.multiModelVote !== false;

      const selected = Array.isArray(data.openrouterFreeSelected) && data.openrouterFreeSelected.length
        ? data.openrouterFreeSelected
        : (data.openrouterModel ? [data.openrouterModel] : [DEFAULT_FREE_MODEL]);
      state.selectedFreeIds = selected.filter(Boolean);
      // migrate old paid default to free router
      if (state.selectedFreeIds.length === 1 && state.selectedFreeIds[0] === 'openai/gpt-4o-mini') {
        state.selectedFreeIds = [DEFAULT_FREE_MODEL];
      }
      syncPrimaryModel();
    } catch { /* ignore */ }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(getSettings()));
  }

  function renderFreeModels() {
    const host = $('freeModelsList');
    if (!state.freeModels.length) {
      host.innerHTML = '<div class="muted sm">مدل رایگانی برای نمایش نیست.</div>';
      return;
    }

    const selected = new Set(state.selectedFreeIds);
    host.innerHTML = state.freeModels.map((m) => {
      const isPrimary = state.selectedFreeIds[0] === m.id;
      const ctx = m.context ? ` · context ${m.context}` : '';
      return `
        <label class="free-model-item ${isPrimary ? 'primary' : ''}">
          <input type="checkbox" value="${escapeAttr(m.id)}" ${selected.has(m.id) ? 'checked' : ''} />
          <span class="free-model-meta">
            <span class="free-model-name">${escapeHtml(m.name)}</span>
            <span class="free-model-id">${escapeHtml(m.id)}${escapeHtml(ctx)}</span>
            ${isPrimary ? '<span class="free-model-tag">مدل اصلی</span>' : ''}
          </span>
        </label>`;
    }).join('');

    host.querySelectorAll('input[type="checkbox"]').forEach((box) => {
      box.addEventListener('change', () => {
        state.selectedFreeIds = getSelectedFreeFromDom();
        if (!state.selectedFreeIds.length) {
          // keep at least one
          box.checked = true;
          state.selectedFreeIds = [box.value];
          showToast('حداقل یک مدل رایگان باید انتخاب باشد');
        }
        syncPrimaryModel();
        renderFreeModels();
        updateActionButtons();
      });
    });

    const src = state.freeModelsSource === 'live' ? 'آنلاین' : 'ذخیره‌شده';
    const selectedCount = state.selectedFreeIds.length;
    const voteOn = $('multiModelVote').checked && selectedCount >= 2;
    const mode = voteOn
      ? `رأی‌گیری فعال · ${toFaDigits(String(Math.min(selectedCount, 5)))} مدل`
      : (selectedCount > 1 ? 'حالت جایگزین (اولی اصلی)' : 'تک‌مدل');
    $('freeModelsMeta').textContent = `${toFaDigits(String(state.freeModels.length))} رایگان · ${src} · ${mode}`;
  }

  async function loadFreeModels(forceToast = false) {
    $('freeModelsMeta').textContent = 'در حال دریافت…';
    try {
      const result = await window.nazmyar.listFreeOpenRouterModels();
      if (!result?.ok) {
        showToast(result?.error || 'خطا در دریافت مدل‌های رایگان');
        return;
      }
      state.freeModels = result.models || [];
      state.freeModelsSource = result.source || '';
      // Drop selected ids that no longer exist, but keep unknowns if list is fallback-limited
      const known = new Set(state.freeModels.map((m) => m.id));
      const kept = state.selectedFreeIds.filter((id) => known.has(id));
      state.selectedFreeIds = kept.length ? kept : [state.freeModels[0]?.id || DEFAULT_FREE_MODEL];
      syncPrimaryModel();
      renderFreeModels();
      if (forceToast) {
        showToast(result.warning || `لیست رایگان بروزرسانی شد (${state.freeModels.length})`);
      } else if (result.warning) {
        showToast(result.warning, { long: true });
      }
    } catch (err) {
      showToast(err.message || 'خطا در دریافت مدل‌ها');
    }
  }

  function updateFreeModelsVisibility() {
    const provider = $('aiProvider').value;
    $('geminiPanel').hidden = provider !== 'gemini';
    $('openrouterPanel').hidden = provider !== 'openrouter';
  }

  function methodLabel(m) {
    if (m === 'ai-vote') return 'رأی چند مدل';
    if (m === 'ai') return 'هوش مصنوعی';
    if (m === 'name') return 'از روی اسم';
    if (m === 'ext') return 'از روی پسوند';
    return 'نامشخص';
  }

  function uniqueCategories(files) {
    return [...new Set(files.map((f) => f.category))].sort((a, b) => a.localeCompare(b, 'fa'));
  }

  function findById(id) {
    return state.files.find((f) => f.id === id);
  }

  function nameChanged(f) {
    return f.suggestedName && f.suggestedName !== f.name;
  }

  function updateActionButtons() {
    const hasFiles = state.files.length > 0;
    const settings = getSettings();
    const orReady = settings.aiProvider === 'openrouter'
      && settings.openrouterKey
      && (settings.openrouterFreeSelected || []).length > 0;
    const aiReady = settings.aiProvider !== 'none' && (
      (settings.aiProvider === 'gemini' && settings.geminiKey) ||
      orReady
    );
    $('btnAiAnalyze').disabled = !hasFiles || state.aiRunning || !aiReady;
    $('btnApplyRenames').disabled = state.aiRunning || !state.files.some((f) => nameChanged(f));
    if (orReady) {
      const n = settings.openrouterFreeSelected.length;
      const vote = settings.multiModelVote && n >= 2;
      $('previewHint').textContent = vote
        ? `رأی‌گیری فعال با ${n} مدل رایگان (حداکثر ۵ مدل همزمان)`
        : `OpenRouter · مدل اصلی: ${settings.openrouterModel} · ${n} مدل انتخاب‌شده`;
    } else {
      $('previewHint').textContent = aiReady
        ? 'با دکمه تحلیل AI، دسته دقیق‌تر و نام پیشنهادی می‌گیری.'
        : 'برای تحلیل هوشمند، از تنظیمات Gemini یا OpenRouter (مدل رایگان) را فعال کن.';
    }
  }

  function renderTable() {
    const q = ($('searchInput').value || '').trim().toLowerCase();
    const cat = $('catFilter').value;
    const onlyChanged = $('onlyChangedNames').checked;
    const body = $('fileTableBody');
    const filtered = state.files.filter((f) => {
      if (cat && f.category !== cat) return false;
      if (onlyChanged && !nameChanged(f)) return false;
      if (q && !f.name.toLowerCase().includes(q)
        && !(f.suggestedName || '').toLowerCase().includes(q)
        && !f.category.includes(q)) return false;
      return true;
    });

    if (!filtered.length) {
      body.innerHTML = `<tr class="empty-row"><td colspan="6">${
        state.files.length ? 'موردی با این فیلتر پیدا نشد.' : 'هنوز پوشه‌ای اسکن نشده. از خانه یک پوشه انتخاب کنید.'
      }</td></tr>`;
      updateActionButtons();
      return;
    }

    body.innerHTML = filtered.map((f) => {
      const changed = nameChanged(f);
      const suggestClass = changed ? 'suggest-name' : 'suggest-name same';
      const suggestText = f.aiDone ? escapeHtml(f.suggestedName || f.name) : '—';
      return `
      <tr data-id="${escapeAttr(f.id)}">
        <td>
          <div class="file-name" title="${escapeAttr(f.name)}">${escapeHtml(f.name)}</div>
          ${f.reason ? `<span class="reason">${escapeHtml(f.reason)}</span>` : ''}
        </td>
        <td>
          <div class="${suggestClass}" title="${escapeAttr(f.suggestedName || '')}">${suggestText}</div>
        </td>
        <td>${escapeHtml(f.sizeLabel)}</td>
        <td><span class="badge ${f.method === 'ai' || f.method === 'ai-vote' ? 'ai' : (f.confidence === 'کم' ? 'low' : '')}">${escapeHtml(f.category)}</span></td>
        <td class="method">${methodLabel(f.method)}${f.aiDone ? ` · ${escapeHtml(f.confidence || '')}` : ` · ${escapeHtml(f.confidence)}`}</td>
        <td>
          <button class="btn-mini btn-rename-one" data-id="${escapeAttr(f.id)}" ${changed ? '' : 'disabled'}>اعمال نام</button>
        </td>
      </tr>`;
    }).join('');

    body.querySelectorAll('.btn-rename-one').forEach((btn) => {
      btn.addEventListener('click', () => applyOneRename(btn.dataset.id));
    });
    updateActionButtons();
  }

  function fillCatFilter() {
    const sel = $('catFilter');
    const current = sel.value;
    const cats = uniqueCategories(state.files);
    sel.innerHTML = '<option value="">همه دسته‌ها</option>' +
      cats.map((c) => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join('');
    if (cats.includes(current)) sel.value = current;
  }

  function updateHomeStats() {
    const bar = $('folderBar');
    const hint = $('emptyHint');
    if (!state.folderPath) {
      bar.hidden = true;
      hint.hidden = false;
      $('btnRescan').disabled = true;
      return;
    }
    bar.hidden = false;
    hint.hidden = true;
    $('folderPathLabel').textContent = state.folderPath;
    $('statCount').textContent = toFaDigits(String(state.files.length));
    $('statCats').textContent = toFaDigits(String(uniqueCategories(state.files).length));
    $('btnRescan').disabled = false;
  }

  function setAiProgress(visible, text, pct) {
    const bar = $('aiBar');
    bar.hidden = !visible;
    if (text) $('aiBarText').textContent = text;
    $('aiProgressFill').style.width = `${Math.max(0, Math.min(100, pct || 0))}%`;
  }

  async function doScan(folderPath) {
    showToast('در حال اسکن…');
    const result = await window.nazmyar.scanFolder(folderPath);
    if (!result.ok) {
      showToast(result.error || 'خطا در اسکن');
      return;
    }
    state.folderPath = result.folderPath;
    state.files = (result.files || []).map((f) => ({
      ...f,
      suggestedName: f.name,
      reason: '',
      aiDone: false,
      offlineCategory: f.category,
    }));
    updateHomeStats();
    fillCatFilter();
    renderTable();
    showToast(`${toFaDigits(String(state.files.length))} فایل پیدا شد`);
    switchView('preview');

    const settings = getSettings();
    if (settings.autoAiAfterScan && settings.aiProvider !== 'none') {
      await runAiAnalyze();
    }
  }

  async function runAiAnalyze() {
    if (state.aiRunning || !state.files.length) return;
    const settings = getSettings();
    if (settings.aiProvider === 'none') {
      showToast('اول در تنظیمات Gemini یا OpenRouter را فعال کن');
      switchView('settings');
      return;
    }
    if (settings.aiProvider === 'gemini' && !settings.geminiKey) {
      showToast('کلید Gemini را در تنظیمات وارد کن');
      switchView('settings');
      return;
    }
    if (settings.aiProvider === 'openrouter' && !settings.openrouterKey) {
      showToast('کلید OpenRouter را در تنظیمات وارد کن');
      switchView('settings');
      return;
    }

    state.aiRunning = true;
    updateActionButtons();
    setAiProgress(true, 'ارسال نام فایل‌ها به هوش مصنوعی…', 5);

    const offProgress = window.nazmyar.onAiProgress((p) => {
      const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
      if (p.phase === 'sample') {
        setAiProgress(
          true,
          `خواندن نمونه محتوا ${toFaDigits(String(p.done))}/${toFaDigits(String(p.total))}`,
          Math.max(5, Math.round(pct * 0.35)),
        );
        return;
      }
      const batchPart = p.batchCount
        ? `دسته ${toFaDigits(String(p.batchIndex))} از ${toFaDigits(String(p.batchCount))} — `
        : '';
      if (p.phase === 'vote') {
        const voteInfo = p.voteModels
          ? `رأی ${toFaDigits(String(p.voteOk || p.voteModels))} مدل · `
          : 'رأی‌گیری · ';
        setAiProgress(
          true,
          `${voteInfo}${batchPart}${toFaDigits(String(p.done))}/${toFaDigits(String(p.total))}`,
          Math.max(35, Math.round(35 + pct * 0.65)),
        );
        return;
      }
      setAiProgress(
        true,
        `تحلیل AI · ${batchPart}${toFaDigits(String(p.done))}/${toFaDigits(String(p.total))}`,
        Math.max(35, Math.round(35 + pct * 0.65)),
      );
    });

    try {
      const payload = {
        settings,
        files: state.files.map((f) => ({
          id: f.id,
          name: f.name,
          path: f.path,
          ext: f.ext,
          category: f.offlineCategory || f.category,
        })),
      };
      const result = await window.nazmyar.aiAnalyze(payload);
      if (!result.ok) {
        const err = result.error || 'خطا در هوش مصنوعی';
        showToast(err, { long: true });
        setAiProgress(true, err.split('\n')[0], 0);
        return;
      }

      const map = new Map((result.results || []).map((r) => [r.id, r]));
      state.files = state.files.map((f) => {
        const hit = map.get(f.id);
        if (!hit) return f;
        return {
          ...f,
          category: hit.category || f.category,
          suggestedName: hit.suggestedName || f.name,
          reason: hit.reason || '',
          method: 'ai',
          confidence: 'بالا',
          aiDone: true,
        };
      });
      fillCatFilter();
      renderTable();
      updateHomeStats();
      setAiProgress(true, 'تحلیل هوش مصنوعی تمام شد', 100);
      setTimeout(() => setAiProgress(false), 1200);
      const sampleNote = result.sampledCount
        ? ` · نمونه محتوا: ${toFaDigits(String(result.sampledCount))}`
        : '';
      showToast(`AI برای ${toFaDigits(String(result.count || 0))} فایل پیشنهاد داد${sampleNote}`);
    } finally {
      offProgress();
      state.aiRunning = false;
      updateActionButtons();
    }
  }

  async function applyOneRename(id) {
    const file = findById(id);
    if (!file || !nameChanged(file)) return;
    const ok = confirm(`نام فایل تغییر کند؟\n\n${file.name}\n↓\n${file.suggestedName}`);
    if (!ok) return;

    const result = await window.nazmyar.renameFile({
      filePath: file.path,
      newName: file.suggestedName,
    });
    if (!result.ok) {
      showToast(result.error || 'خطا در تغییر نام');
      return;
    }
    file.name = result.name;
    file.path = result.path;
    file.suggestedName = result.name;
    file.id = `${result.name}::${file.size}::${Date.now()}`;
    renderTable();
    showToast(result.skipped ? 'نام تغییری نکرد' : 'نام اعمال شد');
  }

  async function applyAllRenames() {
    const targets = state.files.filter(nameChanged);
    if (!targets.length) return;
    const ok = confirm(`${targets.length} فایل تغییر نام داده می‌شود. ادامه می‌دهی؟`);
    if (!ok) return;

    let done = 0;
    let failed = 0;
    setAiProgress(true, 'در حال اعمال نام‌ها…', 0);
    for (let i = 0; i < targets.length; i++) {
      const file = targets[i];
      const result = await window.nazmyar.renameFile({
        filePath: file.path,
        newName: file.suggestedName,
      });
      if (result.ok) {
        file.name = result.name;
        file.path = result.path;
        file.suggestedName = result.name;
        file.id = `${result.name}::${file.size}::${Date.now()}`;
        done += 1;
      } else {
        failed += 1;
      }
      setAiProgress(true, `اعمال نام ${toFaDigits(String(i + 1))} از ${toFaDigits(String(targets.length))}`, Math.round(((i + 1) / targets.length) * 100));
    }
    renderTable();
    setTimeout(() => setAiProgress(false), 800);
    showToast(`اعمال شد: ${toFaDigits(String(done))}${failed ? ` — خطا: ${toFaDigits(String(failed))}` : ''}`);
  }

  $('btnPickFolder').addEventListener('click', async () => {
    const folder = await window.nazmyar.pickFolder();
    if (!folder) return;
    await doScan(folder);
  });

  $('btnRescan').addEventListener('click', async () => {
    if (state.folderPath) await doScan(state.folderPath);
  });

  $('btnAiAnalyze').addEventListener('click', () => runAiAnalyze());
  $('btnApplyRenames').addEventListener('click', () => applyAllRenames());

  $('searchInput').addEventListener('input', renderTable);
  $('catFilter').addEventListener('change', renderTable);
  $('onlyChangedNames').addEventListener('change', renderTable);

  $('settingsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveSettings();
    const msg = $('saveMsg');
    msg.hidden = false;
    clearTimeout(saveSettings._t);
    saveSettings._t = setTimeout(() => { msg.hidden = true; }, 2000);
    showToast('تنظیمات ذخیره شد');
    updateActionButtons();
  });

  $('btnTestAi').addEventListener('click', async () => {
    saveSettings();
    const box = $('testResult');
    box.hidden = false;
    box.className = 'test-result';
    box.textContent = 'در حال تست اتصال…';
    $('btnTestAi').disabled = true;
    try {
      const result = await window.nazmyar.aiTest(getSettings());
      if (result.ok) {
        box.className = 'test-result ok';
        box.textContent = result.detail || 'اتصال موفق بود.';
        showToast('اتصال AI برقرار شد');
      } else {
        box.className = 'test-result err';
        box.textContent = result.error || 'اتصال برقرار نشد.';
        showToast((result.error || 'اتصال برقرار نشد').split('\n')[0], { long: true });
      }
    } finally {
      $('btnTestAi').disabled = false;
      updateActionButtons();
    }
  });

  ['aiProvider', 'geminiKey', 'openrouterKey'].forEach((id) => {
    $(id).addEventListener('change', () => {
      if (id === 'aiProvider') updateFreeModelsVisibility();
      updateActionButtons();
    });
    $(id).addEventListener('input', updateActionButtons);
  });

  $('btnRefreshFreeModels').addEventListener('click', () => loadFreeModels(true));
  $('btnSelectAllFree').addEventListener('click', () => {
    state.selectedFreeIds = state.freeModels.map((m) => m.id);
    syncPrimaryModel();
    renderFreeModels();
    updateActionButtons();
  });
  $('btnClearFree').addEventListener('click', () => {
    state.selectedFreeIds = [state.freeModels[0]?.id || DEFAULT_FREE_MODEL];
    syncPrimaryModel();
    renderFreeModels();
    updateActionButtons();
  });
  $('multiModelVote').addEventListener('change', () => {
    renderFreeModels();
    updateActionButtons();
  });

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function escapeAttr(s) { return escapeHtml(s).replace(/'/g, '&#39;'); }

  function toFaDigits(str) {
    return String(str).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
  }

  async function boot() {
    loadSettings();
    updateFreeModelsVisibility();
    try {
      const info = await window.nazmyar.getAppInfo();
      if (info?.stage) $('stageLabel').textContent = info.stage;
    } catch { /* browser preview fallback */ }
    updateHomeStats();
    renderTable();
    updateActionButtons();
    await loadFreeModels(false);
    updateFreeModelsVisibility();
    updateActionButtons();
  }

  boot();
})();
