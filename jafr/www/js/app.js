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
    if ($('jadwalOpts')) $('jadwalOpts').classList.toggle('hidden', pipe !== 'jadwali');
    if ($('pipelineHint')) {
      if (pipe === 'jadwali') {
        $('pipelineHint').hidden = false;
        const usuli = !$('classicBasis') || $('classicBasis').checked;
        $('pipelineHint').textContent = usuli
          ? 'جدولی · مبنا اصولی: مستحضره دسته‌ای = حساب · مخزن A–D فقط نطق ادبی · میزان از اساس کامل'
          : 'جدولی · مهندسی: مستحصله از مخزن یکتا A–D · رنگ پس از نطق · میزان از اساس کامل';
      } else if (pipe === 'fifteen') {
        $('pipelineHint').hidden = false;
        $('pipelineHint').textContent = '۱۵ سطری: اساس، نظیره، نسبت، قوا، جواب. تقریب کاربردی قابل‌ممیزی.';
      } else {
        $('pipelineHint').hidden = false;
        $('pipelineHint').textContent = 'کلاسیک کبیر: بسط/بینات → تکسیر → تخلیص → مستحصله.';
      }
    }
  }

  function todayShamsiNumeric() {
    try {
      const parts = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(new Date());
      const get = (t) => (parts.find((p) => p.type === t) || {}).value || '';
      const y = get('year');
      const m = String(get('month')).padStart(2, '0');
      const d = String(get('day')).padStart(2, '0');
      return y && m && d ? (y + '/' + m + '/' + d) : '';
    } catch (e) {
      return '';
    }
  }

  /** امروز به سبک اسکرین: پانزدهم مرداد هزار و چهارصد و پنج هجری شمسی در ایران */
  function todayShamsiPersian() {
    if (window.JafrEngine && typeof JafrEngine.formatTodayShamsiPersian === 'function') {
      return JafrEngine.formatTodayShamsiPersian({ withHijriShamsi: true, withInIran: true }) || '';
    }
    return todayShamsiNumeric();
  }

  function ensureTodayDate(force) {
    const el = $('questionDate');
    if (!el) return;
    if (force || !el.value.trim()) el.value = todayShamsiPersian();
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
    const questionDate = ($('questionDate') && $('questionDate').value.trim()) || '';
    const scopeEl = document.querySelector('input[name="questionScope"]:checked');
    const scopeVal = (scopeEl && scopeEl.value) || 'auto';
    return {
      sael: $('sael').value.trim(),
      taleb: $('taleb').value.trim(),
      matloob: $('matloob').value.trim(),
      modda: $('modda').value.trim(),
      soal: $('soal').value.trim(),
      questionScope: scopeVal === 'auto' ? '' : scopeVal,
      extraEnabled,
      saelFamily: extraEnabled ? $('saelFamily').value.trim() : '',
      talebFamily: extraEnabled ? $('talebFamily').value.trim() : '',
      matloobFamily: extraEnabled ? $('matloobFamily').value.trim() : '',
      questionDate,
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
      questionScope: meta.questionScope || '',
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
      const model = ($('jadwalModel') && $('jadwalModel').value) || 'quarter28';
      opts.jadwalModel = model === 'tttm' ? 'tttm' : 'quarter28';
      opts.classicBasis = !$('classicBasis') || $('classicBasis').checked;
      opts.methodId = opts.jadwalModel === 'tttm' ? 'jadwali_tttm' : 'jadwali_mizan';
      opts.methodLabel = opts.jadwalModel === 'tttm'
        ? (opts.classicBasis ? 'جفر جدولی · tttm · مبنا اصولی' : 'جفر جدولی · ترفع/ترقی/تنزل/مساوات')
        : (opts.classicBasis ? 'جفر جدولی · مبنا اصولی (مستحضره)' : 'جفر جدولی میزان‌دار (ربع/مخزن)');
      opts.natqStyle = 'sentence';
    }
    const scopeEl = document.querySelector('input[name="questionScope"]:checked');
    const scopeVal = (scopeEl && scopeEl.value) || 'auto';
    if (scopeVal === 'markazi' || scopeVal === 'mehvari') opts.questionScope = scopeVal;
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

  function showProfileHint(meta, result) {
    const el = $('profileHint');
    if (!el || !JafrEngine.detectQuestionProfile) return;
    const p = JafrEngine.detectQuestionProfile(meta || {});
    const topic = JafrEngine.detectTopic ? JafrEngine.detectTopic(meta || {}) : null;
    let mode = 'چندخوانشی';
    if (p.id === 'yesno') mode = 'قطبی (آری/خیر/مبهم)';
    else if (p.id === 'choice') mode = 'انتخاب بین گزینه‌ها';
    else if (p.id === 'cause') mode = 'علت/وضعیت (بدون آری‌خیر غالب)';
    let text = `پروفایل نطق: ${p.title} → ${mode}` +
      (topic && topic.title ? ` | موضوع کمکی: ${topic.title}` : '') +
      (p.id === 'cause'
        ? ' | نطق از بذر/حروف؛ تشخیص پزشکی نیست.'
        : ' | اگر «آیا / یا نه» ننوشته باشی معمولاً چندخوانشی است.');
    if (result && result.jamalLock) {
      const jl = result.jamalLock;
      if (jl.matched) {
        text += ` | قفل جمل: بسته (${jl.jamal}/${jl.mizan})`;
      } else if (jl.relevant) {
        text += ` | قفل جمل: ${jl.summary}`;
      } else {
        text += ` | جمل ${jl.jamal} → میزان ${jl.mizan}`;
      }
    }
    if (result && result.natqLock && result.natqLock.unlocked) {
      text += ' | قفل نطق: استخراج قانونی (مستحضره/لقط/بذر)';
      if (result.legal && result.legal.legalPool) {
        text += ` · حروف مجاز ${result.legal.legalPool.length}`;
      }
    }
    el.textContent = text;
  }

  function renderJadwalGrid(result) {
    const wrap = $('jadwalGridWrap');
    const box = $('jadwalGridBox');
    const hint = $('jadwalGridHint');
    if (!wrap || !box) return;
    const j = result && result.jadwal;
    if (!j || !j.layers || !j.layers.length) {
      wrap.classList.add('hidden');
      box.innerHTML = '';
      return;
    }
    const main = ['A', 'B', 'C', 'D']
      .map((id) => j.layers.find((l) => l.id === id))
      .filter(Boolean);
    if (!main.length) {
      wrap.classList.add('hidden');
      return;
    }
    const n = (main[0].str || '').length;
    const mark = {};
    // رنگ خانه‌های مستحضره (قانون انتخاب دسته)
    if (j.picks && j.picks.length) {
      j.picks.forEach((p) => {
        const rowMap = { Mus: 'A', Tarfa: 'C', Tanz: 'D', Taraqi: 'B', A: 'A', B: 'B', C: 'C', D: 'D' };
        const rid = rowMap[p.row] || p.row;
        if (rid === 'A' || rid === 'B' || rid === 'C' || rid === 'D') {
          mark[rid + ':' + p.col] = 0;
        }
      });
    }
    // رنگ ستون‌های لقط میزانی روی A–D
    const step = (j.classicLaqt && j.classicLaqt.step) || result.mizan || 0;
    if (step > 0) {
      const nCols = (main[0].str || '').length;
      for (let c = step; c <= nCols; c += step) {
        ['A', 'B', 'C', 'D'].forEach((rid) => {
          const key = rid + ':' + c;
          if (mark[key] == null) mark[key] = 1;
        });
      }
    }
    let html = '<table class="jadwal-table"><thead><tr><th>سطر</th>';
    for (let c = 1; c <= n; c++) html += '<th>' + c + '</th>';
    html += '</tr></thead><tbody>';
    main.forEach((row) => {
      html += '<tr><td class="row-label">' + escapeHtml(row.title || row.id) + '</td>';
      for (let i = 0; i < n; i++) {
        const ch = row.str[i] || '';
        const key = row.id + ':' + (i + 1);
        const sw = mark[key];
        const cls = sw == null ? '' : ('hl-s' + Math.min(5, sw | 0));
        html += '<td class="' + cls + '">' + escapeHtml(ch) + '</td>';
      }
      html += '</tr>';
    });
    if (j.selected) {
      html += '<tr class="sel-row"><td class="row-label">مستحضره</td>';
      for (let i = 0; i < n; i++) {
        const isLaqt = step > 0 && ((i + 1) % step === 0);
        html += '<td class="' + (isLaqt ? 'hl-s2' : '') + '">' + escapeHtml(j.selected[i] || '') + '</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    box.innerHTML = html;
    if (hint) {
      hint.textContent = step
        ? ('نارنجی≈خانه‌های مرتبط مستحضره · زرد=ستون لقط (مضرب ' + step + ') · سبز روی مستحضره=حروف لقط')
        : 'سطرهای A–D و مستحضره؛ نطق از استخراج قانونی.';
    }
    renderLegalExtraction(result);
    renderNatqProvenance(result);
    wrap.classList.remove('hidden');
  }

  function renderLegalExtraction(result) {
    const wrap = $('legalExtractWrap');
    const body = $('legalExtractBody');
    const summary = $('legalExtractSummary');
    if (!wrap || !body) return;
    const legal = result.legal || (result.jadwal && result.jadwal.legal);
    if (!legal) {
      wrap.classList.add('hidden');
      body.innerHTML = '';
      return;
    }
    if (summary) summary.textContent = legal.summary || '—';
    const parts = [];
    parts.push('<p><strong>مستحضره:</strong> <span class="letters" style="display:inline;font-size:14px">' +
      escapeHtml(legal.mustahdara || '—') + '</span></p>');
    if (legal.mustLines && legal.mustLines.length) {
      parts.push('<p class="hint">منشأ نمونه: ' + escapeHtml(legal.mustLines.slice(0, 12).join(' · ')) + '</p>');
    }
    parts.push('<p><strong>لقط میزانی (گام ' + escapeHtml(String(legal.mizan || '')) + '):</strong></p><ul class="natq-prov-list">');
    (legal.laqtLines || []).forEach((ln) => {
      parts.push('<li class="ok"><span class="d">' + escapeHtml(ln) + '</span></li>');
    });
    parts.push('</ul>');
    parts.push('<p><strong>حروف مجاز یکتا:</strong> <span class="letters" style="display:inline;font-size:14px">' +
      escapeHtml(legal.legalPool || '—') + '</span></p>');
    parts.push('<p><strong>بذر A:</strong> <span class="d">' + escapeHtml((legal.seedA || '').slice(0, 80)) +
      ((legal.seedA || '').length > 80 ? '…' : '') + '</span></p>');
    parts.push('<p><strong>بذر B:</strong> <span class="d">' + escapeHtml((legal.seedB || '').slice(0, 80)) +
      ((legal.seedB || '').length > 80 ? '…' : '') + '</span></p>');
    if (legal.legalWords && legal.legalWords.length) {
      parts.push('<p><strong>واژه‌پوش قانونی:</strong> ' +
        escapeHtml(legal.legalWords.map((w) => w.word).join('، ')) + '</p>');
    } else {
      parts.push('<p class="hint">واژهٔ کامل بانک روی حروف قانونی کم است — از بذر A/B متصل بخوان.</p>');
    }
    body.innerHTML = parts.join('');
    wrap.classList.remove('hidden');
  }

  function renderNatqProvenance(result) {
    const wrap = $('natqProvWrap');
    const list = $('natqProvList');
    const summary = $('natqProvSummary');
    if (!wrap || !list) return;
    const ref = (result.natqLock && result.natqLock.reference)
      || (result.jadwal && result.jadwal.natqLock && result.jadwal.natqLock.reference)
      || null;
    const prov = ref && ref.provenance;
    if (!ref || !ref.literarySample || !prov || !prov.words || !prov.words.length) {
      wrap.classList.add('hidden');
      list.innerHTML = '';
      if (summary) summary.textContent = '—';
      return;
    }
    const legalNote = ref.legalCover
      ? (' | روی حروف قانونی این اجرا: ' + ref.legalCover.summary)
      : '';
    if (summary) {
      summary.textContent = (ref.note || 'نمونه ادبی') + legalNote;
    }
    list.innerHTML = prov.words.slice(0, 12).map((w) => {
      const cls = w.ok ? 'ok' : 'bad';
      return `<li class="${cls}"><strong>${escapeHtml(w.word)}</strong><span class="d">${escapeHtml(w.detail || '')}</span></li>`;
    }).join('');
    wrap.classList.remove('hidden');
  }

  function renderMustehsilaGrid(result) {
    const wrap = $('mustehsilaGridWrap');
    const box = $('mustehsilaGridBox');
    const hint = $('mustehsilaGridHint');
    if (!wrap || !box) return;
    const grid = result.mustehsilaGrid
      || (result.jadwal && result.jadwal.mustehsilaGrid)
      || (result.mustehsilaUnique ? JafrEngine.buildMustehsilaGrid(result.mustehsilaUnique) : null);
    if (!grid || !grid.rows || !grid.rows.length) {
      wrap.classList.add('hidden');
      box.innerHTML = '';
      return;
    }
    const cols = grid.cols || (grid.rows[0].cells || []).length;
    let html = '<table class="must-grid-table"><thead><tr><th>سطر</th>';
    for (let c = 1; c <= cols; c++) html += '<th>' + c + '</th>';
    html += '</tr></thead><tbody>';
    grid.rows.forEach((row) => {
      html += '<tr><td class="row-label">' + escapeHtml(row.title || row.id) + '</td>';
      (row.cells || []).forEach((ch) => {
        html += '<td>' + escapeHtml(ch || '') + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    box.innerHTML = html;
    if (hint) hint.textContent = grid.classicNote || 'نمایش فشردهٔ حروف مستحصله؛ اصل همان سطر بالاست.';
    wrap.classList.remove('hidden');
  }

  function renderNatqReading(result) {
    const wrap = $('natqReadWrap');
    if (!wrap) return;
    const ns = result.natqSeed || (result.jadwal && result.jadwal.natqSeed);
    if (!ns) {
      wrap.classList.add('hidden');
      return;
    }
    if ($('natqLineA')) $('natqLineA').textContent = ns.afterNazira || ns.readingLine || '—';
    if ($('natqLineB')) $('natqLineB').textContent = (ns.qutbPath && ns.qutbPath.readingLine) || '—';
    if ($('natqDraft')) $('natqDraft').textContent = ns.seedDraft || ns.draftLine || '—';
    if ($('natqLexAssist')) $('natqLexAssist').textContent = ns.lexAssist || '— (بانک فقط کمکی؛ اسکلت نطق نیست)';
    if ($('natqWords')) {
      const words = (ns.candidateWords || []).filter((w) => w.complete).slice(0, 14).map((w) => w.word);
      $('natqWords').textContent = words.length ? words.join('، ') : '—';
    }
    const checklist = result.natqChecklist
      || (result.jadwal && result.jadwal.natqChecklist)
      || (JafrEngine.buildNatqChecklist && JafrEngine.buildNatqChecklist(ns, {
        soal: (result.parts && result.parts.soal) || ''
      }));
    renderNatqChecklist(checklist);
    wrap.classList.remove('hidden');
  }

  function renderNatqChecklist(checklist) {
    const list = $('natqCheckList');
    const summary = $('natqCheckSummary');
    const samplesBox = $('natqSamplesBox');
    if (!list) return;
    if (!checklist) {
      list.innerHTML = '';
      if (summary) summary.textContent = '—';
      return;
    }
    if (summary) summary.textContent = checklist.summary || checklist.classicNote || '—';
    list.innerHTML = (checklist.items || []).map((it) => {
      const cls = it.status === 'done' ? 'done' : (it.status === 'hint' ? 'hint-item' : 'todo');
      const mark = it.status === 'done' ? '✓' : (it.status === 'hint' ? '·' : '○');
      return `<li class="${cls}"><span class="mark">${mark}</span><div><strong>${escapeHtml(it.title)}</strong><span class="d">${escapeHtml(it.detail || '')}</span></div></li>`;
    }).join('');
    if (samplesBox) {
      const samples = checklist.samples || JafrEngine.NATQ_TEACHING_SAMPLES || [];
      samplesBox.innerHTML = samples.map((s) => (
        `<article class="natq-sample">
          <h4>${escapeHtml(s.title)}</h4>
          <p class="hint">${escapeHtml(s.source || '')}</p>
          <p><span class="natq-k">مستحصله / بذر</span> ${escapeHtml(s.mustehsila)} → ${escapeHtml(s.seed)}</p>
          <p><span class="natq-k">خوانش</span> ${escapeHtml(s.reading)}</p>
          <p class="lesson">${escapeHtml(s.lesson || '')}</p>
        </article>`
      )).join('');
    }
  }

  function showPrimary(result, keepCompare) {
    $('statJamal').textContent = String(result.jamal);
    if ($('statMizan')) $('statMizan').textContent = result.mizan != null ? String(result.mizan) : '—';
    $('statMadkhal').textContent = String(result.madkhal);
    const colN = result.jadwal && result.jadwal.columnCount;
    $('statCount').textContent = colN != null
      ? `${result.letterCount} (ستون:${colN})`
      : String(result.letterCount);
    $('mustehsilaBox').textContent = result.mustehsila || '—';
    $('uniqueBox').textContent = result.mustehsilaUnique || '—';
    const scope = result.questionScope || (result.jadwal && result.jadwal.questionScope);
    if ($('profileHint')) {
      const lock = result.jamalLock;
      let t = scope ? (`نوع سؤال: ${scope.title} — ${scope.classicNote}`) : '';
      if (lock && lock.matched) {
        t = (t ? t + ' | ' : '') + 'قفل محوری بسته: ۵۰۲۲ → میزان ۱۰' +
          (lock.hits && lock.hits.length ? (' · ' + lock.hits[0]) : '');
      } else if (lock && lock.relevant && lock.summary) {
        t = (t ? t + ' | ' : '') + lock.summary;
      } else if (lock && !lock.relevant) {
        t = (t ? t + ' | ' : '') + `جمل ${lock.jamal} → میزان ${lock.mizan}`;
      }
      if (result.classicBasis || (result.jadwal && result.jadwal.classicBasis)) {
        t = (t ? t + ' | ' : '') + 'مبنا: اصولی (مستحضره) · ادبی: مخزن A–D';
      } else if (result.mustehsilaMode === 'engineered_pool' ||
          (result.options && result.options.pipeline === 'jadwali' && result.options.classicBasis === false)) {
        t = (t ? t + ' | ' : '') + 'مبنا: مهندسی (مخزن یکتا)';
      }
      $('profileHint').textContent = t || 'پروفایل نطق بعد از اجرا نشان داده می‌شود.';
    }
    renderNatqReading(result);
    renderMustehsilaGrid(result);
    renderJadwalGrid(result);
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
      const bundle = JafrEngine.runMany(input, ids, {
        table: baseOpts.table,
        isqatEnabled: baseOpts.isqatEnabled
      });
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
      $('mustLabel').textContent = 'سطر مستحصله روش ۱ (اصل کلاسیک)';
      showPrimary(bundle.primary, true);
      showProfileHint(meta, bundle.primary);
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

    $('resultTitle').textContent = 'نتیجه · سطر مستحصله';
    $('mustLabel').textContent = 'سطر مستحصله (اصل کلاسیک)';
    showPrimary(result, false);
    showProfileHint(meta, result);
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
    ensureTodayDate(true);
    lastBundle = null;
    if ($('generatorAnswerBox')) $('generatorAnswerBox').value = '';
    ['resultCard', 'stepsCard', 'promptCard', 'reportCard', 'compareCard', 'stabilityCard', 'mustehsilaGridWrap', 'jadwalGridWrap', 'natqReadWrap', 'askRefineWrap']
      .forEach((id) => { const el = $(id); if (el) el.classList.add('hidden'); });
    if ($('askRefineBox')) $('askRefineBox').value = '';
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
    $('questionDate').value = JafrEngine.formatShamsiDatePersian({ year: 1404, month: 5, day: 13 })
      || 'سیزدهم مرداد هزار و چهارصد و چهار هجری شمسی در ایران';
    $('questionTime').value = '14:30';
    if ($('scopeMehvari')) $('scopeMehvari').checked = true;
    $('modeMulti').checked = true;
    syncModeUI();
    setMethodSelection(['jadwali_mizan', 'classic_bayyinat', 'classic_malfuzi']);
    showAlert('info', 'نمونه ازدواج با اطلاعات تکمیلی بارگذاری شد');
  }

  function buildAndShowAskRefine() {
    const meta = metaFromForm();
    if (!meta.sael && !meta.taleb && !meta.matloob && !meta.modda && !meta.soal) {
      showAlert('error', 'اول یک پیش‌نویس سؤال یا مدعا بنویس');
      return '';
    }
    const prompt = JafrEngine.buildAskRefinePrompt(meta);
    if ($('askRefineBox')) $('askRefineBox').value = prompt;
    const wrap = $('askRefineWrap');
    if (wrap) {
      wrap.classList.remove('hidden');
      wrap.open = true;
    }
    return prompt;
  }

  async function copyAskRefine() {
    let prompt = ($('askRefineBox') && $('askRefineBox').value.trim()) || '';
    if (!prompt) prompt = buildAndShowAskRefine();
    if (!prompt) return;
    await copyText(prompt, 'پرامپت بهبود سؤال کپی شد — به AI بده؛ بعد مدعا و سؤال را پیست کن');
  }

  // init
  fillMethodList();
  syncModeUI();
  syncExtraUI();
  ensureTodayDate(true);

  $('extraEnabled').addEventListener('change', syncExtraUI);
  $('modeSingle').addEventListener('change', syncModeUI);
  $('modeMulti').addEventListener('change', syncModeUI);
  if ($('pipeline')) $('pipeline').addEventListener('change', syncPipelineUI);
  if ($('classicBasis')) $('classicBasis').addEventListener('change', syncPipelineUI);
  if ($('btnTodayDate')) {
    $('btnTodayDate').addEventListener('click', () => {
      ensureTodayDate(true);
      showAlert('ok', 'تاریخ امروز فارسی گذاشته شد: ' + ($('questionDate').value || '—'));
    });
  }
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
  if ($('btnAskRefine')) {
    $('btnAskRefine').addEventListener('click', () => {
      const p = buildAndShowAskRefine();
      if (p) showAlert('ok', 'پرامپت آماده شد — کپی کن و به AI بده');
    });
  }
  if ($('btnCopyAskRefine')) {
    $('btnCopyAskRefine').addEventListener('click', copyAskRefine);
  }

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
