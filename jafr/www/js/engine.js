/**
 * موتور جفر کبیر کلاسیک — محاسبات قطعی بدون AI
 * زنجیره: نرمال‌سازی → اساس → نظیره → مزج → بینات → تکسیر → تخلیص → مستحصله
 */
(function (global) {
  'use strict';

  /** ترتیب دایره ابجد کبیر (۲۸ حرف) */
  const ABJAD_ORDER = [
    'ا', 'ب', 'ج', 'د', 'ه', 'و', 'ز', 'ح', 'ط', 'ی', 'ک', 'ل', 'م', 'ن',
    'س', 'ع', 'ف', 'ص', 'ق', 'ر', 'ش', 'ت', 'ث', 'خ', 'ذ', 'ض', 'ظ', 'غ'
  ];

  /** ابجد کبیر */
  const ABJAD_KABIR = {
    'ا': 1, 'ب': 2, 'ج': 3, 'د': 4, 'ه': 5, 'و': 6, 'ز': 7, 'ح': 8, 'ط': 9,
    'ی': 10, 'ک': 20, 'ل': 30, 'م': 40, 'ن': 50, 'س': 60, 'ع': 70, 'ف': 80, 'ص': 90,
    'ق': 100, 'ر': 200, 'ش': 300, 'ت': 400, 'ث': 500, 'خ': 600, 'ذ': 700, 'ض': 800, 'ظ': 900, 'غ': 1000
  };

  /** ابجد صغیر (با اسقاط ۹) */
  const ABJAD_SAGHIR = Object.fromEntries(
    Object.entries(ABJAD_KABIR).map(([k, v]) => {
      let x = v % 9;
      if (x === 0 && v !== 0) x = 9;
      return [k, x];
    })
  );

  /** ابجد وضعی (۱ تا ۲۸) */
  const ABJAD_WAZIE = Object.fromEntries(ABJAD_ORDER.map((ch, i) => [ch, i + 1]));

  /** نام ملفوظی حروف برای بسط/بینات */
  const LETTER_NAMES = {
    'ا': 'الف', 'ب': 'با', 'ج': 'جیم', 'د': 'دال', 'ه': 'ها', 'و': 'واو',
    'ز': 'زا', 'ح': 'حا', 'ط': 'طا', 'ی': 'یا', 'ک': 'کاف', 'ل': 'لام',
    'م': 'میم', 'ن': 'نون', 'س': 'سین', 'ع': 'عین', 'ف': 'فا', 'ص': 'صاد',
    'ق': 'قاف', 'ر': 'را', 'ش': 'شین', 'ت': 'تا', 'ث': 'ثا', 'خ': 'خا',
    'ذ': 'ذال', 'ض': 'ضاد', 'ظ': 'ظا', 'غ': 'غین'
  };

  /** معادل حروف غیر ابجد */
  const EQUIV = {
    'آ': 'ا', 'أ': 'ا', 'إ': 'ا', 'ٱ': 'ا', 'ء': 'ا', 'ؤ': 'ا', 'ئ': 'ا',
    'ة': 'ه', 'ۀ': 'ه', 'ه‌': 'ه',
    'ي': 'ی', 'ى': 'ی', 'ئ': 'ا',
    'ك': 'ک', 'گ': 'ک', 'ك': 'ک',
    'چ': 'ج', 'پ': 'ب', 'ژ': 'ز',
    'ة': 'ه', 'ؤ': 'ا'
  };

  const TABLES = {
    kabir: ABJAD_KABIR,
    saghir: ABJAD_SAGHIR,
    wazie: ABJAD_WAZIE
  };

  function indexOfLetter(ch) {
    return ABJAD_ORDER.indexOf(ch);
  }

  function normalizeText(text, report) {
    const raw = String(text || '');
    const kept = [];
    const rejected = [];
    const mapped = [];

    for (const ch of raw) {
      if (/\s/.test(ch)) continue;
      // حذف اعراب و علائم کشیده/تاتویل
      if (/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/.test(ch)) continue;
      if (/[0-9۰-۹٠-٩]/.test(ch)) {
        rejected.push(ch);
        continue;
      }
      if (/[A-Za-z]/.test(ch)) {
        rejected.push(ch);
        continue;
      }
      if (/[،؛؟!.:«»"'\-_/\\()\[\]{}…]/.test(ch)) continue;

      let c = ch;
      if (EQUIV[c]) {
        mapped.push(`${ch}→${EQUIV[c]}`);
        c = EQUIV[c];
      }
      // ی فارسی/عربی یکدست
      if (c === 'ي' || c === 'ى') c = 'ی';
      if (c === 'ك') c = 'ک';

      if (ABJAD_KABIR[c]) {
        kept.push(c);
      } else if (/[\u0600-\u06FF]/.test(c)) {
        rejected.push(c);
      }
    }

    if (report) {
      report.rejected = rejected;
      report.mapped = mapped;
      report.before = raw;
      report.after = kept.join('');
    }
    return kept.join('');
  }

  function removeDuplicatesKeepOrder(str) {
    const seen = new Set();
    let out = '';
    for (const ch of str) {
      if (!seen.has(ch)) {
        seen.add(ch);
        out += ch;
      }
    }
    return out;
  }

  function letterValue(ch, tableName) {
    const table = TABLES[tableName] || ABJAD_KABIR;
    return table[ch] || 0;
  }

  function sumAbjad(str, tableName) {
    let sum = 0;
    const detail = [];
    for (const ch of str) {
      const v = letterValue(ch, tableName);
      sum += v;
      detail.push({ ch, v });
    }
    return { sum, detail };
  }

  /** رد به آحاد */
  function reduceToUnits(n) {
    let x = Math.abs(n);
    const steps = [x];
    while (x > 9) {
      x = String(x).split('').reduce((a, d) => a + Number(d), 0);
      steps.push(x);
    }
    return { value: x, steps };
  }

  /** اسقاط */
  function isqat(n, base, keepZero) {
    if (!base || base <= 0) return n;
    let r = n % base;
    if (r === 0 && !keepZero) r = base;
    return r;
  }

  /** نظیره: حرف روبه‌رو در جدول ۲×۱۴ دایره ابجد */
  function nazira(ch) {
    const i = indexOfLetter(ch);
    if (i < 0) return ch;
    return ABJAD_ORDER[(i + 14) % 28];
  }

  function mapNazira(str) {
    return [...str].map(nazira).join('');
  }

  /** غریزه: نظیره‌ی رفت‌وبرگشتی ساده‌شده (جابه‌جایی ±۱ در نیم‌جدول) — اینجا معادل ترقی یک پله */
  function ghariza(ch) {
    const i = indexOfLetter(ch);
    if (i < 0) return ch;
    return ABJAD_ORDER[(i + 1) % 28];
  }

  /** مزج: درهم‌آمیزی دو رشته حرف‌به‌حرف */
  function mazj(a, b) {
    const max = Math.max(a.length, b.length);
    let out = '';
    for (let i = 0; i < max; i++) {
      if (i < a.length) out += a[i];
      if (i < b.length) out += b[i];
    }
    return out;
  }

  /** بسط ملفوظی */
  function bastMalfuzi(str) {
    let out = '';
    for (const ch of str) {
      const name = LETTER_NAMES[ch] || ch;
      out += normalizeText(name);
    }
    return out;
  }

  /** بینات: نام حرف بدون حرف اول */
  function bayyinat(str) {
    let out = '';
    for (const ch of str) {
      const name = LETTER_NAMES[ch] || ch;
      const rest = name.slice(1);
      out += normalizeText(rest);
    }
    return out;
  }

  /** زبر و بینات: حرف + بینات */
  function zabarBayyinat(str) {
    let out = '';
    for (const ch of str) {
      const name = LETTER_NAMES[ch] || ch;
      out += normalizeText(name);
    }
    return out;
  }

  /**
   * تکسیر صدر و مؤخر تا زمام
   * A B C D E F → A F B E C D
   */
  function takseerSadrMuakhkhar(str) {
    const arr = [...str];
    const out = [];
    let L = 0;
    let R = arr.length - 1;
    let takeLeft = true;
    while (L <= R) {
      if (takeLeft) {
        out.push(arr[L++]);
      } else {
        out.push(arr[R--]);
      }
      takeLeft = !takeLeft;
    }
    return out.join('');
  }

  /**
   * تکسیر مؤخر و صدر تا زمام
   * A B C D E F → F A E B D C
   */
  function takseerMuakhkharSadr(str) {
    const arr = [...str];
    const out = [];
    let L = 0;
    let R = arr.length - 1;
    let takeRight = true;
    while (L <= R) {
      if (takeRight) {
        out.push(arr[R--]);
      } else {
        out.push(arr[L++]);
      }
      takeRight = !takeRight;
    }
    return out.join('');
  }

  /** تخلیص: لقط منفصل با گام (پیش‌فرض هر ۲ حرف از اول) */
  function takhlisLaqt(str, step) {
    const s = Math.max(1, step | 0 || 2);
    let out = '';
    for (let i = 0; i < str.length; i += s) {
      out += str[i];
    }
    return out;
  }

  /** تخلیص حروف فرد (۱-مبنای انسانی = ایندکس زوج) */
  function takhlisOdd(str) {
    let out = '';
    for (let i = 0; i < str.length; i += 2) out += str[i];
    return out;
  }

  /** استنطاق کبیر: عدد → حروف ابجد */
  function istintaqKabir(n) {
    let x = Math.abs(n | 0);
    if (x === 0) return 'ا';
    const entries = Object.keys(ABJAD_KABIR)
      .map((ch) => [ch, ABJAD_KABIR[ch]])
      .sort((a, b) => b[1] - a[1]);
    let out = '';
    let guard = 0;
    while (x > 0 && guard < 40) {
      guard++;
      let placed = false;
      for (let i = 0; i < entries.length; i++) {
        const ch = entries[i][0];
        const v = entries[i][1];
        if (v <= x) {
          out += ch;
          x -= v;
          placed = true;
          break;
        }
      }
      if (!placed) break;
    }
    return out || 'ا';
  }

  /** حاصل نسبت سطری: برای هر حرف با حرف بعدی جمع ابجد و استنطاق */
  function nisbatRow(str) {
    const arr = [...String(str || '')];
    if (!arr.length) return '';
    let out = '';
    for (let i = 0; i < arr.length; i++) {
      const a = letterValue(arr[i], 'kabir');
      const b = letterValue(arr[(i + 1) % arr.length], 'kabir');
      const letters = istintaqKabir(a + b);
      out += letters.charAt(0) || arr[i];
    }
    return out;
  }

  /** حروف قوا: از هر ۴ حرف یکی + حروف غالب عنصری */
  function haroofQuwa(str) {
    const s = String(str || '');
    let out = '';
    for (let i = 0; i < s.length; i += 4) out += s[i];
    return out || s;
  }

  function uniqueLetters(str) {
    return removeDuplicatesKeepOrder(str);
  }

  function countDots(str) {
    // نقاط متعارف حروف عربی/فارسی ابجد
    const dots = {
      'ب': 1, 'ج': 1, 'خ': 1, 'ذ': 1, 'ز': 1, 'ض': 1, 'ظ': 1, 'غ': 1,
      'ف': 1, 'ن': 1, 'ت': 2, 'ق': 2, 'ی': 2, 'ث': 3, 'ش': 3
    };
    let n = 0;
    for (const ch of str) n += dots[ch] || 0;
    return n;
  }

  /** تبدیل ارقام به واژه‌های فارسی تا وارد اساس حرفی شوند */
  const DIGIT_WORDS = {
    '0': 'صفر', '1': 'یک', '2': 'دو', '3': 'سه', '4': 'چهار',
    '5': 'پنج', '6': 'شش', '7': 'هفت', '8': 'هشت', '9': 'نه',
    '۰': 'صفر', '۱': 'یک', '۲': 'دو', '۳': 'سه', '۴': 'چهار',
    '۵': 'پنج', '۶': 'شش', '۷': 'هفت', '۸': 'هشت', '۹': 'نه',
    '٠': 'صفر', '١': 'یک', '٢': 'دو', '٣': 'سه', '٤': 'چهار',
    '٥': 'پنج', '٦': 'شش', '٧': 'هفت', '٨': 'هشت', '٩': 'نه'
  };

  function expandDigitsToWords(text) {
    return String(text || '').replace(/[0-9۰-۹٠-٩]/g, (d) => DIGIT_WORDS[d] || '');
  }

  function normalizeDateTimeField(text, report) {
    const expanded = expandDigitsToWords(text);
    return normalizeText(expanded, report);
  }

  function joinName(first, family, extraEnabled) {
    const a = String(first || '').trim();
    const b = extraEnabled ? String(family || '').trim() : '';
    return [a, b].filter(Boolean).join(' ');
  }

  /** پیش‌فرض‌های چندروش */
  const METHOD_PRESETS = [
    {
      id: 'classic_bayyinat',
      label: 'کبیر · بینات · صدر/مؤخر · فرد',
      options: { bastMode: 'bayyinat', takseer: 'sadr_muakhkhar', takhlis: 'odd', mazjNazira: true, removeDupAsas: false, takseerRounds: 1 }
    },
    {
      id: 'classic_malfuzi',
      label: 'کبیر · ملفوظی · صدر/مؤخر · فرد',
      options: { bastMode: 'malfuzi', takseer: 'sadr_muakhkhar', takhlis: 'odd', mazjNazira: true, removeDupAsas: false, takseerRounds: 1 }
    },
    {
      id: 'zabar_bayyinat',
      label: 'کبیر · زبر و بینات · صدر/مؤخر · فرد',
      options: { bastMode: 'zabarBayyinat', takseer: 'sadr_muakhkhar', takhlis: 'odd', mazjNazira: true, removeDupAsas: false, takseerRounds: 1 }
    },
    {
      id: 'muakhkhar_sadr',
      label: 'کبیر · بینات · مؤخر/صدر · فرد',
      options: { bastMode: 'bayyinat', takseer: 'muakhkhar_sadr', takhlis: 'odd', mazjNazira: true, removeDupAsas: false, takseerRounds: 1 }
    },
    {
      id: 'no_mazj',
      label: 'کبیر · بینات · بدون مزج · فرد',
      options: { bastMode: 'bayyinat', takseer: 'sadr_muakhkhar', takhlis: 'odd', mazjNazira: false, removeDupAsas: false, takseerRounds: 1 }
    },
    {
      id: 'laqt2',
      label: 'کبیر · بینات · صدر/مؤخر · لقط۲',
      options: { bastMode: 'bayyinat', takseer: 'sadr_muakhkhar', takhlis: 'laqt2', mazjNazira: true, removeDupAsas: false, takseerRounds: 1 }
    },
    {
      id: 'laqt3',
      label: 'کبیر · بینات · صدر/مؤخر · لقط۳',
      options: { bastMode: 'bayyinat', takseer: 'sadr_muakhkhar', takhlis: 'laqt3', mazjNazira: true, removeDupAsas: false, takseerRounds: 1 }
    },
    {
      id: 'laqt4',
      label: 'کبیر · بینات · صدر/مؤخر · لقط۴',
      options: { bastMode: 'bayyinat', takseer: 'sadr_muakhkhar', takhlis: 'laqt4', mazjNazira: true, removeDupAsas: false, takseerRounds: 1 }
    },
    {
      id: 'fifteen_line',
      label: 'جفر ۱۵ سطری (اساس→نظیره→نسب→قوا→جواب)',
      options: { pipeline: 'fifteen', table: 'kabir' }
    },
    {
      id: 'dedup_asas',
      label: 'کبیر · بینات · حذف مکرر اساس · فرد',
      options: { bastMode: 'bayyinat', takseer: 'sadr_muakhkhar', takhlis: 'odd', mazjNazira: true, removeDupAsas: true, takseerRounds: 1 }
    },
    {
      id: 'double_takseer',
      label: 'کبیر · بینات · دو دور تکسیر · فرد',
      options: { bastMode: 'bayyinat', takseer: 'sadr_muakhkhar', takhlis: 'odd', mazjNazira: true, removeDupAsas: false, takseerRounds: 2 }
    }
  ];

  function describeOptions(opts) {
    if (opts && opts.pipeline === 'fifteen') return 'جفر ۱۵ سطری';
    const bastMap = { bayyinat: 'بینات', malfuzi: 'ملفوظی', zabarBayyinat: 'زبر و بینات', none: 'بدون بسط' };
    const takMap = { sadr_muakhkhar: 'صدر/مؤخر', muakhkhar_sadr: 'مؤخر/صدر' };
    const takhMap = { odd: 'فرد', laqt2: 'لقط۲', laqt3: 'لقط۳', laqt4: 'لقط۴', none: 'بدون تخلیص' };
    return [
      bastMap[opts.bastMode] || opts.bastMode,
      takMap[opts.takseer] || opts.takseer,
      `×${opts.takseerRounds || 1}`,
      takhMap[opts.takhlis] || opts.takhlis,
      opts.mazjNazira ? 'مزج' : 'بدون‌مزج',
      opts.removeDupAsas ? 'حذف‌مکرر' : null
    ].filter(Boolean).join(' · ');
  }

  /**
   * اجرای کامل جفر کبیر کلاسیک
   * @param {object} input
   */
  function runClassic(input) {
    const opts = Object.assign({
      table: 'kabir',
      removeDupAsas: false,
      mazjNazira: true,
      bastMode: 'bayyinat', // bayyinat | malfuzi | zabarBayyinat | none
      takseer: 'sadr_muakhkhar', // sadr_muakhkhar | muakhkhar_sadr
      takhlis: 'odd', // odd | laqt2 | none
      isqatEnabled: false,
      isqatBase: 9,
      isqatKeepZero: false,
      takseerRounds: 1
    }, input.options || {});

    const extraEnabled = !!input.extraEnabled;
    const steps = [];

    const saelRaw = joinName(input.sael, input.saelFamily, extraEnabled);
    const talebRaw = joinName(input.taleb, input.talebFamily, extraEnabled);
    const matloobRaw = joinName(input.matloob, input.matloobFamily, extraEnabled);
    const dateRaw = extraEnabled ? String(input.questionDate || '').trim() : '';
    const timeRaw = extraEnabled ? String(input.questionTime || '').trim() : '';

    const parts = {
      sael: normalizeText(saelRaw, {}),
      taleb: normalizeText(talebRaw, {}),
      matloob: normalizeText(matloobRaw, {}),
      modda: normalizeText(input.modda, {}),
      soal: normalizeText(input.soal, {}),
      date: dateRaw ? normalizeDateTimeField(dateRaw, {}) : '',
      time: timeRaw ? normalizeDateTimeField(timeRaw, {}) : ''
    };

    // نرمال‌سازی همه اجزا با گزارش تجمیعی
    const allRawParts = [saelRaw, talebRaw, matloobRaw, input.modda, input.soal];
    if (extraEnabled) {
      if (dateRaw) allRawParts.push(expandDigitsToWords(dateRaw));
      if (timeRaw) allRawParts.push(expandDigitsToWords(timeRaw));
    }
    const allRaw = allRawParts.filter(Boolean).join(' ');
    const fullNorm = {};
    normalizeText(allRaw, fullNorm);

    steps.push({
      id: 'normalize',
      title: 'نرمال‌سازی حروف',
      input: allRaw,
      output: fullNorm.after,
      note: [
        extraEnabled ? 'اطلاعات تکمیلی فعال است' : 'اطلاعات تکمیلی غیرفعال',
        fullNorm.mapped.length ? `تبدیل‌ها: ${fullNorm.mapped.slice(0, 12).join('، ')}${fullNorm.mapped.length > 12 ? '…' : ''}` : 'بدون تبدیل معادل',
        fullNorm.rejected.length ? `حروف ردشده: ${[...new Set(fullNorm.rejected)].join(' ')}` : 'بدون حرف ردشده'
      ].join(' | ')
    });

    let asas = parts.sael + parts.taleb + parts.matloob + parts.modda + parts.soal + parts.date + parts.time;
    const asasInputNote = [
      `سائل:${parts.sael}`,
      `طالب:${parts.taleb}`,
      `مطلوب:${parts.matloob}`,
      `مدعا:${parts.modda}`,
      `سؤال:${parts.soal}`
    ];
    if (extraEnabled) {
      asasInputNote.push(`تاریخ:${parts.date || '—'}`);
      asasInputNote.push(`ساعت:${parts.time || '—'}`);
    }
    steps.push({
      id: 'asas_raw',
      title: 'ساخت اساس (سطر پایه)',
      input: asasInputNote.join(' | '),
      output: asas,
      note: `طول اساس: ${asas.length} حرف` + (extraEnabled ? ' (با اطلاعات تکمیلی)' : '')
    });

    if (!asas.length) {
      return {
        ok: false,
        error: 'پس از نرمال‌سازی هیچ حرف ابجدی باقی نماند. ورودی را بررسی کنید.',
        steps,
        options: opts
      };
    }

    if (opts.removeDupAsas) {
      const before = asas;
      asas = removeDuplicatesKeepOrder(asas);
      steps.push({
        id: 'asas_dedup',
        title: 'حذف مکرر از اساس',
        input: before,
        output: asas,
        note: `از ${before.length} به ${asas.length} حرف`
      });
    }

    const jamal = sumAbjad(asas, opts.table);
    const madkhal = reduceToUnits(jamal.sum);
    let jamalNote = `جمع جمل (${opts.table}): ${jamal.sum} | مدخل/رد به آحاد: ${madkhal.steps.join(' ← ')}`;
    if (opts.isqatEnabled) {
      const iq = isqat(jamal.sum, opts.isqatBase, opts.isqatKeepZero);
      jamalNote += ` | اسقاط ${opts.isqatBase}: ${iq}`;
    }
    steps.push({
      id: 'jamal',
      title: 'حساب ابجد و مداخل',
      input: asas,
      output: String(jamal.sum),
      note: jamalNote,
      detail: jamal.detail
    });

    // --- زنجیره جفر ۱۵ سطری ---
    if (opts.pipeline === 'fifteen') {
      const L = [];
      L[1] = asas;
      steps.push({ id: 'l01', title: 'سطر ۱ · اساس', input: asasInputNote.join(' | '), output: L[1], note: 'سطر پایه' });

      L[2] = mapNazira(L[1]);
      steps.push({ id: 'l02', title: 'سطر ۲ · نظیره اساس', input: L[1], output: L[2], note: 'نظیره ابجدی ۲×۱۴' });

      L[3] = nisbatRow(L[1]);
      steps.push({ id: 'l03', title: 'سطر ۳ · حاصل نسبت اساس', input: L[1], output: L[3], note: 'جمع ابجد هر حرف با بعدی + استنطاق' });

      L[4] = nisbatRow(L[2]);
      steps.push({ id: 'l04', title: 'سطر ۴ · حاصل نسبت نظیره', input: L[2], output: L[4], note: 'نسبت روی سطر نظیره' });

      L[5] = mazj(L[1], L[2]);
      steps.push({ id: 'l05', title: 'سطر ۵ · تتمه اولی (مزج اساس و نظیره)', input: L[1] + ' + ' + L[2], output: L[5], note: 'مزج حرف‌به‌حرف' });

      L[6] = mapNazira(L[5]);
      steps.push({ id: 'l06', title: 'سطر ۶ · نظیره تتمه اولی', input: L[5], output: L[6], note: 'نظیره سطر ۵' });

      L[7] = nisbatRow(L[5]);
      steps.push({ id: 'l07', title: 'سطر ۷ · حاصل نسبت اساس و نظیره', input: L[5], output: L[7], note: 'نسبت روی تتمه اولی' });

      L[8] = nisbatRow(L[7]);
      steps.push({ id: 'l08', title: 'سطر ۸ · حاصل نسبت دوم', input: L[7], output: L[8], note: 'نسبت مجدد' });

      L[9] = mapLetters(L[5], mapTarfa);
      steps.push({ id: 'l09', title: 'سطر ۹ · سر تتمه ثانیه (ترفع)', input: L[5], output: L[9], note: 'ترفع یک پله از تتمه اولی' });

      L[10] = mapLetters(L[5], mapTanzil);
      steps.push({ id: 'l10', title: 'سطر ۱۰ · تتمه ثانیه (تنزل)', input: L[5], output: L[10], note: 'تنزل یک پله از تتمه اولی' });

      L[11] = haroofQuwa(L[7] + L[8]);
      steps.push({ id: 'l11', title: 'سطر ۱۱ · حروف قوا', input: L[7] + ' | ' + L[8], output: L[11], note: 'لقط ۴تایی از نسبت‌ها' });

      L[12] = mapNazira(L[11]);
      steps.push({ id: 'l12', title: 'سطر ۱۲ · نظیره قوا', input: L[11], output: L[12], note: 'نظیره حروف قوا' });

      L[13] = takseerSadrMuakhkhar(mazj(L[11], L[12]));
      steps.push({ id: 'l13', title: 'سطر ۱۳ · تکسیر قوا', input: mazj(L[11], L[12]), output: L[13], note: 'مزج قوا+نظیره سپس صدر/مؤخر' });

      L[14] = takhlisOdd(L[13]);
      steps.push({ id: 'l14', title: 'سطر ۱۴ · تخلیص', input: L[13], output: L[14], note: 'حروف فرد' });

      L[15] = takhlisLaqt(L[14], 2);
      steps.push({
        id: 'l15',
        title: 'سطر ۱۵ · جواب / مستحصله',
        input: L[14],
        output: L[15],
        note: 'لقط گام ۲ روی تخلیص؛ سطر نهایی جواب. این زنجیره ۱۵ سطری تقریب کاربردی قابل‌ممیزی است.'
      });

      const mustehsila = L[15] || L[14] || L[13] || '';
      const methodLabel = opts.methodLabel || 'جفر ۱۵ سطری';
      return {
        ok: true,
        method: methodLabel,
        methodId: opts.methodId || 'fifteen_line',
        parts,
        asas,
        nazira: L[2],
        jamal: jamal.sum,
        madkhal: madkhal.value,
        madkhalSteps: madkhal.steps,
        mustehsila,
        mustehsilaUnique: uniqueLetters(mustehsila),
        letterCount: mustehsila.length,
        dotCount: countDots(mustehsila),
        steps,
        options: opts,
        normalize: fullNorm,
        extraEnabled,
        fifteenLines: L
      };
    }

    const naz = mapNazira(asas);
    steps.push({
      id: 'nazira',
      title: 'نظیره‌گیری',
      input: asas,
      output: naz,
      note: 'هر حرف با حرف روبه‌رو در جدول ۲×۱۴ دایره ابجد'
    });

    let work = asas;
    if (opts.mazjNazira) {
      work = mazj(asas, naz);
      steps.push({
        id: 'mazj',
        title: 'مزج اساس و نظیره',
        input: `اساس: ${asas} + نظیره: ${naz}`,
        output: work,
        note: 'درهم‌آمیزی حرف‌به‌حرف'
      });
    } else {
      work = asas + naz;
      steps.push({
        id: 'concat_nazira',
        title: 'الحاق اساس و نظیره',
        input: asas + ' | ' + naz,
        output: work,
        note: 'بدون مزج؛ الحاق پشت‌سرهم'
      });
    }

    if (opts.bastMode === 'bayyinat') {
      const before = work;
      work = bayyinat(work);
      steps.push({ id: 'bayyinat', title: 'بینات', input: before, output: work, note: 'نام ملفوظی بدون حرف اول' });
    } else if (opts.bastMode === 'malfuzi') {
      const before = work;
      work = bastMalfuzi(work);
      steps.push({ id: 'malfuzi', title: 'بسط ملفوظی', input: before, output: work, note: 'گسترش به نام کامل حرف' });
    } else if (opts.bastMode === 'zabarBayyinat') {
      const before = work;
      work = zabarBayyinat(work);
      steps.push({ id: 'zabar_bayyinat', title: 'زبر و بینات', input: before, output: work, note: 'نام کامل ملفوظی (زبر+بینات)' });
    }

    if (opts.removeDupAsas) {
      // حذف مکرر میانی اختیاری با همان سوییچ کلی برای سادگی MVP
    }

    const rounds = Math.max(1, Math.min(5, opts.takseerRounds | 0 || 1));
    for (let r = 1; r <= rounds; r++) {
      const before = work;
      work = opts.takseer === 'muakhkhar_sadr'
        ? takseerMuakhkharSadr(work)
        : takseerSadrMuakhkhar(work);
      steps.push({
        id: 'takseer_' + r,
        title: rounds > 1 ? `تکسیر (دور ${r})` : 'تکسیر',
        input: before,
        output: work,
        note: opts.takseer === 'muakhkhar_sadr' ? 'مؤخر و صدر تا زمام' : 'صدر و مؤخر تا زمام'
      });
    }

    let mustehsila = work;
    if (opts.takhlis === 'odd') {
      const before = work;
      mustehsila = takhlisOdd(work);
      steps.push({ id: 'takhlis', title: 'تخلیص (حروف فرد)', input: before, output: mustehsila, note: 'برداشتن حروف در جایگاه‌های ۱،۳،۵،…' });
    } else if (opts.takhlis === 'laqt2') {
      const before = work;
      mustehsila = takhlisLaqt(work, 2);
      steps.push({ id: 'takhlis', title: 'تخلیص (لقط گام ۲)', input: before, output: mustehsila, note: 'لقط منفصل با گام ۲' });
    } else if (opts.takhlis === 'laqt3') {
      const before = work;
      mustehsila = takhlisLaqt(work, 3);
      steps.push({ id: 'takhlis', title: 'تخلیص (لقط گام ۳)', input: before, output: mustehsila, note: 'لقط منفصل با گام ۳' });
    } else if (opts.takhlis === 'laqt4') {
      const before = work;
      mustehsila = takhlisLaqt(work, 4);
      steps.push({ id: 'takhlis', title: 'تخلیص (لقط گام ۴)', input: before, output: mustehsila, note: 'لقط منفصل با گام ۴' });
    } else {
      steps.push({ id: 'takhlis', title: 'تخلیص', input: work, output: mustehsila, note: 'بدون تخلیص اضافه؛ رشته پس از تکسیر همان مستحصله است' });
    }

    steps.push({
      id: 'mustehsila',
      title: 'مستحصله نهایی',
      input: work,
      output: mustehsila,
      note: `طول: ${mustehsila.length} | بدون تکرار: ${uniqueLetters(mustehsila)} | نقاط: ${countDots(mustehsila)}`
    });

    const methodLabel = opts.methodLabel || ('جفر کبیر · ' + describeOptions(opts));

    return {
      ok: true,
      method: methodLabel,
      methodId: opts.methodId || 'custom',
      parts,
      asas,
      nazira: naz,
      jamal: jamal.sum,
      madkhal: madkhal.value,
      madkhalSteps: madkhal.steps,
      mustehsila,
      mustehsilaUnique: uniqueLetters(mustehsila),
      letterCount: mustehsila.length,
      dotCount: countDots(mustehsila),
      steps,
      options: opts,
      normalize: fullNorm,
      extraEnabled
    };
  }

  function metaLines(meta) {
    const lines = [
      `- سائل: ${meta.sael || '—'}`,
      `- طالب: ${meta.taleb || '—'}`,
      `- مطلوب: ${meta.matloob || '—'}`,
      `- مدعا: ${meta.modda || '—'}`,
      `- سؤال: ${meta.soal || '—'}`
    ];
    if (meta.extraEnabled) {
      lines.push(`- فامیلی سائل: ${meta.saelFamily || '—'}`);
      lines.push(`- فامیلی طالب: ${meta.talebFamily || '—'}`);
      lines.push(`- فامیلی مطلوب: ${meta.matloobFamily || '—'}`);
      lines.push(`- تاریخ سؤال: ${meta.questionDate || '—'}`);
      lines.push(`- ساعت سؤال: ${meta.questionTime || '—'}`);
    }
    return lines;
  }

  function buildReport(result, meta) {
    if (!result.ok) return result.error;
    const lines = [];
    lines.push('گزارش محاسبات جفر');
    lines.push('====================');
    lines.push(`روش: ${result.method}`);
    lines.push(`دایره/جدول: ${result.options.table}`);
    lines.push(`تاریخ گزارش: ${meta.reportDate || new Date().toLocaleString('fa-IR')}`);
    lines.push('');
    lines.push('صورت مسئله:');
    lines.push(...metaLines(meta));
    lines.push('');
    lines.push('تنظیمات:');
    lines.push(`- حذف مکرر اساس: ${result.options.removeDupAsas ? 'بله' : 'خیر'}`);
    lines.push(`- مزج با نظیره: ${result.options.mazjNazira ? 'بله' : 'خیر'}`);
    lines.push(`- بسط: ${result.options.bastMode}`);
    lines.push(`- تکسیر: ${result.options.takseer} ×${result.options.takseerRounds}`);
    lines.push(`- تخلیص: ${result.options.takhlis}`);
    lines.push('');
    lines.push('مراحل:');
    result.steps.forEach((s, i) => {
      lines.push(`${i + 1}) ${s.title}`);
      lines.push(`   ورودی: ${s.input}`);
      lines.push(`   خروجی: ${s.output}`);
      if (s.note) lines.push(`   توضیح: ${s.note}`);
    });
    lines.push('');
    lines.push(`مستحصله: ${result.mustehsila}`);
    lines.push(`حروف بدون تکرار: ${result.mustehsilaUnique}`);
    lines.push(`جمع جمل اساس: ${result.jamal}`);
    lines.push(`مدخل: ${result.madkhal}`);
    return lines.join('\n');
  }

  /** تشخیص موضوع برای بانک واژگانی نطق */
  function extractChoiceOptions(soal) {
    const s = String(soal || '').trim();
    if (!s || !/بین/.test(s) || !/کدام|کدامین|کدوم/.test(s)) return [];
    const m = s.match(/بین\s+(.+?)\s+کدام/);
    if (!m) return [];
    let mid = m[1].replace(/مورد/g, ' ').replace(/\s+/g, ' ').trim();
    let parts = [];
    if (/،/.test(mid)) {
      parts = mid.split(/\s*،\s*|\s+و\s+/);
    } else {
      const byVa = mid.split(/\s+و\s+/).map((x) => x.trim()).filter(Boolean);
      if (byVa.length >= 3) {
        parts = byVa;
      } else if (byVa.length === 2) {
        const leftTokens = byVa[0].split(/\s+/).filter(Boolean);
        if (leftTokens.length >= 2) parts = leftTokens.concat([byVa[1]]);
        else parts = byVa;
      } else {
        parts = mid.split(/\s+/);
      }
    }
    return parts
      .map((p) => p.replace(/[؟?؟!.,،]/g, '').trim())
      .filter((p) => p.length >= 2)
      .filter((p, i, arr) => arr.indexOf(p) === i)
      .slice(0, 8);
  }

  function buildLetterBagFromString(str) {
    const bag = {};
    for (const ch of String(str || '')) bag[ch] = (bag[ch] || 0) + 1;
    return bag;
  }

  function coverageAgainst(option, sourceStr) {
    const norm = normalizeText(option);
    const bag = buildLetterBagFromString(sourceStr);
    const used = {};
    const missing = [];
    for (const ch of norm) {
      const have = bag[ch] || 0;
      const u = used[ch] || 0;
      if (u >= have) missing.push(ch);
      else used[ch] = u + 1;
    }
    const needed = norm.length;
    const okCount = needed - missing.length;
    return {
      option,
      norm,
      missing: removeDuplicatesKeepOrder(missing.join('')),
      ratio: needed ? okCount / needed : 0,
      complete: missing.length === 0,
      okCount,
      needed
    };
  }

  function scoreChoiceOptions(options, results, sharedUnique) {
    return (options || []).map((opt) => {
      const shared = coverageAgainst(opt, sharedUnique || '');
      const perMethod = (results || []).map((r, i) => {
        const c = coverageAgainst(opt, r.mustehsila || '');
        return {
          methodIndex: i + 1,
          method: r.method,
          ratio: c.ratio,
          complete: c.complete,
          missing: c.missing,
          norm: c.norm
        };
      });
      const avg = perMethod.length
        ? perMethod.reduce((a, x) => a + x.ratio, 0) / perMethod.length
        : 0;
      const completeCount = perMethod.filter((x) => x.complete).length;
      const score = Math.round(100 * (0.35 * shared.ratio + 0.65 * avg) + 8 * completeCount);
      return {
        option: opt,
        norm: shared.norm,
        shared,
        perMethod,
        avgRatio: avg,
        completeCount,
        score: Math.max(0, Math.min(100, score))
      };
    }).sort((a, b) => b.score - a.score);
  }

  /** عناصر حروف بنابر ترتیب ابجد (چرخ ۴تایی) */
  const ELEMENT_NAMES = ['آتش', 'باد', 'آب', 'خاک'];
  function letterElement(ch) {
    const i = indexOfLetter(ch);
    if (i < 0) return null;
    return ELEMENT_NAMES[i % 4];
  }

  function elementProfile(str) {
    const counts = { 'آتش': 0, 'باد': 0, 'آب': 0, 'خاک': 0 };
    for (const ch of String(str || '')) {
      const e = letterElement(ch);
      if (e) counts[e]++;
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    const dominant = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    return { counts, total, dominant, summary: ELEMENT_NAMES.map((e) => `${e}:${counts[e]}`).join(' ') };
  }

  function mapTarfa(ch) {
    const i = indexOfLetter(ch);
    if (i < 0) return ch;
    return ABJAD_ORDER[(i + 1) % 28];
  }

  function mapTanzil(ch) {
    const i = indexOfLetter(ch);
    if (i < 0) return ch;
    return ABJAD_ORDER[(i + 27) % 28];
  }

  function mapLetters(str, fn) {
    return [...String(str || '')].map(fn).join('');
  }

  function buildNatiqLayers(mustehsila) {
    const base = String(mustehsila || '');
    return {
      raw: base,
      unique: uniqueLetters(base),
      nazira: mapNazira(base),
      naziraUnique: uniqueLetters(mapNazira(base)),
      tarfa: mapLetters(base, mapTarfa),
      tarfaUnique: uniqueLetters(mapLetters(base, mapTarfa)),
      tanzil: mapLetters(base, mapTanzil),
      tanzilUnique: uniqueLetters(mapLetters(base, mapTanzil))
    };
  }

  const CORE_LEXICON = [
    'آری', 'خیر', 'بله', 'نیک', 'بد', 'صلح', 'فتح', 'نصر', 'صبر', 'تاخیر', 'موانع', 'میسر',
    'مفید', 'مضر', 'دوا', 'شفا', 'امن', 'خطر', 'سفر', 'مانع', 'وصول', 'قبول', 'رد',
    'سود', 'زیان', 'کامیاب', 'ناکام', 'نزدیک', 'دور', 'زود', 'دیر', 'قوی', 'ضعیف',
    'سیر', 'سماق', 'هل', 'زعفران', 'آویشن', 'نعناع', 'بابونه', 'دارچین', 'زنجبیل',
    'وفا', 'فنا', 'بقا', 'نور', 'سر', 'دل', 'جان', 'نام', 'کام', 'امید', 'مبهم'
  ];

  function slidingWindows(str, minLen, maxLen) {
    const s = String(str || '');
    const out = [];
    for (let len = minLen; len <= maxLen; len++) {
      for (let i = 0; i + len <= s.length; i++) out.push(s.slice(i, i + len));
    }
    return out;
  }

  function madkhalOfWord(word, table) {
    const sum = sumAbjad(normalizeText(word), table || 'kabir').sum;
    return reduceToUnits(sum).value;
  }

  function scoreCandidateAdvanced(word, ctx) {
    const source = ctx.source || '';
    const cov = coverageAgainst(word, source);
    const wordEl = elementProfile(normalizeText(word));
    const srcEl = ctx.sourceElements || elementProfile(source);
    const elementMatch = wordEl.dominant === srcEl.dominant ? 1 : 0;
    const wordMad = madkhalOfWord(word, ctx.table || 'kabir');
    const madMatch = wordMad === ctx.madkhal ? 1 : 0;
    const madClose = (wordMad % 3 === ctx.madkhal % 3) ? 0.5 : 0;
    const len = normalizeText(word).length;
    const lenBonus = len >= 2 && len <= 6 ? 1 : 0;
    const score = Math.round(
      100 * (0.55 * cov.ratio + 0.15 * elementMatch + 0.15 * (madMatch || madClose * 0.5) + 0.10 * lenBonus + 0.05 * (cov.complete ? 1 : 0))
    );
    return {
      word,
      norm: cov.norm,
      coverage: cov,
      element: wordEl.dominant,
      elementMatch: !!elementMatch,
      madkhal: wordMad,
      madMatch: wordMad === ctx.madkhal,
      score: Math.max(0, Math.min(100, score)),
      layer: ctx.layer || 'raw'
    };
  }

  function detectQuestionProfile(meta) {
    const text = [meta.modda, meta.soal].filter(Boolean).join(' ');
    const choices = extractChoiceOptions(meta.soal || '');
    if (choices.length >= 2) {
      return { id: 'choice', title: 'انتخابی (بین گزینه‌ها)', choices, outputHint: 'برنده بین گزینه‌ها' };
    }
    if (/آیا|میشود|می‌شود|خواهد|هست\s*یا|یا نه|مفید است|به صلاح/.test(text)) {
      return { id: 'yesno', title: 'بله / خیر', choices: ['آری', 'خیر'], outputHint: 'پاسخ قطبی: آری/خیر/مبهم' };
    }
    if (/کی\b|چه وقت|زمان|موعد|روز|ماه|سال/.test(text)) {
      return { id: 'timing', title: 'زمانی / وعده', choices: [], outputHint: 'زمان محتمل یا مبهم' };
    }
    if (/اسم|نام|کیست|چه کسی|چه چیزی/.test(text)) {
      return { id: 'name', title: 'نام‌یابی', choices: [], outputHint: 'نام مشخص یا نام استخراج نشد' };
    }
    return { id: 'general', title: 'عمومی', choices: [], outputHint: 'پاسخ کوتاه مشخص' };
  }

  function detectTopic(meta) {
    const text = [meta.modda, meta.soal].filter(Boolean).join(' ');
    const t = text.replace(/\s+/g, '');
    const choices = extractChoiceOptions(meta.soal || '');
    const profile = detectQuestionProfile(meta);

    if (profile.id === 'choice' || choices.length >= 2) {
      return { id: 'choice', title: 'انتخاب بین گزینه‌های خود سؤال', bank: choices, choices, isChoice: true, profile };
    }
    if (profile.id === 'yesno') {
      return { id: 'yesno', title: 'پاسخ بله/خیر', bank: ['آری', 'خیر', 'تاخیر', 'موانع', 'میسر', 'مبهم'], choices: ['آری', 'خیر'], isChoice: false, profile };
    }
    if (/چربی|تری\s*گلیس|کلسترول|قند خون/.test(t)) {
      return { id: 'herbal_lipid', title: 'گیاه مؤثر بر چربی/قند خون', bank: ['سیر', 'شنبلیله', 'سماق', 'زعفران', 'دارچین', 'زنجبیل', 'سیاه دانه', 'آویشن', 'هل'], choices: [], isChoice: false, profile };
    }
    if (/دارو|گیاه|دمنوش|اعصاب|آرام|ارام|طب|علاج|درمان/.test(t)) {
      return { id: 'herbal', title: 'نام گیاه / داروی گیاهی', bank: ['به لیمو', 'گل گاوزبان', 'اسطوخودوس', 'بابونه', 'بادرنجبویه', 'سنبل الطیب', 'چای سبز', 'نعناع', 'آویشن', 'گل محمدی', 'خاکشیر', 'شیرین بیان', 'زعفران', 'هل', 'دارچین', 'سیاه دانه', 'اسپند', 'گل بنفشه', 'سیر', 'شنبلیله', 'سماق'], choices: [], isChoice: false, profile };
    }
    if (/ازدواج|همسر|زن|شوهر|نامزد|عقد/.test(t)) {
      return { id: 'marriage', title: 'وضعیت ازدواج / نتیجه پیوند', bank: ['صلح', 'وصول', 'تاخیر', 'موانع', 'میسر', 'ناممکن', 'خیر', 'شر'], choices: [], isChoice: false, profile };
    }
    if (/سفر|رفتن|مقصد|مسافرت/.test(t)) {
      return { id: 'travel', title: 'نتیجه سفر / مقصد', bank: ['رفتن', 'نرفتن', 'تاخیر', 'خیر', 'خطر', 'امن', 'بازگشت'], choices: [], isChoice: false, profile };
    }
    if (/کار|شغل|استخدام|پول|سود|معامله|خرید|فروش/.test(t)) {
      return { id: 'work', title: 'نتیجه کار / معامله', bank: ['سود', 'زیان', 'تاخیر', 'موفق', 'ناموفق', 'صبر', 'حرکت'], choices: [], isChoice: false, profile };
    }
    if (profile.id === 'name' || /اسم|نام|کیست|چه کسی/.test(t)) {
      return { id: 'name', title: 'استخراج نام', bank: [], choices: [], isChoice: false, profile };
    }
    return { id: 'general', title: 'پاسخ کوتاه و مشخص', bank: ['خیر', 'آری', 'تاخیر', 'صبر', 'موانع', 'میسر', 'مبهم'], choices: [], isChoice: false, profile };
  }

  function buildInternalDictionary(mustehsila, meta, options) {
    const layers = buildNatiqLayers(mustehsila);
    const topic = detectTopic(meta || {});
    const profile = topic.profile || detectQuestionProfile(meta || {});
    const bank = (topic.bank || []).concat(CORE_LEXICON);
    const sources = [
      { layer: 'خام', str: layers.raw },
      { layer: 'نظیره', str: layers.nazira },
      { layer: 'ترفع', str: layers.tarfa },
      { layer: 'تنزل', str: layers.tanzil }
    ];
    const seen = new Set();
    const ranked = [];
    function consider(word, layer, source) {
      const norm = normalizeText(word);
      if (norm.length < 2 || norm.length > 8) return;
      const key = layer + ':' + norm;
      if (seen.has(key)) return;
      seen.add(key);
      const item = scoreCandidateAdvanced(word, {
        source,
        sourceElements: elementProfile(source),
        madkhal: options && options.madkhal != null ? options.madkhal : 0,
        table: (options && options.table) || 'kabir',
        layer
      });
      if (item.coverage.ratio >= 0.6) ranked.push(item);
    }
    sources.forEach((src) => {
      bank.forEach((w) => consider(w, src.layer, src.str));
      slidingWindows(uniqueLetters(src.str), 2, 5).slice(0, 60).forEach((w) => consider(w, src.layer + '-پنجره', src.str));
    });
    ranked.sort((a, b) => {
      const aBank = topic.bank.indexOf(a.word) >= 0 || topic.bank.indexOf(a.norm) >= 0 ? 1 : 0;
      const bBank = topic.bank.indexOf(b.word) >= 0 || topic.bank.indexOf(b.norm) >= 0 ? 1 : 0;
      if (bBank !== aBank) return bBank - aBank;
      return b.score - a.score;
    });
    const top = [];
    const seenNorm = new Set();
    for (const item of ranked) {
      if (seenNorm.has(item.norm)) continue;
      seenNorm.add(item.norm);
      top.push(item);
      if (top.length >= 24) break;
    }
    return { profile, topic, layers, sourceElements: elementProfile(layers.raw), candidates: top };
  }

  function formatNatiqAssistBlock(dict, madkhal) {
    if (!dict) return [];
    const lines = [];
    lines.push('## پروفایل سؤال');
    lines.push(`- نوع: ${dict.profile.title} (${dict.profile.id})`);
    lines.push(`- قالب خروجی مطلوب: ${dict.profile.outputHint}`);
    lines.push(`- مدخل اساس: ${madkhal}`);
    lines.push(`- عناصر مستحصله: ${dict.sourceElements.summary} | غالب: ${dict.sourceElements.dominant}`);
    lines.push('');
    lines.push('## لایه‌های ناطق‌سازی (قبل از AI)');
    lines.push(`- خام/unique: ${dict.layers.unique}`);
    lines.push(`- نظیره/unique: ${dict.layers.naziraUnique}`);
    lines.push(`- ترفع/unique: ${dict.layers.tarfaUnique}`);
    lines.push(`- تنزل/unique: ${dict.layers.tanzilUnique}`);
    lines.push('');
    lines.push('## دیکشنری داخلی کاندیدها (فقط از این‌ها رتبه‌بندی کن؛ کلمهٔ جدید نساز)');
    if (!dict.candidates.length) lines.push('کاندید داخلی کافی یافت نشد.');
    else {
      dict.candidates.forEach((c, i) => {
        lines.push(`${i + 1}) ${c.word} | لایه:${c.layer} | پوشش:${Math.round(c.coverage.ratio * 100)}%${c.coverage.complete ? '✓' : (' کم=' + c.coverage.missing)} | عنصر:${c.element}${c.elementMatch ? '✓' : ''} | مدخل‌کلمه:${c.madkhal}${c.madMatch ? '✓هم‌مدخل' : ''} | امتیاز:${c.score}`);
      });
    }
    lines.push('اگر کاندیدی خارج از این دیکشنری گفتی، فقط با برچسب «خارج‌از‌دیکشنری» و پوشش کامل مجاز است.');
    return lines;
  }

  function enhanceChoiceScores(ranked, results, meta) {
    const questionEl = elementProfile(normalizeText([meta.modda, meta.soal].filter(Boolean).join('')));
    const primaryMad = results && results[0] ? results[0].madkhal : 0;
    return (ranked || []).map((row) => {
      const el = elementProfile(row.norm || '');
      const wordMad = madkhalOfWord(row.option, 'kabir');
      const elementBonus = el.dominant === questionEl.dominant ? 6 : 0;
      const madBonus = wordMad === primaryMad ? 8 : (wordMad % 3 === primaryMad % 3 ? 3 : 0);
      const score = Math.max(0, Math.min(100, row.score + elementBonus + madBonus));
      return Object.assign({}, row, { score, element: el.dominant, elementMatch: el.dominant === questionEl.dominant, wordMadkhal: wordMad, madMatch: wordMad === primaryMad });
    }).sort((a, b) => b.score - a.score);
  }

  function letterBag(str) {
    const bag = {};
    for (const ch of String(str || '')) bag[ch] = (bag[ch] || 0) + 1;
    return Object.keys(bag).sort().map((ch) => `${ch}:${bag[ch]}`).join(' ');
  }

  function formatChoiceScoreTable(ranked) {
    if (!ranked || !ranked.length) return [];
    const lines = ['## جدول پوشش از پیش‌محاسبه‌شده گزینه‌های سؤال (اصلی‌ترین معیار)'];
    ranked.forEach((row, idx) => {
      const methodBits = row.perMethod.map((m) => `روش${m.methodIndex}:${Math.round(m.ratio * 100)}%${m.complete ? '✓' : (' کم=' + (m.missing || '—'))}`).join(' | ');
      lines.push(`${idx + 1}) ${row.option} (نرمال:${row.norm || '—'}) | امتیازکل:${row.score} | مشترک:${Math.round(row.shared.ratio * 100)}%${row.shared.complete ? '✓' : (' کم=' + (row.shared.missing || '—'))} | میانگین‌روش‌ها:${Math.round(row.avgRatio * 100)}% | کامل در ${row.completeCount} روش` + (row.element ? ` | عنصر:${row.element}${row.elementMatch ? '✓' : ''}` : '') + (row.wordMadkhal != null ? ` | مدخل‌گزینه:${row.wordMadkhal}${row.madMatch ? '✓' : ''}` : ''));
      lines.push(`   جزئیات: ${methodBits}`);
    });
    lines.push('برندهٔ پوشش حروف را بر اساس همین جدول انتخاب کن؛ واژه‌سازی آزاد از حروف مشترک ممنوع است مگر هیچ گزینه‌ای پوشش قابل‌قبول نداشته باشد.');
    return lines;
  }

  function natqRulesBlock(meta, opts) {
    const topic = detectTopic(meta);
    const profile = topic.profile || detectQuestionProfile(meta);
    const isChoice = !!topic.isChoice || profile.id === 'choice';
    const isYesNo = profile.id === 'yesno';
    const isNameQuest = !isChoice && (profile.id === 'name' || topic.id === 'herbal' || topic.id === 'herbal_lipid' || /اسم|نام/.test((meta.soal || '') + (meta.modda || '')));
    const lines = [
      '## قواعد سخت نطق (اجباری)',
      '1) فقط از حروف مجاز همان بخش / دیکشنری داخلی استفاده کن؛ هیچ حرف جدیدی اضافه نکن.',
      '2) اولویت با پوشش حروف + هم‌عنصری + هم‌مدخل است، نه زیبایی جمله.',
      '3) مدعا فقط قطب‌نمای موضوع است؛ خودِ کلمهٔ مدعا را بازتاب نده مگر حروف مجبور کند.',
      '4) برای هر کاندید «نطق معکوس» انجام بده.',
      '5) اگر پوشش ناقص بود، درصد و حروف کم‌آمده را بگو.',
      '6) چند خوانش با امتیاز بده؛ ادعای قطعی نکن.',
      '7) خروجی فارسی باشد.',
      `8) پروفایل این سؤال: ${profile.title}. قالب نهایی: ${profile.outputHint}.`
    ];
    if (isChoice) {
      lines.push('9) بانک اصلی فقط گزینه‌های سؤال است.');
      lines.push('10) ساخت واژه‌های بی‌ربط از حروف مشترک به‌عنوان جواب اصلی ممنوع است.');
      lines.push('11) عنصر و مدخل گزینه را در امتیاز دخالت بده.');
      lines.push('12) خروجی: «برنده بین گزینه‌ها: X» یا مبهم.');
    } else if (isYesNo) {
      lines.push('9) اول بین آری/خیر/مبهم تصمیم بگیر؛ دلیل از مدخل و عنصر و دیکشنری داخلی.');
      lines.push('10) اگر مثبت/منفی نزدیک بودند، مبهم اعلام کن.');
    } else if (isNameQuest) {
      lines.push('9) اولویت با نام ۲ تا ۶ حرفی از دیکشنری داخلی.');
      lines.push('10) اگر نام مشخص نبود: «نام استخراج نشد».');
    }
    if (opts && opts.multi && !isChoice) lines.push('11) لایه A از حروف مشترک، لایه B از هر روش؛ کاندید قوی باید با دیکشنری داخلی هم‌پوشانی داشته باشد.');
    if (opts && opts.multi && isChoice) lines.push('13) همگرایی = پوشش بهتر گزینه در روش‌های بیشتر.');
    lines.push('');
    lines.push(`## موضوع تشخیص‌داده‌شده: ${topic.title}`);
    if (topic.bank.length) {
      lines.push(isChoice ? '## گزینه‌های خود سؤال (تنها بانک اصلی)' : '## بانک واژگانی پیشنهادی');
      lines.push(topic.bank.join('، '));
      if (!isChoice) lines.push('خارج از دیکشنری فقط با برچسب «خارج‌از‌دیکشنری» و پوشش کامل.');
    }
    lines.push('');
    lines.push('## فرمت خروجی اجباری');
    if (isChoice) {
      lines.push('برای هر گزینه: پوشش مشترک / پوشش روش‌ها / عنصر / مدخل / امتیاز');
      lines.push('پایان: برنده بین گزینه‌ها + قطعی یا فقط محتمل‌تر');
    } else if (isYesNo) {
      lines.push('پاسخ قطبی + ۲ دلیل حرفی/عنصری/مدخل + کاندیدهای پشتیبان از دیکشنری داخلی');
    } else {
      lines.push('کاندید | منبع‌لایه | پوشش | عنصر | مدخل | امتیاز | اطمینان');
      lines.push('پایان: بهترین کاندید معتبر از دیکشنری داخلی');
    }
    return { topic, profile, lines, isChoice, isYesNo };
  }

  function stripExtraInput(input) {
    return Object.assign({}, input, {
      extraEnabled: false,
      saelFamily: '',
      talebFamily: '',
      matloobFamily: '',
      questionDate: '',
      questionTime: ''
    });
  }

  function hasExtraData(input) {
    return !!(input && input.extraEnabled && (
      input.saelFamily || input.talebFamily || input.matloobFamily || input.questionDate || input.questionTime
    ));
  }

  function analyzeStabilityForResult(input, options, meta) {
    const withExtra = runClassic(Object.assign({}, input, { options: options || {} }));
    const without = runClassic(Object.assign({}, stripExtraInput(input), { options: options || {} }));
    if (!withExtra.ok || !without.ok) {
      return { ok: false, applicable: hasExtraData(input), withExtra, without, stable: [], note: 'پایداری قابل محاسبه نبود' };
    }
    const topic = detectTopic(meta || {});
    if (topic.isChoice) {
      const a = enhanceChoiceScores(scoreChoiceOptions(topic.choices, [withExtra], withExtra.mustehsilaUnique), [withExtra], meta);
      const b = enhanceChoiceScores(scoreChoiceOptions(topic.choices, [without], without.mustehsilaUnique), [without], meta);
      const mapB = {};
      b.forEach((x) => { mapB[x.norm || normalizeText(x.option)] = x; });
      const stable = a.map((x) => {
        const key = x.norm || normalizeText(x.option);
        const other = mapB[key];
        return {
          word: x.option,
          norm: key,
          scoreWith: x.score,
          scoreWithout: other ? other.score : 0,
          stable: !!(other && other.score >= 40 && x.score >= 40),
          rankWith: a.indexOf(x) + 1,
          rankWithout: other ? (b.findIndex((y) => (y.norm || normalizeText(y.option)) === key) + 1) : null
        };
      }).filter((x) => x.stable).sort((p, q) => ((q.scoreWith + q.scoreWithout) - (p.scoreWith + p.scoreWithout)));
      const winnerSame = a[0] && b[0] && normalizeText(a[0].option) === normalizeText(b[0].option);
      return {
        ok: true,
        applicable: hasExtraData(input),
        mode: 'choice',
        withExtra,
        without,
        rankedWith: a,
        rankedWithout: b,
        stable,
        winnerSame,
        note: winnerSame ? ('برنده یکسان با/بدون تکمیلی: ' + a[0].option) : 'برنده با/بدون تکمیلی متفاوت است؛ محتاط باش'
      };
    }

    const dictA = buildInternalDictionary(withExtra.mustehsila, meta, { madkhal: withExtra.madkhal, table: (options && options.table) || 'kabir' });
    const dictB = buildInternalDictionary(without.mustehsila, meta, { madkhal: without.madkhal, table: (options && options.table) || 'kabir' });
    const mapB = {};
    dictB.candidates.forEach((c) => { mapB[c.norm] = c; });
    const stable = dictA.candidates.map((c) => {
      const other = mapB[c.norm];
      if (!other) return null;
      return {
        word: c.word,
        norm: c.norm,
        scoreWith: c.score,
        scoreWithout: other.score,
        stable: true,
        layerWith: c.layer,
        layerWithout: other.layer
      };
    }).filter(Boolean).sort((p, q) => ((q.scoreWith + q.scoreWithout) - (p.scoreWith + p.scoreWithout)));

    return {
      ok: true,
      applicable: hasExtraData(input),
      mode: 'dict',
      withExtra,
      without,
      dictWith: dictA,
      dictWithout: dictB,
      stable,
      note: stable.length ? (stable.length + ' کاندید پایدار') : 'کاندید پایدار مشترک یافت نشد'
    };
  }

  function analyzeStabilityForMulti(input, presetIds, baseOptions, meta) {
    const withExtra = runMany(input, presetIds, baseOptions);
    const without = runMany(stripExtraInput(input), presetIds, baseOptions);
    if (!withExtra.ok || !without.ok) {
      return { ok: false, applicable: hasExtraData(input), withExtra, without, stable: [], note: 'پایداری چندروش قابل محاسبه نبود' };
    }
    const topic = detectTopic(meta || {});
    if (topic.isChoice) {
      const a = enhanceChoiceScores(scoreChoiceOptions(topic.choices, withExtra.results, withExtra.sharedUnique), withExtra.results, meta);
      const b = enhanceChoiceScores(scoreChoiceOptions(topic.choices, without.results, without.sharedUnique), without.results, meta);
      const mapB = {};
      b.forEach((x) => { mapB[x.norm || normalizeText(x.option)] = x; });
      const stable = a.map((x) => {
        const key = x.norm || normalizeText(x.option);
        const other = mapB[key];
        return {
          word: x.option,
          norm: key,
          scoreWith: x.score,
          scoreWithout: other ? other.score : 0,
          stable: !!(other && other.score >= 40 && x.score >= 40),
          rankWith: a.indexOf(x) + 1,
          rankWithout: other ? (b.findIndex((y) => (y.norm || normalizeText(y.option)) === key) + 1) : null
        };
      }).filter((x) => x.stable).sort((p, q) => ((q.scoreWith + q.scoreWithout) - (p.scoreWith + p.scoreWithout)));
      const winnerSame = a[0] && b[0] && normalizeText(a[0].option) === normalizeText(b[0].option);
      return {
        ok: true,
        applicable: hasExtraData(input),
        mode: 'choice',
        withExtra,
        without,
        rankedWith: a,
        rankedWithout: b,
        stable,
        winnerSame,
        note: winnerSame ? ('برنده پایدار: ' + a[0].option) : 'برنده با/بدون تکمیلی متفاوت است'
      };
    }

    const dictA = buildInternalDictionary(withExtra.primary.mustehsila, meta, { madkhal: withExtra.primary.madkhal, table: (baseOptions && baseOptions.table) || 'kabir' });
    const dictB = buildInternalDictionary(without.primary.mustehsila, meta, { madkhal: without.primary.madkhal, table: (baseOptions && baseOptions.table) || 'kabir' });
    const sharedA = buildInternalDictionary(withExtra.sharedUnique, meta, { madkhal: withExtra.primary.madkhal, table: (baseOptions && baseOptions.table) || 'kabir' });
    const sharedB = buildInternalDictionary(without.sharedUnique, meta, { madkhal: without.primary.madkhal, table: (baseOptions && baseOptions.table) || 'kabir' });
    const setA = {};
    dictA.candidates.concat(sharedA.candidates).forEach((c) => { setA[c.norm] = c; });
    const setB = {};
    dictB.candidates.concat(sharedB.candidates).forEach((c) => { setB[c.norm] = c; });
    const stable = Object.keys(setA).map((norm) => {
      if (!setB[norm]) return null;
      return {
        word: setA[norm].word,
        norm,
        scoreWith: setA[norm].score,
        scoreWithout: setB[norm].score,
        stable: true
      };
    }).filter(Boolean).sort((p, q) => ((q.scoreWith + q.scoreWithout) - (p.scoreWith + p.scoreWithout)));

    return {
      ok: true,
      applicable: hasExtraData(input),
      mode: 'dict',
      withExtra,
      without,
      stable,
      note: stable.length ? (stable.length + ' کاندید پایدار چندروش') : 'کاندید پایدار مشترک یافت نشد'
    };
  }

  function formatStabilityBlock(stability) {
    const lines = ['## پایداری با/بدون اطلاعات تکمیلی'];
    if (!stability) {
      lines.push('تحلیل پایداری در دسترس نیست.');
      return lines;
    }
    if (!stability.applicable) {
      lines.push('اطلاعات تکمیلی فعال نیست؛ برای تحلیل پایداری فامیلی/تاریخ/ساعت را روشن کن.');
      return lines;
    }
    if (!stability.ok) {
      lines.push(stability.note || 'ناموفق');
      return lines;
    }
    lines.push(`- وضعیت: ${stability.note}`);
    if (stability.withExtra && stability.withExtra.mustehsila) {
      lines.push(`- مستحصله با تکمیلی: ${stability.withExtra.mustehsilaUnique || uniqueLetters(stability.withExtra.mustehsila)}`);
      lines.push(`- مستحصله بدون تکمیلی: ${stability.without.mustehsilaUnique || uniqueLetters(stability.without.mustehsila)}`);
    } else if (stability.withExtra && stability.withExtra.primary) {
      lines.push(`- مستحصله روش۱ با تکمیلی: ${stability.withExtra.primary.mustehsilaUnique}`);
      lines.push(`- مستحصله روش۱ بدون تکمیلی: ${stability.without.primary.mustehsilaUnique}`);
      lines.push(`- حروف مشترک با تکمیلی: ${stability.withExtra.sharedUnique || '—'}`);
      lines.push(`- حروف مشترک بدون تکمیلی: ${stability.without.sharedUnique || '—'}`);
    }
    if (stability.stable && stability.stable.length) {
      lines.push('- کاندیدهای پایدار (اولویت خیلی بالا):');
      stability.stable.slice(0, 12).forEach((s, i) => {
        lines.push(`  ${i + 1}) ${s.word} | با=${s.scoreWith} بدون=${s.scoreWithout}` + (s.rankWith ? ` | رتبه با/بدون=${s.rankWith}/${s.rankWithout}` : ''));
      });
    } else {
      lines.push('- کاندید پایدار مشترک نیست؛ جواب را مبهم/محتاط اعلام کن.');
    }
    lines.push('قانون: کاندید ناپایدار را به‌عنوان خوانش غالب انتخاب نکن مگر همه پایدارها ضعیف باشند.');
    return lines;
  }

  function buildJudgePrompt(meta, contextLines, generatorAnswer) {
    const pasted = String(generatorAnswer || '').trim();
    const answerBlock = pasted
      ? pasted
      : '<<<PASTE_GENERATOR_ANSWER_HERE>>>';
    return [
      'تو داور سخت‌گیر نطق جفر هستی.',
      'وظیفه تو فقط رد/قبول کاندیدهای مولّد است. کاندید جدید نساز.',
      '',
      '## صورت مسئله',
      ...metaLines(meta),
      '',
      '## شواهد محاسباتی و دیکشنری',
      ...contextLines,
      '',
      '## پاسخ مولّد',
      answerBlock,
      '',
      '## قواعد داوری (اجباری)',
      '1) فقط روی کاندیدهایی که مولّد نوشته داوری کن.',
      '2) هر کاندید: قبول / رد / مشروط',
      '3) رد کن اگر: حرف اضافه دارد، پوشش ضعیف است، ناپایدار است، بازتاب عین سؤال است، یا خارج از پروفایل سؤال است.',
      '4) اولویت قبول با کاندیدهای پایدار.',
      '5) حداکثر ۲ کاندید قبول‌شده نهایی بده.',
      '6) اگر هیچ‌کدام قبول نشد بگو: نتیجه معتبر استخراج نشد.',
      '7) ادعای قطعی پزشکی/غیب نکن.',
      '',
      '## فرمت خروجی داور',
      'برای هر کاندید مولّد:',
      '- کاندید:',
      '- حکم: قبول/رد/مشروط',
      '- دلیل کوتاه:',
      'پایان:',
      '- کاندیدهای قبول‌شده نهایی:',
      '- خوانش غالب نهایی:',
      '- سطح اطمینان: کم/متوسط/زیاد'
    ].join('\n');
  }

  function fillJudgePrompt(judgeTemplate, generatorAnswer) {
    const pasted = String(generatorAnswer || '').trim();
    if (!judgeTemplate) return '';
    if (!pasted) return judgeTemplate;
    if (judgeTemplate.includes('<<<PASTE_GENERATOR_ANSWER_HERE>>>')) {
      return judgeTemplate.replace('<<<PASTE_GENERATOR_ANSWER_HERE>>>', pasted);
    }
    // If template already has an answer section, replace from "## پاسخ مولّد" until next ## rules
    const startMark = '## پاسخ مولّد';
    const endMark = '## قواعد داوری';
    const i = judgeTemplate.indexOf(startMark);
    const j = judgeTemplate.indexOf(endMark);
    if (i >= 0 && j > i) {
      return judgeTemplate.slice(0, i) + startMark + '\n' + pasted + '\n\n' + judgeTemplate.slice(j);
    }
    return judgeTemplate + '\n\n## پاسخ مولّد (الصاق‌شده)\n' + pasted;
  }

  function buildNatqPrompt(result, meta, extras) {
    if (!result.ok) return result.error;
    const rules = natqRulesBlock(meta, { multi: false });
    let ranked = rules.isChoice ? scoreChoiceOptions(rules.topic.choices || rules.topic.bank, [result], result.mustehsilaUnique) : [];
    if (rules.isChoice) ranked = enhanceChoiceScores(ranked, [result], meta);
    const choiceLines = formatChoiceScoreTable(ranked);
    const dict = buildInternalDictionary(result.mustehsila, meta, { madkhal: result.madkhal, table: result.options.table });
    const assist = formatNatiqAssistBlock(dict, result.madkhal);
    const stability = extras && extras.stability;
    const stabilityLines = formatStabilityBlock(stability);
    const generator = [
      rules.isChoice ? 'تو مولّد نطق جفر هستی (حالت انتخاب بین گزینه‌ها).' : (rules.isYesNo ? 'تو مولّد نطق جفر هستی (حالت بله/خیر).' : 'تو مولّد نطق جفر هستی (سخت‌گیر + دیکشنری داخلی).'),
      'فقط کاندید بساز و رتبه‌بندی کن. داوری نهایی با پرامپت داور است.',
      'از دیکشنری داخلی، پایداری، لایه‌های ناطق، عنصر و مدخل پیروی کن؛ کلمهٔ آزاد نساز.',
      '', '## صورت مسئله', ...metaLines(meta), '',
      '## روش محاسباتی',
      `- قاعده: ${result.method}`, `- دایره/جدول: ${result.options.table}`, `- بسط: ${result.options.bastMode}`, `- تکسیر: ${result.options.takseer}`, `- تخلیص: ${result.options.takhlis}`, '',
      '## خروجی محاسبات',
      `- اساس: ${result.asas}`, `- نظیره: ${result.nazira}`, `- جمع جمل اساس: ${result.jamal}`, `- مدخل: ${result.madkhal}`,
      `- مستحصله کامل: ${result.mustehsila}`, `- شمارش حروف: ${letterBag(result.mustehsila)}`, `- حروف بدون تکرار: ${result.mustehsilaUnique}`, '',
      ...assist, '', ...stabilityLines, '', ...choiceLines, ...rules.lines, '', '## درخواست مولّد',
      ...(rules.isChoice ? ['1) فقط گزینه‌های سؤال را مقایسه کن.', '2) جدول پوشش + عنصر + مدخل + پایداری را مبنا بگیر.', '3) ۳ تا ۵ کاندید/رتبه بده نه قضاوت نهایی قطعی.', '4) کاندیدهای پایدار را علامت بزن.']
        : rules.isYesNo ? ['1) بین آری/خیر/مبهم کاندید بده.', '2) از دیکشنری و پایداری دلیل بیاور.', '3) ۲ تا ۴ کاندید پشتیبان ذکر کن.']
        : ['1) فقط از دیکشنری داخلی رتبه‌بندی کن.', '2) پایدارها را بالاتر بنویس.', '3) نطق معکوس + عنصر + مدخل را بنویس.', '4) ۳ تا ۶ کاندید بده؛ قضاوت نهایی را به داور واگذار کن.'])
    ].join('\n');

    const judgeContext = [
      ...assist,
      '',
      ...stabilityLines,
      '',
      `- مستحصله: ${result.mustehsila}`,
      `- بدون تکرار: ${result.mustehsilaUnique}`,
      `- مدخل: ${result.madkhal}`
    ];
    const judge = buildJudgePrompt(meta, judgeContext);
    return { generator, judge, prompt: generator, stability, dict, ranked };
  }

  function sharedLetters(results) {
    if (!results.length) return '';
    let set = new Set(results[0].mustehsilaUnique || '');
    for (let i = 1; i < results.length; i++) {
      const next = new Set(results[i].mustehsilaUnique || '');
      set = new Set([...set].filter((ch) => next.has(ch)));
    }
    return [...set].join('');
  }

  function runMany(input, presetIds, baseOptions) {
    const ids = (presetIds || []).filter(Boolean);
    const presets = METHOD_PRESETS.filter((p) => ids.includes(p.id));
    if (!presets.length) return { ok: false, error: 'حداقل یک روش را انتخاب کنید.', results: [] };
    const results = presets.map((p) => {
      const options = Object.assign({}, baseOptions || {}, p.options, { methodId: p.id, methodLabel: p.label });
      return runClassic(Object.assign({}, input, { options }));
    });
    const okResults = results.filter((r) => r.ok);
    if (!okResults.length) return { ok: false, error: results[0] && results[0].error ? results[0].error : 'محاسبه ناموفق بود', results };
    return { ok: true, multi: true, results: okResults, primary: okResults[0], sharedUnique: sharedLetters(okResults) };
  }

  function buildMultiReport(bundle, meta) {
    if (!bundle.ok) return bundle.error;
    const lines = ['گزارش مقایسه‌ای چندروش جفر', '==============================', `تاریخ گزارش: ${meta.reportDate || new Date().toLocaleString('fa-IR')}`, '', 'صورت مسئله:', ...metaLines(meta), '', 'خلاصه مستحصله‌ها:'];
    bundle.results.forEach((r, i) => {
      lines.push(`${i + 1}) ${r.method}`);
      lines.push(`   مستحصله: ${r.mustehsila}`);
      lines.push(`   بدون تکرار: ${r.mustehsilaUnique}`);
      lines.push(`   جمل: ${r.jamal} | مدخل: ${r.madkhal}`);
    });
    lines.push('', `حروف مشترک (بدون تکرار): ${bundle.sharedUnique || '—'}`, '');
    bundle.results.forEach((r, i) => {
      lines.push('--------------------------------', `جزئیات روش ${i + 1}: ${r.method}`, buildReport(r, meta));
    });
    return lines.join('\n');
  }

  function buildMultiNatqPrompt(bundle, meta, extras) {
    if (!bundle.ok) return bundle.error;
    const rules = natqRulesBlock(meta, { multi: true });
    let ranked = rules.isChoice ? scoreChoiceOptions(rules.topic.choices || rules.topic.bank, bundle.results, bundle.sharedUnique) : [];
    if (rules.isChoice) ranked = enhanceChoiceScores(ranked, bundle.results, meta);
    const choiceLines = formatChoiceScoreTable(ranked);
    const dict = buildInternalDictionary(bundle.primary.mustehsila, meta, { madkhal: bundle.primary.madkhal, table: bundle.primary.options.table });
    const sharedDict = buildInternalDictionary(bundle.sharedUnique, meta, { madkhal: bundle.primary.madkhal, table: bundle.primary.options.table });
    const merged = { profile: dict.profile, topic: dict.topic, layers: dict.layers, sourceElements: dict.sourceElements, candidates: [] };
    const seen = new Set();
    dict.candidates.concat(sharedDict.candidates).forEach((c) => {
      if (seen.has(c.norm)) return;
      seen.add(c.norm);
      merged.candidates.push(c);
    });
    merged.candidates = merged.candidates.sort((a, b) => b.score - a.score).slice(0, 28);
    const assist = formatNatiqAssistBlock(merged, bundle.primary.madkhal);
    const stability = extras && extras.stability;
    const stabilityLines = formatStabilityBlock(stability);
    const blocks = bundle.results.map((r, i) => [
      `### روش ${i + 1}: ${r.method}`, `- جدول: ${r.options.table}`, `- اساس: ${r.asas}`, `- جمل: ${r.jamal} | مدخل: ${r.madkhal}`,
      `- عناصر: ${elementProfile(r.mustehsila).summary}`, `- مستحصله کامل: ${r.mustehsila}`, `- شمارش حروف: ${letterBag(r.mustehsila)}`, `- بدون تکرار: ${r.mustehsilaUnique}`
    ].join('\n'));
    const generator = [
      rules.isChoice ? 'تو مولّد نطق جفر هستی (انتخابی · چندروش).' : 'تو مولّد نطق جفر هستی (چندروش + دیکشنری داخلی).',
      'فقط کاندید بساز. داوری نهایی با پرامپت داور است.',
      'از دیکشنری داخلی، پایداری، لایه‌های ناطق، عنصر و مدخل پیروی کن.',
      '', '## صورت مسئله', ...metaLines(meta), '', '## نتایج چندروش', ...blocks, '',
      '## لایه A — حروف مشترک همه روش‌ها',
      `- حروف مشترک: ${bundle.sharedUnique || '—'}`, `- شمارش: ${letterBag(bundle.sharedUnique || '')}`, `- عناصر مشترک: ${elementProfile(bundle.sharedUnique || '').summary}`,
      ...(bundle.results.length >= 6 ? ['نکته: تعداد روش‌ها زیاد است؛ برای انتخابی معیار اصلی میانگین پوشش گزینه‌هاست.'] : []),
      '', ...assist, '', ...stabilityLines, '', ...choiceLines, ...rules.lines, '', '## درخواست مولّد',
      ...(rules.isChoice
        ? ['1) جدول پوشش+عنصر+مدخل+پایداری گزینه‌ها را مبنا بگیر.', '2) رتبه‌بندی گزینه‌ها را بده.', '3) واژه‌های خارج از گزینه‌ها را جواب اصلی نکن.', '4) قضاوت نهایی قطعی را به داور واگذار کن.']
        : ['1) از دیکشنری داخلی و پایدارها شروع کن.', '2) لایه‌های نظیره/ترفع/تنزل را استفاده کن.', '3) جدول کاندید با پوشش/عنصر/مدخل/پایداری بده.', '4) ۳ تا ۶ کاندید بده؛ نهایی‌سازی با داور.'])
    ].join('\n');

    const judgeContext = [
      ...assist,
      '',
      ...stabilityLines,
      '',
      `- حروف مشترک: ${bundle.sharedUnique || '—'}`,
      `- مستحصله روش۱: ${bundle.primary.mustehsilaUnique}`,
      `- مدخل روش۱: ${bundle.primary.madkhal}`
    ];
    const judge = buildJudgePrompt(meta, judgeContext);
    return { generator, judge, prompt: generator, stability, dict: merged, ranked };
  }

  global.JafrEngine = {
    ABJAD_ORDER, ABJAD_KABIR, LETTER_NAMES, METHOD_PRESETS,
    normalizeText, normalizeDateTimeField, expandDigitsToWords,
    extractChoiceOptions, coverageAgainst, scoreChoiceOptions,
    detectTopic, detectQuestionProfile, letterElement, elementProfile,
    buildNatiqLayers, buildInternalDictionary, madkhalOfWord,
    analyzeStabilityForResult, analyzeStabilityForMulti, formatStabilityBlock, buildJudgePrompt, fillJudgePrompt,
    runClassic, runMany, buildReport, buildNatqPrompt, buildMultiReport, buildMultiNatqPrompt,
    describeOptions, sumAbjad, nazira, mapNazira, mapTarfa, mapTanzil, istintaqKabir, nisbatRow, haroofQuwa,
    takseerSadrMuakhkhar, takseerMuakhkharSadr, bastMalfuzi, bayyinat, takhlisLaqt
  };
})(typeof window !== 'undefined' ? window : globalThis);
