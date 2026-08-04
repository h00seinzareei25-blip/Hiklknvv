(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  let lastResult = null;
  let lastMeta = null;

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

  function metaFromForm() {
    return {
      sael: $('sael').value.trim(),
      taleb: $('taleb').value.trim(),
      matloob: $('matloob').value.trim(),
      modda: $('modda').value.trim(),
      soal: $('soal').value.trim(),
      date: new Date().toLocaleString('fa-IR')
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
    steps.forEach((s, i) => {
      const div = document.createElement('div');
      div.className = 'step';
      div.innerHTML =
        `<div class="head"><span class="t">${s.title}</span><span class="n">${i + 1}</span></div>` +
        `<div class="io"><b>ورودی:</b> ${escapeHtml(s.input || '—')}</div>` +
        `<div class="io"><b>خروجی:</b> ${escapeHtml(s.output || '—')}</div>` +
        (s.note ? `<div class="note">${escapeHtml(s.note)}</div>` : '');
      box.appendChild(div);
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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

    const result = JafrEngine.runClassic({
      sael: meta.sael,
      taleb: meta.taleb,
      matloob: meta.matloob,
      modda: meta.modda,
      soal: meta.soal,
      options: optionsFromForm()
    });

    lastResult = result;
    lastMeta = meta;

    if (!result.ok) {
      $('resultCard').classList.add('hidden');
      $('stepsCard').classList.add('hidden');
      $('promptCard').classList.add('hidden');
      $('reportCard').classList.add('hidden');
      showAlert('error', result.error);
      renderSteps(result.steps || []);
      $('stepsCard').classList.remove('hidden');
      return;
    }

    $('statJamal').textContent = String(result.jamal);
    $('statMadkhal').textContent = String(result.madkhal);
    $('statCount').textContent = String(result.letterCount);
    $('mustehsilaBox').textContent = result.mustehsila || '—';
    $('uniqueBox').textContent = result.mustehsilaUnique || '—';

    const prompt = JafrEngine.buildNatqPrompt(result, meta);
    const report = JafrEngine.buildReport(result, meta);
    $('promptBox').value = prompt;
    $('reportBox').value = report;

    renderSteps(result.steps);
    $('resultCard').classList.remove('hidden');
    $('stepsCard').classList.remove('hidden');
    $('promptCard').classList.remove('hidden');
    $('reportCard').classList.remove('hidden');
    showAlert('ok', 'محاسبه کامل شد — مستحصله و پرامپت نطق آماده است');
    $('resultCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function clearAll() {
    ['sael', 'taleb', 'matloob', 'modda', 'soal'].forEach((id) => { $(id).value = ''; });
    lastResult = null;
    lastMeta = null;
    ['resultCard', 'stepsCard', 'promptCard', 'reportCard'].forEach((id) => $(id).classList.add('hidden'));
    hideAlert();
  }

  function loadSample() {
    $('sael').value = 'حسین';
    $('taleb').value = 'علی';
    $('matloob').value = 'فاطمه';
    $('modda').value = 'ازدواج';
    $('soal').value = 'آیا علی با فاطمه ازدواج خواهد کرد';
    showAlert('info', 'نمونه بارگذاری شد — محاسبه را اجرا کنید');
  }

  $('btnRun').addEventListener('click', run);
  $('btnClear').addEventListener('click', clearAll);
  $('btnSample').addEventListener('click', loadSample);
  $('btnCopyPrompt').addEventListener('click', () => {
    if (!lastResult || !lastResult.ok) return showAlert('error', 'اول محاسبه را اجرا کنید');
    copyText(JafrEngine.buildNatqPrompt(lastResult, lastMeta), 'پرامپت نطق کپی شد');
  });
  $('btnCopyPrompt2').addEventListener('click', () => {
    if (!$('promptBox').value) return;
    copyText($('promptBox').value, 'پرامپت نطق کپی شد');
  });
  $('btnCopyReport').addEventListener('click', () => {
    if (!lastResult || !lastResult.ok) return showAlert('error', 'اول محاسبه را اجرا کنید');
    copyText(JafrEngine.buildReport(lastResult, lastMeta), 'گزارش کامل کپی شد');
  });
  $('btnCopyMust').addEventListener('click', () => {
    if (!lastResult || !lastResult.ok) return showAlert('error', 'اول محاسبه را اجرا کنید');
    copyText(lastResult.mustehsila, 'مستحصله کپی شد');
  });
})();
