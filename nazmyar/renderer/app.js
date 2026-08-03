(() => {
  const state = {
    folderPath: null,
    files: [],
  };

  const $ = (id) => document.getElementById(id);
  const views = {
    home: $('view-home'),
    preview: $('view-preview'),
    settings: $('view-settings'),
  };

  function showToast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { el.hidden = true; }, 2800);
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

  function methodLabel(m) {
    if (m === 'name') return 'از روی اسم';
    if (m === 'ext') return 'از روی پسوند';
    return 'نامشخص';
  }

  function uniqueCategories(files) {
    return [...new Set(files.map((f) => f.category))].sort((a, b) => a.localeCompare(b, 'fa'));
  }

  function renderTable() {
    const q = ($('searchInput').value || '').trim().toLowerCase();
    const cat = $('catFilter').value;
    const body = $('fileTableBody');
    const filtered = state.files.filter((f) => {
      if (cat && f.category !== cat) return false;
      if (q && !f.name.toLowerCase().includes(q) && !f.category.includes(q)) return false;
      return true;
    });

    if (!filtered.length) {
      body.innerHTML = `<tr class="empty-row"><td colspan="4">${
        state.files.length ? 'موردی با این فیلتر پیدا نشد.' : 'هنوز پوشه‌ای اسکن نشده. از خانه یک پوشه انتخاب کنید.'
      }</td></tr>`;
      return;
    }

    body.innerHTML = filtered.map((f) => `
      <tr>
        <td><div class="file-name" title="${escapeAttr(f.name)}">${escapeHtml(f.name)}</div></td>
        <td>${escapeHtml(f.sizeLabel)}</td>
        <td><span class="badge ${f.confidence === 'کم' ? 'low' : ''}">${escapeHtml(f.category)}</span></td>
        <td class="method">${methodLabel(f.method)} · ${escapeHtml(f.confidence)}</td>
      </tr>
    `).join('');
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

  async function doScan(folderPath) {
    showToast('در حال اسکن…');
    const result = await window.nazmyar.scanFolder(folderPath);
    if (!result.ok) {
      showToast(result.error || 'خطا در اسکن');
      return;
    }
    state.folderPath = result.folderPath;
    state.files = result.files || [];
    updateHomeStats();
    fillCatFilter();
    renderTable();
    showToast(`${toFaDigits(String(state.files.length))} فایل پیدا شد`);
    switchView('preview');
  }

  $('btnPickFolder').addEventListener('click', async () => {
    const folder = await window.nazmyar.pickFolder();
    if (!folder) return;
    await doScan(folder);
  });

  $('btnRescan').addEventListener('click', async () => {
    if (state.folderPath) await doScan(state.folderPath);
  });

  $('searchInput').addEventListener('input', renderTable);
  $('catFilter').addEventListener('change', renderTable);

  // Settings — localStorage only for stage 1
  const SETTINGS_KEY = 'nazmyar.settings.v1';

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      $('aiProvider').value = data.aiProvider || 'none';
      $('geminiKey').value = data.geminiKey || '';
      $('openrouterKey').value = data.openrouterKey || '';
      $('openrouterModel').value = data.openrouterModel || 'openai/gpt-4o-mini';
    } catch { /* ignore */ }
  }

  $('settingsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      aiProvider: $('aiProvider').value,
      geminiKey: $('geminiKey').value.trim(),
      openrouterKey: $('openrouterKey').value.trim(),
      openrouterModel: $('openrouterModel').value.trim(),
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
    const msg = $('saveMsg');
    msg.hidden = false;
    clearTimeout(loadSettings._t);
    loadSettings._t = setTimeout(() => { msg.hidden = true; }, 2000);
    showToast('تنظیمات ذخیره شد');
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
    return str.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
  }

  async function boot() {
    loadSettings();
    try {
      const info = await window.nazmyar.getAppInfo();
      if (info?.stage) $('stageLabel').textContent = info.stage;
    } catch { /* browser preview fallback */ }
    updateHomeStats();
    renderTable();
  }

  boot();
})();
