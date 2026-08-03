(() => {
  const state = {
    folderPath: null,
    files: [],
    aiRunning: false,
  };

  const SETTINGS_KEY = 'nazmyar.settings.v1';
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

  function getSettings() {
    return {
      aiProvider: $('aiProvider').value || 'none',
      geminiKey: ($('geminiKey').value || '').trim(),
      geminiModel: ($('geminiModel').value || 'gemini-2.0-flash').trim(),
      openrouterKey: ($('openrouterKey').value || '').trim(),
      openrouterModel: ($('openrouterModel').value || 'openai/gpt-4o-mini').trim(),
      autoAiAfterScan: !!$('autoAiAfterScan').checked,
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
      $('openrouterModel').value = data.openrouterModel || 'openai/gpt-4o-mini';
      $('autoAiAfterScan').checked = !!data.autoAiAfterScan;
    } catch { /* ignore */ }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(getSettings()));
  }

  function methodLabel(m) {
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
    const aiReady = settings.aiProvider !== 'none' && (
      (settings.aiProvider === 'gemini' && settings.geminiKey) ||
      (settings.aiProvider === 'openrouter' && settings.openrouterKey)
    );
    $('btnAiAnalyze').disabled = !hasFiles || state.aiRunning || !aiReady;
    $('btnApplyRenames').disabled = state.aiRunning || !state.files.some((f) => nameChanged(f));
    $('previewHint').textContent = aiReady
      ? 'با دکمه تحلیل AI، دسته دقیق‌تر و نام پیشنهادی می‌گیری.'
      : 'برای تحلیل هوشمند، از تنظیمات کلید Gemini یا OpenRouter را فعال کن.';
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
        <td><span class="badge ${f.method === 'ai' ? 'ai' : (f.confidence === 'کم' ? 'low' : '')}">${escapeHtml(f.category)}</span></td>
        <td class="method">${methodLabel(f.method)}${f.aiDone ? '' : ` · ${escapeHtml(f.confidence)}`}</td>
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
      setAiProgress(
        true,
        `تحلیل دسته ${toFaDigits(String(p.batchIndex))} از ${toFaDigits(String(p.batchCount))} — ${toFaDigits(String(p.done))}/${toFaDigits(String(p.total))}`,
        pct,
      );
    });

    try {
      const payload = {
        settings,
        files: state.files.map((f) => ({
          id: f.id,
          name: f.name,
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
      showToast(`AI برای ${toFaDigits(String(result.count || 0))} فایل پیشنهاد داد`);
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
    $(id).addEventListener('change', updateActionButtons);
    $(id).addEventListener('input', updateActionButtons);
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
    try {
      const info = await window.nazmyar.getAppInfo();
      if (info?.stage) $('stageLabel').textContent = info.stage;
    } catch { /* browser preview fallback */ }
    updateHomeStats();
    renderTable();
    updateActionButtons();
  }

  boot();
})();
