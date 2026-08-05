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
    if (!multi) syncPipelineUI();
  }

  function syncPipelineUI() {
    const pipe = $('pipeline') ? $('pipeline').value : 'classic';
    const hideClassic = pipe === 'fifteen' || pipe === 'jadwali';
    if ($('classicOpts')) $('classicOpts').classList.toggle('hidden', hideClassic);
    if ($('pipelineHint')) {
      if (pipe === 'jadwali') {
        $('pipelineHint').hidden = false;
        $('pipelineHint').textContent = 'جدولی میزان‌دار: ستون‌حروف → A/B/C/D ربع دایره (+۰/+۷/+۱۴/+۲۱) + نظیره → میزان (جمل mod ۲۸) → انتخاب → نطق جمله‌ای از مخزن ABCD.';
      } else if (pipe === 'fifteen') {
        $('pipelineHint').hidden = false;
        $('pipelineHint').textContent = '۱۵ سطری: اساس، نظیره، نسبت، قوا، جواب. تقریب کاربردی قابل‌ممیزی.';
      } else {
        $('pipelineHint').hidden = false;
        $('pipelineHint').textContent = 'کلاسیک کبیر: بسط/بینات → تکسیر → تخلیص → مستحصله.';
      }
    }
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
    const pipeline = $('pipeline') ? $('pipeline').value : 'classic';
    const opts = {
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
    if (pipeline === 'fifteen') {
      opts.pipeline = 'fifteen';
      opts.methodId = 'fifteen_line';
      opts.methodLabel = 'جفر ۱۵ سطری';
    } else if (pipeline === 'jadwali') {
      opts.pipeline = 'jadwali';
      opts.methodId = 'jadwali_mizan';
      opts.methodLabel = 'جفر جدولی میزان‌دار';
      opts.natqStyle = 'sentence';
    }
    return opts;
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

  function renderStability(stability) {
    const card = $('stabilityCard');
    const note = $('stabilityNote');
    const list = $('stabilityList');
    if (!stability || !stability.applicable) {
      card.classList.add('hidden');
      return;
    }
    card.classList.remove('hidden');
    note.textContent = stability.note || '—';
    if (!stability.ok || !stability.stable || !stability.stable.length) {
      list.innerHTML = '<div class="hint">کاندید پایدار مشترک یافت نشد.</div>';
      return;
    }
    list.innerHTML = stability.stable.slice(0, 10).map((s, i) =>
      `<div class="step"><div class="head"><span class="t">${escapeHtml(s.word)}</span><span class="n">${i + 1}</span></div>` +
      `<div class="io">با تکمیلی: ${s.scoreWith} | بدون تکمیلی: ${s.scoreWithout}` +
      (s.rankWith ? ` | رتبه ${s.rankWith}/${s.rankWithout || '—'}` : '') +
      `</div></div>`
    ).join('');
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

  function showProfileHint(meta) {
    const el = $('profileHint');
    if (!el || !JafrEngine.detectQuestionProfile) return;
    const p = JafrEngine.detectQuestionProfile(meta || {});
    const topic = JafrEngine.detectTopic ? JafrEngine.detectTopic(meta || {}) : null;
    let mode = 'چندخوانشی';
    if (p.id === 'yesno') mode = 'قطبی (آری/خیر/مبهم)';
    else if (p.id === 'choice') mode = 'انتخاب بین گزینه‌ها';
    el.textContent = `پروفایل نطق: ${p.title} → ${mode}` +
      (topic && topic.title ? ` | موضوع کمکی: ${topic.title}` : '') +
      ' | اگر «آیا / یا نه» ننوشته باشی معمولاً چندخوانشی است.';
  }

  function showPrimary(result, keepCompare) {
    $('statJamal').textContent = String(result.jamal);
    if ($('statMizan')) $('statMizan').textContent = result.mizan != null ? String(result.mizan) : '—';
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
        ['resultCard', 'stepsCard', 'promptCard', 'reportCard', 'compareCard', 'stabilityCard'].forEach((id) => $(id).classList.add('hidden'));
        showAlert('error', bundle.error);
        return;
      }

      const stability = JafrEngine.analyzeStabilityForMulti(input, ids, { table: baseOpts.table, isqatEnabled: baseOpts.isqatEnabled }, meta);
      const pack = JafrEngine.buildMultiNatqPrompt(bundle, meta, { stability });
      const report = JafrEngine.buildMultiReport(bundle, meta);
      lastBundle = {
        mode: 'multi',
        primary: bundle.primary,
        multi: bundle,
        prompt: pack.prompt || pack.generator,
        generator: pack.generator,
        judge: pack.judge,
        judgeTemplate: pack.judge,
        stability,
        report,
        meta
      };

      $('resultTitle').textContent = 'نتیجه مستحصله (روش ۱ + مقایسه)';
      $('mustLabel').textContent = 'مستحصله روش ۱ (برای مرور سریع)';
      showPrimary(bundle.primary, true);
      showProfileHint(meta);
      renderCompare(bundle.results, bundle.sharedUnique);
      renderStability(stability);
      renderMethodTabs(bundle.results);
      renderSteps(bundle.results[0].steps);
      $('promptBox').value = pack.generator;
      $('judgeBox').value = pack.judge;
      if ($('generatorAnswerBox')) $('generatorAnswerBox').value = '';
      $('reportBox').value = report;
      $('stepsCard').classList.remove('hidden');
      $('promptCard').classList.remove('hidden');
      $('reportCard').classList.remove('hidden');
      showAlert('ok', `${bundle.results.length} روش محاسبه شد — مولّد + داور آماده است`);
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
      ['resultCard', 'promptCard', 'reportCard', 'compareCard', 'stabilityCard'].forEach((id) => $(id).classList.add('hidden'));
      showAlert('error', result.error);
      renderMethodTabs(null);
      renderSteps(result.steps || []);
      $('stepsCard').classList.remove('hidden');
      return;
    }

    const stability = JafrEngine.analyzeStabilityForResult(input, Object.assign({}, baseOpts, {
      methodId: 'custom',
      methodLabel: 'جفر کبیر · سفارشی · ' + JafrEngine.describeOptions(baseOpts)
    }), meta);
    const pack = JafrEngine.buildNatqPrompt(result, meta, { stability });
    const report = JafrEngine.buildReport(result, meta);
    lastBundle = {
      mode: 'single',
      primary: result,
      prompt: pack.prompt || pack.generator,
      generator: pack.generator,
      judge: pack.judge,
      judgeTemplate: pack.judge,
      stability,
      report,
      meta
    };

    $('resultTitle').textContent = 'نتیجه مستحصله';
    $('mustLabel').textContent = 'مستحصله';
    showPrimary(result, false);
    showProfileHint(meta);
    renderStability(stability);
    renderMethodTabs(null);
    renderSteps(result.steps);
    $('promptBox').value = pack.generator;
    $('judgeBox').value = pack.judge;
    if ($('generatorAnswerBox')) $('generatorAnswerBox').value = '';
    $('reportBox').value = report;
    $('stepsCard').classList.remove('hidden');
    $('promptCard').classList.remove('hidden');
    $('reportCard').classList.remove('hidden');
    showAlert('ok', 'محاسبه کامل شد — مولّد + داور آماده است');
    $('resultCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function clearAll() {
    ['sael', 'taleb', 'matloob', 'modda', 'soal', 'saelFamily', 'talebFamily', 'matloobFamily', 'questionDate', 'questionTime']
      .forEach((id) => { $(id).value = ''; });
    $('extraEnabled').checked = false;
    syncExtraUI();
    lastBundle = null;
    if ($('generatorAnswerBox')) $('generatorAnswerBox').value = '';
    ['resultCard', 'stepsCard', 'promptCard', 'reportCard', 'compareCard', 'stabilityCard'].forEach((id) => $(id).classList.add('hidden'));
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
    setMethodSelection(['jadwali_mizan', 'classic_bayyinat', 'classic_malfuzi']);
    showAlert('info', 'نمونه با اطلاعات تکمیلی و ۳ روش (جدولی+۲ کلاسیک) بارگذاری شد');
  }

  // init
  fillMethodList();
  syncModeUI();
  syncExtraUI();

  $('extraEnabled').addEventListener('change', syncExtraUI);
  $('modeSingle').addEventListener('change', syncModeUI);
  $('modeMulti').addEventListener('change', syncModeUI);
  if ($('pipeline')) $('pipeline').addEventListener('change', syncPipelineUI);
  $('btnSelectDefault').addEventListener('click', () => {
    setMethodSelection(['jadwali_mizan', 'classic_bayyinat', 'classic_malfuzi']);
  });
  $('btnSelectAll').addEventListener('click', () => {
    setMethodSelection(JafrEngine.METHOD_PRESETS.map((p) => p.id));
  });
  $('btnSelectNone').addEventListener('click', () => setMethodSelection([]));

  $('btnRun').addEventListener('click', run);
  $('btnClear').addEventListener('click', clearAll);
  $('btnSample').addEventListener('click', loadSample);

  function copyGenerator() {
    if (!lastBundle) return showAlert('error', 'اول محاسبه را اجرا کنید');
    copyText(lastBundle.generator || lastBundle.prompt || $('promptBox').value, 'پرامپت مولّد کپی شد');
  }
  function copyJudge() {
    if (!lastBundle) return showAlert('error', 'اول محاسبه را اجرا کنید');
    const filled = $('judgeBox').value || lastBundle.judge || '';
    if (!filled.trim()) return showAlert('error', 'پرامپت داور خالی است');
    copyText(filled, 'پرامپت داور کپی شد');
  }
  function buildFilledJudge() {
    if (!lastBundle) return showAlert('error', 'اول محاسبه را اجرا کنید');
    const answer = ($('generatorAnswerBox') && $('generatorAnswerBox').value || '').trim();
    if (!answer) return showAlert('error', 'اول جواب مولّد را در کادر پیست کنید');
    const template = lastBundle.judgeTemplate || lastBundle.judge || '';
    const filled = JafrEngine.fillJudgePrompt(template, answer);
    lastBundle.judge = filled;
    $('judgeBox').value = filled;
    showAlert('ok', 'پرامپت داور با جواب مولّد ساخته شد — کپی کن و به AI بده');
    $('judgeBox').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  $('btnCopyPrompt').addEventListener('click', copyGenerator);
  $('btnCopyPrompt2').addEventListener('click', copyGenerator);
  $('btnCopyJudge').addEventListener('click', copyJudge);
  $('btnCopyJudgeTop').addEventListener('click', copyJudge);
  if ($('btnBuildJudge')) $('btnBuildJudge').addEventListener('click', buildFilledJudge);
  if ($('btnClearGeneratorAnswer')) {
    $('btnClearGeneratorAnswer').addEventListener('click', () => {
      if ($('generatorAnswerBox')) $('generatorAnswerBox').value = '';
      if (lastBundle && lastBundle.judgeTemplate) {
        lastBundle.judge = lastBundle.judgeTemplate;
        $('judgeBox').value = lastBundle.judgeTemplate;
      }
      showAlert('info', 'جواب مولّد پاک شد');
    });
  }
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
