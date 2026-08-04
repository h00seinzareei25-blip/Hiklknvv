(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  let lastBundle = null; // { mode:'single'|'multi', primary, multi?, prompt, report, meta }
  let activeStepIndex = 0;

  function showAlert(type, msg) {
    const el = $('alert');
    el.className = 'alert show ' + type;
    el.textContent = msg;
  }

  function hideAlert() {
    const el = $('alert');
    el.className = 'alert';
    el.textContent = '';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isMultiMode() {
    return $('modeMulti').checked;
  }

  function syncModeUI() {
    const multi = isMultiMode();
    $('singleSettings').classList.toggle('hidden', multi);
    $('multiSettings').classList.toggle('hidden', !multi);
  }

  function syncExtraUI() {
    $('extraFields').classList.toggle('hidden', !$('extraEnabled').checked);
  }

  function fillMethodList() {
    const box = $('methodList');
    box.innerHTML = '';
    JafrEngine.METHOD_PRESETS.forEach((p, idx) => {
      const checked = idx < 3 ? 'checked' : '';
      const div = document.createElement('label');
      div.className = 'method-item';
      div.innerHTML =
        `<input type="checkbox" class="method-check" value="${p.id}" ${checked}>` +
        `<span class="lab">${escapeHtml(p.label)}</span>`;
      box.appendChild(div);
    });
  }

  function selectedMethodIds() {
    return Array.from(document.querySelectorAll('.method-check:checked')).map((el) => el.value);
  }

  function setMethodSelection(ids) {
    const set = new Set(ids || []);
    document.querySelectorAll('.method-check').forEach((el) => {
      el.checked = set.has(el.value);
    });
  }

  function metaFromForm() {
    const extraEnabled = $('extraEnabled').checked;
    return {
      sael: $('sael').value.trim(),
      taleb: $('taleb').value.trim(),
      matloob: $('matloob').value.trim(),
      modda: $('modda').value.trim(),
      soal: $('soal').value.trim(),
      extraEnabled,
      saelFamily: extraEnabled ? $('saelFamily').value.trim() : '',
      talebFamily: extraEnabled ? $('talebFamily').value.trim() : '',
      matloobFamily: extraEnabled ? $('matloobFamily').value.trim() : '',
      questionDate: extraEnabled ? $('questionDate').value.trim() : '',
      questionTime: extraEnabled ? $('questionTime').value.trim() : '',
      reportDate: new Date().toLocaleString('fa-IR')
    };
  }

  function baseInputFromMeta(meta) {
    return {
      sael: meta.sael,
      taleb: meta.taleb,
      matloob: meta.matloob,
      modda: meta.modda,
      soal: meta.soal,
      extraEnabled: meta.extraEnabled,
      saelFamily: meta.saelFamily,
      talebFamily: meta.talebFamily,
      matloobFamily: meta.matloobFamily,
      questionDate: meta.questionDate,
      questionTime: meta.questionTime
    };
  }

  function optionsFromForm() {
    return {
      table: $('table').value,
      bastMode: $('bastMode').value,
      takseer: $('takseer').value,
      takhlis: $('takhlis').value,
      takseerRounds: Number($('takseerRounds').value) || 1,
      mazjNazira: $('mazjNazira').checked,
      removeDupAsas: $('removeDupAsas').checked,
      isqatEnabled: $('isqatEnabled').checked,
      isqatBase: 9,
      isqatKeepZero: false
    };
  }

  function renderSteps(steps) {
    const box = $('stepsList');
    box.innerHTML = '';
    (steps || []).forEach((s, i) => {
      const div = document.createElement('div');
      div.className = 'step';
      div.innerHTML =
        `<div class="head"><span class="t">${escapeHtml(s.title)}</span><span class="n">${i + 1}</span></div>` +
        `<div class="io"><b>ورودی:</b> ${escapeHtml(s.input || '—')}</div>` +
        `<div class="io"><b>خروجی:</b> ${escapeHtml(s.output || '—')}</div>` +
        (s.note ? `<div class="note">${escapeHtml(s.note)}</div>` : '');
      box.appendChild(div);
    });
  }

  function renderMethodTabs(results) {
    const tabs = $('methodTabs');
    if (!results || results.length < 2) {
      tabs.classList.add('hidden');
      tabs.innerHTML = '';
      return;
    }
    tabs.classList.remove('hidden');
    tabs.innerHTML = '';
    results.forEach((r, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'method-tab' + (i === activeStepIndex ? ' active' : '');
      btn.textContent = (i + 1) + ') ' + (r.method || 'روش');
      btn.addEventListener('click', () => {
        activeStepIndex = i;
        renderMethodTabs(results);
        renderSteps(results[i].steps);
        showPrimary(results[i], true);
      });
      tabs.appendChild(btn);
    });
  }

  function renderCompare(results, shared) {
    const box = $('compareTable');
    let html = '<table class="compare-table"><thead><tr><th>#</th><th>روش</th><th>مستحصله</th><th>بدون تکرار</th><th>جمل</th><th>مدخل</th></tr></thead><tbody>';
    results.forEach((r, i) => {
      html += `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(r.method)}</td>
        <td class="must">${escapeHtml(r.mustehsila)}</td>
        <td class="must">${escapeHtml(r.mustehsilaUnique)}</td>
        <td>${r.jamal}</td>
        <td>${r.madkhal}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    box.innerHTML = html;
    $('sharedBox').textContent = shared || '—';
    $('compareCard').classList.remove('hidden');
  }

  function showPrimary(result, keepCompare) {
    $('statJamal').textContent = String(result.jamal);
    $('statMadkhal').textContent = String(result.madkhal);
    $('statCount').textContent = String(result.letterCount);
    $('mustehsilaBox').textContent = result.mustehsila || '—';
    $('uniqueBox').textContent = result.mustehsilaUnique || '—';
    $('resultCard').classList.remove('hidden');
    if (!keepCompare) $('compareCard').classList.add('hidden');
  }

  async function copyText(text, okMsg) {
    try {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Clipboard) {
        await window.Capacitor.Plugins.Clipboard.write({ string: text });
      } else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      showAlert('ok', okMsg || 'کپی شد');
    } catch (e) {
      showAlert('error', 'کپی نشد؛ متن را دستی انتخاب کنید');
    }
  }

  function run() {
    hideAlert();
    const meta = metaFromForm();
    if (!meta.sael && !meta.taleb && !meta.matloob && !meta.modda && !meta.soal) {
      showAlert('error', 'حداقل یکی از فیلدهای صورت مسئله را پر کنید');
      return;
    }

    const input = baseInputFromMeta(meta);
    const baseOpts = optionsFromForm();
    activeStepIndex = 0;

    if (isMultiMode()) {
      const ids = selectedMethodIds();
      if (!ids.length) {
        showAlert('error', 'در حالت چندروش، حداقل یک روش را تیک بزنید');
        return;
      }
      const bundle = JafrEngine.runMany(input, ids, { table: baseOpts.table, isqatEnabled: baseOpts.isqatEnabled });
      if (!bundle.ok) {
        lastBundle = null;
        ['resultCard', 'stepsCard', 'promptCard', 'reportCard', 'compareCard'].forEach((id) => $(id).classList.add('hidden'));
        showAlert('error', bundle.error);
        return;
      }

      const prompt = JafrEngine.buildMultiNatqPrompt(bundle, meta);
      const report = JafrEngine.buildMultiReport(bundle, meta);
      lastBundle = {
        mode: 'multi',
        primary: bundle.primary,
        multi: bundle,
        prompt,
        report,
        meta
      };

      $('resultTitle').textContent = 'نتیجه مستحصله (روش ۱ + مقایسه)';
      $('mustLabel').textContent = 'مستحصله روش ۱ (برای مرور سریع)';
      showPrimary(bundle.primary, true);
      renderCompare(bundle.results, bundle.sharedUnique);
      renderMethodTabs(bundle.results);
      renderSteps(bundle.results[0].steps);
      $('promptBox').value = prompt;
      $('reportBox').value = report;
      $('stepsCard').classList.remove('hidden');
      $('promptCard').classList.remove('hidden');
      $('reportCard').classList.remove('hidden');
      showAlert('ok', `${bundle.results.length} روش محاسبه شد — پرامپت تجمیعی آماده است`);
      $('compareCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const result = JafrEngine.runClassic(Object.assign({}, input, {
      options: Object.assign({}, baseOpts, {
        methodId: 'custom',
        methodLabel: 'جفر کبیر · سفارشی · ' + JafrEngine.describeOptions(baseOpts)
      })
    }));

    if (!result.ok) {
      lastBundle = null;
      ['resultCard', 'promptCard', 'reportCard', 'compareCard'].forEach((id) => $(id).classList.add('hidden'));
      showAlert('error', result.error);
      renderMethodTabs(null);
      renderSteps(result.steps || []);
      $('stepsCard').classList.remove('hidden');
      return;
    }

    const prompt = JafrEngine.buildNatqPrompt(result, meta);
    const report = JafrEngine.buildReport(result, meta);
    lastBundle = { mode: 'single', primary: result, prompt, report, meta };

    $('resultTitle').textContent = 'نتیجه مستحصله';
    $('mustLabel').textContent = 'مستحصله';
    showPrimary(result, false);
    renderMethodTabs(null);
    renderSteps(result.steps);
    $('promptBox').value = prompt;
    $('reportBox').value = report;
    $('stepsCard').classList.remove('hidden');
    $('promptCard').classList.remove('hidden');
    $('reportCard').classList.remove('hidden');
    showAlert('ok', 'محاسبه کامل شد — مستحصله و پرامپت نطق آماده است');
    $('resultCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function clearAll() {
    ['sael', 'taleb', 'matloob', 'modda', 'soal', 'saelFamily', 'talebFamily', 'matloobFamily', 'questionDate', 'questionTime']
      .forEach((id) => { $(id).value = ''; });
    $('extraEnabled').checked = false;
    syncExtraUI();
    lastBundle = null;
    ['resultCard', 'stepsCard', 'promptCard', 'reportCard', 'compareCard'].forEach((id) => $(id).classList.add('hidden'));
    hideAlert();
  }

  function loadSample() {
    $('sael').value = 'حسین';
    $('taleb').value = 'علی';
    $('matloob').value = 'فاطمه';
    $('modda').value = 'ازدواج';
    $('soal').value = 'آیا علی با فاطمه ازدواج خواهد کرد';
    $('extraEnabled').checked = true;
    syncExtraUI();
    $('saelFamily').value = 'رضایی';
    $('talebFamily').value = 'محمدی';
    $('matloobFamily').value = 'احمدی';
    $('questionDate').value = '1404/05/13';
    $('questionTime').value = '14:30';
    $('modeMulti').checked = true;
    syncModeUI();
    setMethodSelection(['classic_bayyinat', 'classic_malfuzi', 'muakhkhar_sadr']);
    showAlert('info', 'نمونه با اطلاعات تکمیلی و ۳ روش بارگذاری شد');
  }

  // init
  fillMethodList();
  syncModeUI();
  syncExtraUI();

  $('extraEnabled').addEventListener('change', syncExtraUI);
  $('modeSingle').addEventListener('change', syncModeUI);
  $('modeMulti').addEventListener('change', syncModeUI);
  $('btnSelectDefault').addEventListener('click', () => {
    setMethodSelection(['classic_bayyinat', 'classic_malfuzi', 'muakhkhar_sadr']);
  });
  $('btnSelectAll').addEventListener('click', () => {
    setMethodSelection(JafrEngine.METHOD_PRESETS.map((p) => p.id));
  });
  $('btnSelectNone').addEventListener('click', () => setMethodSelection([]));

  $('btnRun').addEventListener('click', run);
  $('btnClear').addEventListener('click', clearAll);
  $('btnSample').addEventListener('click', loadSample);

  $('btnCopyPrompt').addEventListener('click', () => {
    if (!lastBundle) return showAlert('error', 'اول محاسبه را اجرا کنید');
    copyText(lastBundle.prompt, 'پرامپت نطق کپی شد');
  });
  $('btnCopyPrompt2').addEventListener('click', () => {
    if (!$('promptBox').value) return;
    copyText($('promptBox').value, 'پرامپت نطق کپی شد');
  });
  $('btnCopyReport').addEventListener('click', () => {
    if (!lastBundle) return showAlert('error', 'اول محاسبه را اجرا کنید');
    copyText(lastBundle.report, 'گزارش کامل کپی شد');
  });
  $('btnCopyMust').addEventListener('click', () => {
    if (!lastBundle) return showAlert('error', 'اول محاسبه را اجرا کنید');
    if (lastBundle.mode === 'multi') {
      const lines = lastBundle.multi.results.map((r, i) => `${i + 1}) ${r.method}: ${r.mustehsila}`);
      copyText(lines.join('\n'), 'مستحصله‌های چندروش کپی شد');
    } else {
      copyText(lastBundle.primary.mustehsila, 'مستحصله کپی شد');
    }
  });
})();
