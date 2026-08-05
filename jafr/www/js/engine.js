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
    'ي': 'ی', 'ى': 'ی',
    'ك': 'ک', 'گ': 'ک',
    'چ': 'ج', 'پ': 'ب', 'ژ': 'ز'
  };

  /** هدف قفل نمونهٔ حرفه‌ای (اسکرین‌شات جنگ) */
  const JAMAL_LOCK_TARGET = {
    jamal: 5022,
    mizan: 10,
    saelJamal: 59,
    confirmedSael: 'مهدی',
    resolved: true
  };

  const TABLES = {
    kabir: ABJAD_KABIR,
    saghir: ABJAD_SAGHIR,
    wazie: ABJAD_WAZIE
  };

  function indexOfLetter(ch) {
    return ABJAD_ORDER.indexOf(ch);
  }

  /**
   * نرمال‌سازی حروف ابجدی
   * آ همیشه = ا = ۱ (قاعدهٔ کلاسیک)
   */
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

  /**
   * نوع سؤال از متون معتبر جفر (طوخى/شاد گیلانی، السر اللامع، مستحصلهٔ عسکریه):
   * - مرکزی: جواب ثابت با زمان → نام سائل لازم نیست
   * - محوری: جواب با زمان/شخص عوض می‌شود → سائل (+والدہ) و تاریخ لازم است
   * جنگِ زمان‌مند با سائل (مثل مهدی) محوری اصولی است؛ بدون سائل می‌تواند مرکزی/امور عامه باشد.
   */
  function classifyQuestionScope(meta) {
    const forced = meta && meta.questionScope;
    if (forced === 'markazi' || forced === 'mehvari') {
      return {
        id: forced,
        title: forced === 'markazi' ? 'مرکزی (امور عامه)' : 'محوری (زمان‌مند/شخصی)',
        saelRequired: forced === 'mehvari',
        classicNote: forced === 'markazi'
          ? 'در سؤال مرکزی نام سائل در اساس نمی‌آید (طوخى/شاد گیلانی).'
          : 'در سؤال محوری سائل (+والدہ) و تاریخ در اساس لازم است (السر اللامع).'
      };
    }
    const hasPerson = !!(meta && (meta.sael || meta.taleb || meta.matloob));
    const text = [meta && meta.soal, meta && meta.modda].filter(Boolean).join(' ');
    const isWarSample = /جنگ|نبرد|اسرائیل|اسراییل/.test(text);
    const publicAffairs = /جنگ|نبرد|اسرائیل|اسراییل|آمریکا|ایران|دولت|کشور|انتخابا?ت|اقتصاد/.test(text);
    if (publicAffairs && hasPerson) {
      return {
        id: 'mehvari',
        title: isWarSample ? 'محوری (جنگ زمان‌مند + سائل)' : 'محوری (امور عامه + سائل)',
        saelRequired: true,
        classicNote: isWarSample
          ? 'جنگ با سائل (مثل مهدی) محوری اصولی است؛ جمل/میزان از اساس کامل. قفل اسکرین: ۵۰۲۲/۱۰.'
          : 'امور عامه با سائل محوری است؛ جمل/میزان از اساس کامل (سائل+سؤال+تاریخ).'
      };
    }
    if (publicAffairs && !hasPerson) {
      return {
        id: 'markazi',
        title: 'مرکزی (امور عامه)',
        saelRequired: false,
        classicNote: isWarSample
          ? 'بدون سائل = امور عامه (عسکریه)؛ جمل نمونهٔ جنگ ≈ ۴۹۶۳ / میزان ۷.'
          : 'بدون سائل = امور عامه؛ نام سائل در اساس نمی‌آید.'
      };
    }
    if (hasPerson || /ازدواج|همسر|مریض|غائب|فرزند|من\b|برای من/.test(text)) {
      return {
        id: 'mehvari',
        title: 'محوری (شخصی)',
        saelRequired: true,
        classicNote: 'سؤال شخصی؛ کلاسیک سائل (+والدہ) و تاریخ می‌خواهد.'
      };
    }
    return {
      id: 'markazi',
      title: 'مرکزی (پیش‌فرض)',
      saelRequired: false,
      classicNote: 'بدون قرینهٔ شخصی، مرکزی فرض شد.'
    };
  }

  /**
   * قفل جمل نمونهٔ حرفه‌ای (۵۰۲۲ / میزان ۱۰) — بازشده
   *
   * راه حل تأییدشده:
   * سائل «مهدی» (جمل ۵۹) + سؤال جنگ کوتاه + تاریخ فارسی بلند
   * → اساس کامل جمل ۵۰۲۲ → میزان ۱۰ (محوری اصولی؛ السر اللامع / طوخى)
   *
   * بدون سائل (مرکزی/امور عامه): ۴۹۶۳ / ۷
   * آ=۶۰ غیرکلاسیک است و دیگر مسیر اصلی نیست.
   */
  function analyzeJamalLock(jamalSum, parts, opts) {
    const target = JAMAL_LOCK_TARGET;
    const table = (opts && opts.table) || 'kabir';
    const saelRaw = (parts && parts.sael) || '';
    const saelSum = sumAbjad(saelRaw, table).sum;
    const jamal = jamalSum | 0;
    const mizan = computeMizan(jamal, opts);
    const gap = target.jamal - jamal;
    const hits = [];
    const isMahdi = normalizeText(saelRaw) === 'مهدی' || normalizeText(saelRaw).indexOf('مهدی') >= 0;
    const soalText = [parts && parts.soal, parts && parts.modda].filter(Boolean).join(' ');
    const warLike = /جنگ|نبرد|اسرائیل|اسراییل|آمریکا\s*علیه|علیه\s*ایران/.test(soalText);
    const matched = jamal === target.jamal && mizan === target.mizan;
    /** قفل ۵۰۲۲ فقط برای نمونهٔ جنگ مرجع معنا دارد؛ روی ازدواج/سفر/… فشار نده */
    const relevant = matched || warLike || !!(opts && opts.forceJamalLock);
    if (matched) {
      hits.push('قفل ۵۰۲۲ / میزان ۱۰ بسته شد');
    }
    if (relevant && saelSum === target.saelJamal) {
      hits.push(isMahdi
        ? 'سائل مهدی (جمل ۵۹) — راه تأییدشدهٔ نمونهٔ حرفه‌ای'
        : 'سائل با جمل ۵۹ (مهدی/نواب) — شیوهٔ محوری');
    }
    if (relevant && gap === target.saelJamal && saelSum === 0) {
      hits.push('فاصلهٔ +۵۹: سائل مهدی (یا هر نام جمل ۵۹) را بیفزای');
    }
    const recipes = relevant ? [
      {
        id: 'sael_mahdi',
        title: 'سائل مهدی + سؤال جنگ + تاریخ فارسی',
        classic: true,
        resolved: true,
        note: 'راه بازشده: مهدی(۵۹) → ۵۰۲۲/۱۰؛ ستون‌ها فقط از سؤال (~۴۹). محوری اصولی.'
      },
      {
        id: 'sael59',
        title: 'هر سائل با جمل ۵۹ (مثل نواب)',
        classic: true,
        resolved: true,
        note: 'معادل عددی مهدی؛ همان قفل را می‌بندد.'
      },
      {
        id: 'alef60_nonclassic',
        title: 'شمارش آ=۶۰ (ردشده / غیرکلاسیک)',
        classic: false,
        resolved: false,
        note: 'در ابجد کبیر آ→ا=۱؛ با تأیید نام مهدی دیگر مسیر اصلی نیست.'
      }
    ] : [
      {
        id: 'general_scope',
        title: 'قفل ۵۰۲۲ مخصوص نمونهٔ جنگ است',
        classic: true,
        resolved: true,
        note: 'برای این سؤال همان جمل/میزان محاسبه‌شده معتبر است؛ دنبال ۵۰۲۲ نرو.'
      }
    ];
    const summary = matched
      ? `قفل جمل بسته شد (${target.jamal} → میزان ${target.mizan})` + (isMahdi ? ' · سائل مهدی' : '')
      : (relevant
        ? `فاصله تا قفل ${target.jamal}: ${gap > 0 ? '+' : ''}${gap} — راه بازشده: سائل مهدی (+تاریخ فارسی)`
        : `جمل ${jamal} → میزان ${mizan} (قفل ۵۰۲۲ فقط برای نمونهٔ جنگ مرجع است)`);
    return {
      targetJamal: target.jamal,
      targetMizan: target.mizan,
      jamal,
      mizan,
      gap,
      saelJamal: saelSum,
      matched,
      relevant,
      resolvedPath: relevant ? 'sael_mahdi' : 'general',
      hits,
      recipes,
      summary
    };
  }

  /**
   * جدول مستحصله برای نمایش فشرده (UI)
   * در کتب: مستحصله یک «سطر» است نه جدول ۴×۲۱ِ نام‌دار.
   * جداول ۴ردیفی در رسائل معمولاً جدول‌های تبدیلِ قاعده (lookup)اند.
   * اینجا حروف مستحصله/یکتا را در ۴ ردیف می‌چینیم تا با ویجت اسکرین هم‌خوان شود.
   */
  function buildMustehsilaGrid(letters, opts) {
    const src = String(letters || '');
    const cols = (opts && opts.cols > 0) ? (opts.cols | 0) : Math.max(1, Math.ceil(src.length / 4) || 1);
    const rows = [[], [], [], []];
    for (let i = 0; i < src.length; i++) {
      rows[i % 4].push(src[i]);
    }
    while (rows[0].length < cols) {
      for (let r = 0; r < 4; r++) {
        if (rows[r].length < cols) rows[r].push('');
      }
    }
    return {
      cols,
      rows: rows.map((cells, i) => ({ id: 'M' + (i + 1), title: 'مستحصله ' + (i + 1), cells })),
      source: src,
      classicNote: 'کلاسیک: سطر مستحصله؛ این شبکه فقط نمایش فشردهٔ همان حروف است.'
    };
  }

  function joinName(first, family, extraEnabled) {
    const a = String(first || '').trim();
    const b = extraEnabled ? String(family || '').trim() : '';
    return [a, b].filter(Boolean).join(' ');
  }

  /** میزان جدولی: باقیماندهٔ جمل بر دایرهٔ ابجد (۲۸)؛ نمونه: ۵۰۲۲ → ۱۰ */
  function computeMizan(jamalSum, opts) {
    if (opts && opts.mizanOverride > 0) return opts.mizanOverride | 0;
    const base = (opts && opts.mizanBase > 0) ? (opts.mizanBase | 0) : 28;
    const r = Math.abs(jamalSum | 0) % base;
    return r === 0 ? base : r;
  }

  /** جابه‌جایی روی دایرهٔ ۲۸حرفی ابجد */
  function shiftAbjad(str, delta) {
    const d = ((delta % 28) + 28) % 28;
    return [...String(str || '')].map((ch) => {
      const i = indexOfLetter(ch);
      if (i < 0) return ch;
      return ABJAD_ORDER[(i + d) % 28];
    }).join('');
  }

  /**
   * جدول ۹تایی مراتب (آحاد / عشرات / مآت) برای ترفع و مساوات کلاسیک
   * ستون مشترک = همان مرتبهٔ وضعی در ردیف‌های سه‌گانه
   */
  const GRID9 = [
    ['ا', 'ب', 'ج', 'د', 'ه', 'و', 'ز', 'ح', 'ط'],
    ['ی', 'ک', 'ل', 'م', 'ن', 'س', 'ع', 'ف', 'ص'],
    ['ق', 'ر', 'ش', 'ت', 'ث', 'خ', 'ذ', 'ض', 'ظ']
  ];

  function findGrid9Pos(ch) {
    if (ch === 'غ') return { r: 2, c: 8, special: true }; // کنار ظ
    for (let r = 0; r < 3; r++) {
      const c = GRID9[r].indexOf(ch);
      if (c >= 0) return { r, c, special: false };
    }
    return null;
  }

  /** ترقی: حرف بعدی در دایره ابجد */
  function applyTaraqi(str) {
    return shiftAbjad(str, 1);
  }

  /** تنزل دایره‌ای: حرف قبلی */
  function applyTanzilCircle(str) {
    return shiftAbjad(str, -1);
  }

  /** ترفع: حرف بالایی در جدول ۹تایی (همان ستون، یک ردیف بالاتر) */
  function applyTarfaGrid(str) {
    return [...String(str || '')].map((ch) => {
      const pos = findGrid9Pos(ch);
      if (!pos) return ch;
      if (pos.special) return 'ظ';
      if (pos.r === 0) return ch;
      return GRID9[pos.r - 1][pos.c];
    }).join('');
  }

  /** مساوات جدولی: حرف پایینی در جدول ۹تایی */
  function applyMusawatGrid(str) {
    return [...String(str || '')].map((ch) => {
      const pos = findGrid9Pos(ch);
      if (!pos) return ch;
      if (pos.special) return 'غ';
      if (pos.r >= 2) return ch === 'ظ' ? 'غ' : ch;
      return GRID9[pos.r + 1][pos.c];
    }).join('');
  }

  /**
   * لایه‌های جدول حروف سؤال
   * model:
   *  - quarter28 (پیش‌فرض): A+0 / B+7 / C+14 / D+21
   *  - tttm: مساوات(اساس) / ترقی(+۱) / ترفع(۹تایی) / تنزل(-۱) + نظیره هر کدام
   */
  function buildJadwalLayers(asas, model) {
    const mode = (model === 'tttm' || model === 'tarfa_tanzil') ? 'tttm' : 'quarter28';
    const base = String(asas || '');

    if (mode === 'tttm') {
      const A = base;                      // اساس / پایه مساوات
      const B = applyTaraqi(base);         // ترقی
      const C = applyTarfaGrid(base);      // ترفع جدول ۹تایی
      const D = applyTanzilCircle(base);   // تنزل
      const nA = mapNazira(A);
      const nB = mapNazira(B);
      const nC = mapNazira(C);
      const nD = mapNazira(D);
      const rows = [
        { id: 'A', title: 'مساوات / اساس (خام)', str: A },
        { id: 'nA', title: 'نظیره مساوات', str: nA },
        { id: 'B', title: 'ترقی (+۱ دایره)', str: B },
        { id: 'nB', title: 'نظیره ترقی', str: nB },
        { id: 'C', title: 'ترفع (جدول ۹تایی ↑)', str: C },
        { id: 'nC', title: 'نظیره ترفع', str: nC },
        { id: 'D', title: 'تنزل (−۱ دایره)', str: D },
        { id: 'nD', title: 'نظیره تنزل', str: nD }
      ];
      const poolABCD = A + B + C + D;
      return {
        A, nA, B, nB, C, nC, D, nD, rows, poolABCD,
        model: 'tttm',
        labels: { A: 'مساوات', B: 'ترقی', C: 'ترفع', D: 'تنزل' }
      };
    }

    const A = base;
    const B = shiftAbjad(A, 7);
    const C = shiftAbjad(A, 14);
    const D = shiftAbjad(A, 21);
    const nA = mapNazira(A);
    const nB = mapNazira(B);
    const nC = mapNazira(C);
    const nD = mapNazira(D);
    const rows = [
      { id: 'A', title: 'حروف A (خام · +۰)', str: A },
      { id: 'nA', title: 'نظیره A (+۱۴)', str: nA },
      { id: 'B', title: 'حروف B (ربع · +۷)', str: B },
      { id: 'nB', title: 'نظیره B (+۲۱)', str: nB },
      { id: 'C', title: 'حروف C (ربع · +۱۴)', str: C },
      { id: 'nC', title: 'نظیره C (+۰)', str: nC },
      { id: 'D', title: 'حروف D (ربع · +۲۱)', str: D },
      { id: 'nD', title: 'نظیره D (+۷)', str: nD }
    ];
    const poolABCD = A + B + C + D;
    return { A, nA, B, nB, C, nC, D, nD, rows, poolABCD, model: 'quarter28' };
  }

  /**
   * سطر انتخاب با کلید میزان روی ۴ ردیف A/B/C/D
   *
   * کلاسیکِ معتبر در کتب:
   * - میزان کلید سنجش حروف است (بدون آن مستحصله ناطق نمی‌شود)
   * - لقط: برداشتن هر Nاُم حرف (اینجا N=میزان) — هم‌خانوادهٔ تخلیص لقط
   * - ترفع/تنزل/ترقی/مساوات به‌عنوان دسته‌بندی حروف برای سنجش با میزان
   *
   * فرمول نرم‌افزاری ستون i → ردیف ((i×میزان)%4):
   * در رسائل نام‌دار به‌عنوان قاعدهٔ منقول یافت نشد؛ تقریب مهندسی UI جدولی است.
   */
  function selectJadwalRow(layers, mizan) {
    const abcd = [
      (layers && layers.A) || '',
      (layers && layers.B) || '',
      (layers && layers.C) || '',
      (layers && layers.D) || ''
    ];
    const ids = ['A', 'B', 'C', 'D'];
    const n = abcd[0].length;
    const M = Math.max(1, mizan | 0);
    let selected = '';
    const picks = [];
    for (let i = 0; i < n; i++) {
      const rowIdx = ((i + 1) * M) % 4;
      const ch = abcd[rowIdx][i] || '';
      selected += ch;
      picks.push({ col: i + 1, row: ids[rowIdx], ch });
    }
    let priority = selected;
    for (let i = 0; i < n; i++) {
      if ((i + 1) % M === 0) {
        for (let r = 0; r < 4; r++) priority += abcd[r][i] || '';
      }
    }
    return { selected, picks, priority };
  }

  /**
   * لقط میزانی کلاسیک: برداشتن حروفی که شمارهٔ ستون‌شان مضرب میزان است
   * (هم‌خانوادهٔ لقط اخباری «هر N حرف یکی»)
   */
  function extractByMizanStep(str, mizan) {
    const M = Math.max(1, mizan | 0);
    let out = '';
    for (let i = 0; i < str.length; i++) {
      if ((i + 1) % M === 0) out += str[i];
    }
    return out || str;
  }

  /** لقط کلاسیک از چند سطر (اساس + انتخاب + ABCD) */
  function buildClassicLaqtBundle(columnBase, layers, selected, mizan) {
    const M = Math.max(1, mizan | 0);
    const fromAsas = extractByMizanStep(columnBase, M);
    const fromSelected = extractByMizanStep(selected, M);
    const fromA = extractByMizanStep((layers && layers.A) || '', M);
    const fromB = extractByMizanStep((layers && layers.B) || '', M);
    const fromC = extractByMizanStep((layers && layers.C) || '', M);
    const fromD = extractByMizanStep((layers && layers.D) || '', M);
    const pooled = fromAsas + fromSelected + fromA + fromB + fromC + fromD;
    return {
      step: M,
      fromAsas,
      fromSelected,
      fromA,
      fromB,
      fromC,
      fromD,
      pooled,
      unique: uniqueLetters(pooled)
    };
  }

  /**
   * مسیر رنگ/هایلایت پس از نطق: جاروی چندبارهٔ چپ→راست روی سطرهای A–D
   * (قفل بازشده: رنگ فرمول استخراج نیست؛ خانه‌های مصرف‌شدهٔ جمله را نشان می‌دهد)
   */
  function planNatqHighlight(natqText, layers, opts) {
    const rowIds = ['A', 'B', 'C', 'D'];
    const rows = rowIds.map((id) => String((layers && layers[id]) || ''));
    const n = rows[0] ? rows[0].length : 0;
    const needle = normalizeText(natqText);
    const pool = rows.join('');
    const coverPool = coverageAgainst(needle, pool);
    if (!needle || !n) {
      return {
        ok: false,
        complete: false,
        mode: 'multiSweep',
        needle,
        matched: 0,
        sweeps: 0,
        picks: [],
        coverPool,
        summary: 'بدون متن نطق یا جدول'
      };
    }
    const maxSweeps = (opts && opts.maxSweeps > 0) ? (opts.maxSweeps | 0) : 12;
    let ti = 0;
    const picks = [];
    let sweep = 0;
    while (ti < needle.length && sweep < maxSweeps) {
      let progress = false;
      for (let c = 0; c < n && ti < needle.length; c++) {
        for (let r = 0; r < 4; r++) {
          if (rows[r][c] === needle[ti]) {
            picks.push({
              ch: needle[ti],
              row: rowIds[r],
              col: c + 1,
              sweep,
              index: c
            });
            ti++;
            progress = true;
            break;
          }
        }
      }
      if (!progress) break;
      sweep++;
    }
    const complete = ti === needle.length;
    return {
      ok: complete,
      complete,
      mode: 'multiSweep',
      needle,
      matched: ti,
      sweeps: sweep,
      picks,
      coverPool,
      summary: complete
        ? `مسیر رنگ کامل با ${sweep} جاروی چپ→راست روی A–D (${picks.length} خانه)`
        : `مسیر ناقص ${ti}/${needle.length} پس از ${sweep} جارو`
    };
  }

  /**
   * مدل باز قفل نطق (تحقیق + سؤال از جفر + تطبیق اسکرین):
   * نطق = جمله آزاد از مخزن چهار لایه؛ رنگ = جاروی چندباره بعد از نطق
   */
  function analyzeNatqLock(layers, opts) {
    const pool = (layers && layers.poolABCD) || (
      String((layers && layers.A) || '') +
      String((layers && layers.B) || '') +
      String((layers && layers.C) || '') +
      String((layers && layers.D) || '')
    );
    const rules = [
      'نطق یک‌خطی فقط از حروف مخزن A+B+C+D با ترتیب آزاد (نه اجبار ترتیب ستون)',
      'رنگ/هایلایت فرمول استخراج نیست؛ بعد از نطق با جاروی چندبارهٔ چپ→راست مشخص می‌شود',
      'لقط/سطر انتخاب تقریب کمکی است نه کلید قفل رنگ نرم‌افزار'
    ];
    const out = {
      unlocked: true,
      id: 'pool_free_order_plus_multisweep_highlight',
      title: 'قفل نطق باز',
      rules,
      poolUnique: uniqueLetters(pool),
      summary: 'قفل نطق باز: مخزن‌آزاد + رنگ پس‌از‌نطق (جاروی چندباره)',
      reference: null
    };
    const ref = opts && opts.referenceNatq ? String(opts.referenceNatq) : '';
    if (ref) {
      const normalized = normalizeText(ref);
      out.reference = {
        text: ref,
        normalized,
        poolCover: coverageAgainst(normalized, pool),
        highlight: planNatqHighlight(ref, layers, opts)
      };
      if (out.reference.highlight.complete && out.reference.poolCover.complete) {
        out.summary += ` · نمونه مرجع با ${out.reference.highlight.sweeps} جارو کامل شد`;
      }
    }
    return out;
  }

  /** پیش‌فرض‌های چندروش */
  const METHOD_PRESETS = [
    {
      id: 'jadwali_mizan',
      label: 'جفر جدولی میزان‌دار (ربع دایره A–D)',
      options: { pipeline: 'jadwali', table: 'kabir', natqStyle: 'sentence', jadwalModel: 'quarter28' }
    },
    {
      id: 'jadwali_tttm',
      label: 'جفر جدولی · ترفع/ترقی/تنزل/مساوات',
      options: { pipeline: 'jadwali', table: 'kabir', natqStyle: 'sentence', jadwalModel: 'tttm' }
    },
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
    if (opts && opts.pipeline === 'jadwali') {
      if (opts.jadwalModel === 'tttm' || opts.jadwalModel === 'tarfa_tanzil') {
        return 'جفر جدولی · ترفع/ترقی/تنزل/مساوات';
      }
      return 'جفر جدولی میزان‌دار (ربع دایره)';
    }
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
    // تاریخ همیشه اگر پر باشد وارد اساس می‌شود (مهم برای میزان/جدولی)
    const dateRaw = String(input.questionDate || '').trim();
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
    if (dateRaw) allRawParts.push(expandDigitsToWords(dateRaw));
    if (timeRaw) allRawParts.push(expandDigitsToWords(timeRaw));
    const allRaw = allRawParts.filter(Boolean).join(' ');
    const fullNorm = {};
    normalizeText(allRaw, fullNorm);

    steps.push({
      id: 'normalize',
      title: 'نرمال‌سازی حروف',
      input: allRaw,
      output: fullNorm.after,
      note: [
        dateRaw ? ('تاریخ:' + dateRaw) : 'بدون تاریخ',
        extraEnabled ? 'اطلاعات تکمیلی فعال است' : 'فامیلی/ساعت تکمیلی غیرفعال',
        'آ→ا(۱) کلاسیک',
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
      `سؤال:${parts.soal}`,
      `تاریخ:${parts.date || '—'}`
    ];
    if (extraEnabled) asasInputNote.push(`ساعت:${parts.time || '—'}`);
    steps.push({
      id: 'asas_raw',
      title: 'ساخت اساس (سطر پایه)',
      input: asasInputNote.join(' | '),
      output: asas,
      note: `طول اساس: ${asas.length} حرف` + (dateRaw ? ' (با تاریخ)' : '') + (extraEnabled ? ' (با تکمیلی)' : '')
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
    const jamalLock = analyzeJamalLock(jamal.sum, parts, opts);
    const questionScope = classifyQuestionScope(Object.assign({}, input, parts, {
      questionScope: (opts && opts.questionScope) || (input && input.questionScope)
    }));
    steps.push({
      id: 'question_scope',
      title: 'نوع سؤال (تحقیق کتب)',
      input: questionScope.id,
      output: questionScope.title,
      note: questionScope.classicNote
    });
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
    steps.push({
      id: 'jamal_lock',
      title: jamalLock.relevant ? 'قفل جمل (نمونهٔ جنگ مرجع)' : 'جمل و میزان (این سؤال)',
      input: [
        `جمل=${jamal.sum}`,
        `سائل=${parts.sael || '—'}(${sumAbjad(parts.sael, opts.table).sum})`,
        'آ→ا(۱) کلاسیک',
        `نوع=${questionScope.title}`
      ].join(' | '),
      output: jamalLock.summary,
      note: jamalLock.recipes
        .map((r) => `${r.title}${r.classic ? ' [کلاسیک]' : ' [غیرکلاسیک]'}: ${r.note}`)
        .concat(jamalLock.hits.length ? ['· ' + jamalLock.hits.join('؛ ')] : [])
        .join(' · ')
    });

    // --- جفر جدولی میزان‌دار (الویت کاربر) ---
    if (opts.pipeline === 'jadwali') {
      // تفکیک نقش‌ها (نمونهٔ حرفه‌ای + متون طوخى/شاد گیلانی):
      // جمل/میزان ← اساس کامل (در محوری: سائل+…؛ در مرکزی ممکن است بدون سائل)
      // ستون‌های جدول ← فقط حروف سؤال (بدون تاریخ/فیلدهای اضافه)
      const columnBase = parts.soal || asas;
      const jadwalModel = (opts.jadwalModel === 'tttm' || opts.jadwalModel === 'tarfa_tanzil')
        ? 'tttm'
        : 'quarter28';
      const mizan = computeMizan(jamal.sum, opts);
      steps.push({
        id: 'mizan',
        title: 'میزان جدولی',
        input: String(jamal.sum),
        output: String(mizan),
        note: [
          `میزان = باقیماندهٔ جمل بر ${opts.mizanBase || 28} (منازل/دایره ابجد)`,
          'جمل از اساس کامل است',
          questionScope.id === 'mehvari'
            ? 'قفل بازشده: سائل مهدی (۵۹) → ۵۰۲۲/۱۰ · محوری اصولی'
            : 'بدون سائل (مرکزی): ۴۹۶۳/۷؛ برای ۵۰۲۲ سائل مهدی بیفزای'
        ].join(' | ')
      });

      steps.push({
        id: 'jadwal_columns',
        title: 'پایهٔ ستون‌های جدول',
        input: asasInputNote.join(' | '),
        output: columnBase,
        note: `فقط حروف سؤال · ${columnBase.length} ستون (تاریخ و نام‌ها در میزان‌اند نه در عرض جدول)`
      });

      const layers = buildJadwalLayers(columnBase, jadwalModel);
      steps.push({
        id: 'jadwal_model',
        title: jadwalModel === 'tttm'
          ? 'مدل لایه‌ها · ترفع/ترقی/تنزل/مساوات'
          : 'مدل لایه‌ها · ربع دایره ۲۸',
        input: columnBase,
        output: jadwalModel === 'tttm'
          ? 'مساوات | ترقی(+۱) | ترفع(۹↑) | تنزل(−۱)'
          : 'A+0 | B+7 | C+14 | D+21',
        note: jadwalModel === 'tttm'
          ? 'چهارگان کلاسیک کتب جفر + نظیرهٔ هر سطر؛ انتخاب روی همین ۴ سطر با کلید میزان'
          : 'A خام، B یک‌ربع، C دو ربع (=نظیره)، D سه ربع؛ سطرهای نظیره همان جابه‌جایی +۱۴ هستند'
      });
      layers.rows.forEach((row) => {
        steps.push({
          id: 'jadwal_' + row.id,
          title: 'جدول · ' + row.title,
          input: columnBase.length > 80 ? (columnBase.slice(0, 80) + '…') : columnBase,
          output: row.str,
          note: `طول ${row.str.length} ستون`
        });
      });

      const sel = selectJadwalRow(layers, mizan);
      steps.push({
        id: 'jadwal_select',
        title: 'سطر انتخاب (با کلید میزان روی A–D)',
        input: `میزان=${mizan} | قاعدهٔ UI: ردیف ستون i = (i×میزان) mod 4 میان A/B/C/D`,
        output: sel.selected,
        note: 'لقط هر Nاُم حرف کلاسیک است؛ خودِ فرمول %4 در رسائل نام‌دار یافت نشد (تقریب نرم‌افزاری). نطق از مخزن A–D؛ رنگ پس از نطق'
      });

      const mizanExtract = extractByMizanStep(sel.selected, mizan);
      const classicLaqt = buildClassicLaqtBundle(columnBase, layers, sel.selected, mizan);
      const refNatq = opts.referenceNatq ||
        'نادم شوند که نهایت گرفت عمید سقوط حصول به خوف نظامی باخت سخت';
      // برای سؤال جنگِ مرجع، مسیر رنگ نمونه را هم گزارش کن؛ وگرنه فقط مدل قفل
      const warSoalNorm = normalizeText(
        'نتیجه نهایی جنگ اسراییل و آمریکا علیه ایران چگونه خواهد بود'
      );
      const includeRef = !!opts.referenceNatq || columnBase === warSoalNorm;
      const natqLock = analyzeNatqLock(layers, {
        referenceNatq: includeRef ? refNatq : ''
      });
      steps.push({
        id: 'jadwal_mizan_extract',
        title: 'لقط میزانی از سطر انتخاب',
        input: sel.selected,
        output: mizanExtract,
        note: `برداشتن حروف ستون‌های مضرب ${mizan}`
      });
      steps.push({
        id: 'jadwal_laqt_classic',
        title: 'لقط میزانی کلاسیک (گام = میزان)',
        input: `گام ${classicLaqt.step} از اساس‌سؤال + انتخاب + A/B/C/D`,
        output: classicLaqt.pooled,
        note: [
          `از اساس سؤال: ${classicLaqt.fromAsas || '—'}`,
          `از انتخاب: ${classicLaqt.fromSelected || '—'}`,
          `یکتا: ${classicLaqt.unique}`
        ].join(' | ')
      });
      steps.push({
        id: 'natq_lock',
        title: 'قفل نطق (باز)',
        input: 'مخزن A+B+C+D · ترتیب آزاد · رنگ پس از نطق',
        output: natqLock.summary,
        note: natqLock.rules.concat(
          natqLock.reference && natqLock.reference.highlight
            ? [natqLock.reference.highlight.summary]
            : []
        ).join(' · ')
      });

      const condensed = takhlisOdd(sel.selected);
      const poolABCD = layers.poolABCD || (layers.A + layers.B + layers.C + layers.D);
      const priority = sel.priority || (sel.selected + mizanExtract);
      // مستحصله نمایشی: اولویت انتخاب + لقط کلاسیک + مخزن
      let mustehsila = '';
      const seen = new Set();
      for (const ch of String(priority + classicLaqt.pooled + poolABCD)) {
        if (!ch || seen.has(ch)) continue;
        seen.add(ch);
        mustehsila += ch;
      }
      if (mustehsila.length < 4) mustehsila = condensed || sel.selected;

      steps.push({
        id: 'jadwal_pool',
        title: 'مخزن حروف نطق (A+B+C+D)',
        input: 'چهار لایهٔ اصلی',
        output: poolABCD,
        note: `طول ${poolABCD.length} | بدون تکرار: ${uniqueLetters(poolABCD)}`
      });

      const mustehsilaGrid = buildMustehsilaGrid(uniqueLetters(mustehsila));
      steps.push({
        id: 'mustehsila',
        title: 'مستحصله نهایی (جدولی)',
        input: `اولویت:${priority.length} | لقط:${classicLaqt.pooled.length} | مخزن:${poolABCD.length}`,
        output: mustehsila,
        note: `میزان=${mizan} | ستون=${columnBase.length} | مدل=${jadwalModel} | در کتب مستحصله «سطر» است؛ شبکهٔ فشرده فقط نمایش است`
      });
      steps.push({
        id: 'mustehsila_grid',
        title: 'جدول مستحصله (نمایش فشرده)',
        input: uniqueLetters(mustehsila),
        output: mustehsilaGrid.rows.map((r) => r.cells.join('')).join(' | '),
        note: mustehsilaGrid.classicNote
      });

      const methodLabel = opts.methodLabel || (jadwalModel === 'tttm'
        ? 'جفر جدولی · ترفع/ترقی/تنزل/مساوات'
        : 'جفر جدولی میزان‌دار');
      return {
        ok: true,
        method: methodLabel,
        methodId: opts.methodId || (jadwalModel === 'tttm' ? 'jadwali_tttm' : 'jadwali_mizan'),
        parts,
        asas,
        columnBase,
        nazira: layers.nA,
        jamal: jamal.sum,
        mizan,
        jamalLock,
        natqLock,
        questionScope,
        madkhal: madkhal.value,
        madkhalSteps: madkhal.steps,
        mustehsila,
        mustehsilaUnique: uniqueLetters(mustehsila),
        mustehsilaGrid,
        letterCount: mustehsila.length,
        dotCount: countDots(mustehsila),
        steps,
        options: Object.assign({}, opts, {
          natqStyle: 'sentence',
          pipeline: 'jadwali',
          jadwalModel
        }),
        normalize: fullNorm,
        extraEnabled,
        jadwal: {
          mizan,
          model: layers.model || jadwalModel,
          columnBase,
          columnCount: columnBase.length,
          layers: layers.rows.map((r) => ({ id: r.id, title: r.title, str: r.str })),
          selected: sel.selected,
          picks: sel.picks,
          priority,
          mizanExtract,
          classicLaqt,
          condensed,
          poolABCD,
          poolUnique: uniqueLetters(poolABCD),
          natqLock,
          mustehsilaGrid,
          questionScope
        }
      };
    }

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
        jamalLock,
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
      jamalLock,
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
    if (meta.questionDate) lines.push(`- تاریخ سؤال: ${meta.questionDate}`);
    if (meta.extraEnabled) {
      lines.push(`- فامیلی سائل: ${meta.saelFamily || '—'}`);
      lines.push(`- فامیلی طالب: ${meta.talebFamily || '—'}`);
      lines.push(`- فامیلی مطلوب: ${meta.matloobFamily || '—'}`);
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
    'وفا', 'فنا', 'بقا', 'نور', 'سر', 'دل', 'جان', 'نام', 'کام', 'امید', 'مبهم',
    'نادم', 'سقوط', 'خوف', 'عمید', 'حصول', 'باخت', 'سخت', 'نظامی', 'پشیمان', 'هزینه'
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

  /** تشخیص پروفایل سؤال: بله/خیر فقط با نشانه‌های قطبی واضح */
  function looksLikeYesNo(text) {
    const t = String(text || '');
    if (!t.trim()) return false;
    // صریح‌ترین نشانه‌ها
    if (/آیا/.test(t)) return true;
    if (/یا\s*نه\b|هست\s*یا\s*نیست|آری\s*یا\s*خیر|بله\s*یا\s*خیر/.test(t)) return true;
    if (/(می\s*شود|می‌شود|میشود)\s*یا/.test(t)) return true;
    // بدون «آیا» فقط اگر ساختار قطبی واضح باشد
    if (/به\s*صلاح\s*(است|می)|مفید\s*(است|می)/.test(t) && /یا\s*نه|میشود|می‌شود|خواهد\s*بود/.test(t)) return true;
    return false;
  }

  function detectQuestionProfile(meta) {
    const text = [meta.modda, meta.soal].filter(Boolean).join(' ');
    const choices = extractChoiceOptions(meta.soal || '');
    if (choices.length >= 2) {
      return { id: 'choice', title: 'انتخابی (بین گزینه‌ها)', choices, outputHint: 'برنده بین گزینه‌ها + توضیح چندجمله‌ای' };
    }
    if (looksLikeYesNo(text)) {
      return { id: 'yesno', title: 'بله / خیر', choices: ['آری', 'خیر'], outputHint: 'پاسخ قطبی آری/خیر/مبهم + ۲–۴ جمله دلیل' };
    }
    if (/کی\b|چه وقت|زمان\b|موعد|چه روز|چه ماه/.test(text)) {
      return { id: 'timing', title: 'زمانی / وعده', choices: [], outputHint: 'جدول کاندید زمانی + خوانش چندجمله‌ای' };
    }
    if (/اسم|نام|کیست|چه کسی|چه چیزی|چی\s*بگیر|کدام دارو|کدام گیاه/.test(text)) {
      return { id: 'name', title: 'نام‌یابی', choices: [], outputHint: 'جدول کاندید + خوانش چندجمله‌ای؛ در پایان نام غالب یا «نام استخراج نشد»' };
    }
    return { id: 'general', title: 'عمومی (چندخوانشی)', choices: [], outputHint: 'جدول کاندید + خوانش چندجمله‌ای (نه فقط یک کلمه)' };
  }

  /** استخراج طرف‌های نزاع از متن سؤال (برای دقت نسبت‌دهی نطق) */
  function extractConflictParties(meta) {
    const text = [meta && meta.soal, meta && meta.modda].filter(Boolean).join(' ');
    const parties = { attackers: [], defenders: [], raw: text };
    const m = text.match(/جنگ\s+(.+?)\s+علیه\s+(.+?)(?:\s+چگونه|\s+چه\b|\s+هشتم|\s+در\s+|$)/);
    if (m) {
      parties.attackers = m[1].replace(/\s+/g, ' ').trim().split(/\s+و\s+/).map((s) => s.trim()).filter(Boolean);
      parties.defenders = m[2].replace(/\s+/g, ' ').trim().split(/\s+و\s+/).map((s) => s.trim()).filter(Boolean);
    } else {
      const m2 = text.match(/(.+?)\s+علیه\s+(.+?)(?:\s+چگونه|\s+چه\b|$)/);
      if (m2) {
        parties.attackers = m2[1].replace(/.*(?:جنگ|حمله|تجاوز)\s+/g, '').replace(/\s+/g, ' ').trim().split(/\s+و\s+/).map((s) => s.trim()).filter(Boolean);
        parties.defenders = m2[2].replace(/\s+/g, ' ').trim().split(/\s+و\s+/).map((s) => s.trim()).filter(Boolean);
      }
    }
    parties.label =
      (parties.attackers.length ? ('مهاجم: ' + parties.attackers.join(' و ')) : '') +
      (parties.defenders.length ? (' | مدافع: ' + parties.defenders.join(' و ')) : '');
    return parties;
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
      return { id: 'yesno', title: 'بله / خیر (قطب‌نما)', bank: ['آری', 'خیر', 'تاخیر', 'موانع', 'میسر', 'مبهم'], choices: ['آری', 'خیر'], isChoice: false, profile };
    }
    // جنگ/نزاع فقط با قرائن قوی — نه با واژهٔ تنها مثل «سقوط/پیروز/شکست»
    // تا ازدواج، اقتصاد، ورزش و… بانک جنگ نگیرند.
    const warStrong = /جنگ|نبرد|تجاوز|اسرائیل|اسراییل|خصم|دشمن/.test(t) ||
      (/حمله/.test(t) && !/حمل(?:ه|ة)?قلب|قلبی/.test(t)) ||
      (/علیه/.test(t) && /جنگ|نبرد|حمله|اسرائیل|اسراییل|آمریکا/.test(t));
    const warSoft = /نظامی/.test(t) && /سقوط|پیروز|شکست|خوف|نادم|فتح|نصر|بقا|آمریکا|ایران/.test(t);
    if (warStrong || warSoft) {
      const parties = extractConflictParties(meta);
      return {
        id: 'conflict',
        title: 'موضوع کمکی: جنگ/نزاع' + (parties.label ? (' · ' + parties.label) : ''),
        bank: ['بقا', 'ناکام', 'سقوط', 'خوف', 'نادم', 'عمید', 'حصول', 'باخت', 'سخت', 'نظامی', 'صبر', 'موانع', 'مبهم', 'فتح', 'نصر', 'هزینه', 'تاخیر', 'پشیمان'],
        choices: [],
        isChoice: false,
        profile,
        parties
      };
    }
    if (/چربی|تری\s*گلیس|کلسترول|قند خون/.test(t)) {
      return { id: 'herbal_lipid', title: 'موضوع کمکی: گیاه/چربی‌خون (بانک فقط پیشنهاد است)', bank: ['سیر', 'شنبلیله', 'سماق', 'زعفران', 'دارچین', 'زنجبیل', 'سیاه دانه', 'آویشن', 'هل'], choices: [], isChoice: false, profile };
    }
    if (/دارو|گیاه|دمنوش|اعصاب|آرام|ارام|طب|علاج|درمان/.test(t)) {
      return { id: 'herbal', title: 'موضوع کمکی: دارو/گیاه (بانک فقط پیشنهاد است)', bank: ['به لیمو', 'گل گاوزبان', 'اسطوخودوس', 'بابونه', 'بادرنجبویه', 'سنبل الطیب', 'چای سبز', 'نعناع', 'آویشن', 'گل محمدی', 'خاکشیر', 'شیرین بیان', 'زعفران', 'هل', 'دارچین', 'سیاه دانه', 'اسپند', 'گل بنفشه', 'سیر', 'شنبلیله', 'سماق'], choices: [], isChoice: false, profile };
    }
    if (/ازدواج|همسر|زن|شوهر|نامزد|عقد/.test(t)) {
      return { id: 'marriage', title: 'موضوع کمکی: ازدواج (بانک فقط پیشنهاد است)', bank: ['صلح', 'وصول', 'تاخیر', 'موانع', 'میسر', 'ناممکن', 'خیر', 'شر'], choices: [], isChoice: false, profile };
    }
    if (/سفر|رفتن|مقصد|مسافرت/.test(t)) {
      return { id: 'travel', title: 'موضوع کمکی: سفر (بانک فقط پیشنهاد است)', bank: ['رفتن', 'نرفتن', 'تاخیر', 'خیر', 'خطر', 'امن', 'بازگشت'], choices: [], isChoice: false, profile };
    }
    if (/کار|شغل|استخدام|پول|سود|معامله|خرید|فروش/.test(t)) {
      return { id: 'work', title: 'موضوع کمکی: کار/معامله (بانک فقط پیشنهاد است)', bank: ['سود', 'زیان', 'تاخیر', 'موفق', 'ناموفق', 'صبر', 'حرکت'], choices: [], isChoice: false, profile };
    }
    if (profile.id === 'name' || /اسم|نام|کیست|چه کسی/.test(t)) {
      return { id: 'name', title: 'موضوع کمکی: استخراج نام (نطق آزاد از حروف مجاز)', bank: [], choices: [], isChoice: false, profile };
    }
    return { id: 'general', title: 'عمومی — نطق آزاد از حروف مجاز', bank: ['خیر', 'آری', 'تاخیر', 'صبر', 'موانع', 'میسر', 'مبهم'], choices: [], isChoice: false, profile };
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
    lines.push('## دیکشنری داخلی (پیشنهاد اولویت‌دار — زندان نیست)');
    if (!dict.candidates.length) lines.push('کاندید داخلی کافی یافت نشد؛ از لایه‌های ناطق نطق آزاد بساز.');
    else {
      dict.candidates.forEach((c, i) => {
        lines.push(`${i + 1}) ${c.word} | لایه:${c.layer} | پوشش:${Math.round(c.coverage.ratio * 100)}%${c.coverage.complete ? '✓' : (' کم=' + c.coverage.missing)} | عنصر:${c.element}${c.elementMatch ? '✓' : ''} | مدخل‌کلمه:${c.madkhal}${c.madMatch ? '✓هم‌مدخل' : ''} | امتیاز:${c.score}`);
      });
    }
    lines.push('می‌توانی کاندید تازه از حروف لایه‌ها بسازی؛ برچسب «نطق‌آزاد» بزن و پوشش/حروف کم‌آمده را بنویس.');
    lines.push('موضوع تشخیص‌داده‌شده فقط قطب‌نماست؛ مجبور نیستی فقط گیاه/بانک موضوعی را جواب بدهی مگر سؤال انتخابی باشد.');
    if (dict.topic && dict.topic.id === 'conflict' && dict.topic.parties && dict.topic.parties.label) {
      lines.push('## طرف‌های نزاع (اجباری برای نسبت‌دهی)');
      lines.push(dict.topic.parties.label);
      lines.push('هر کاندید قطبی (بقا/ناکام/سقوط/…) باید صریحاً به مهاجم یا مدافع نسبت داده شود؛ بدون نسبت‌دهی قبول نهایی ممنوع است.');
    }
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
    const isNameQuest = !isChoice && profile.id === 'name';
    const isConflict = topic.id === 'conflict';
    const sentenceNatq = !!(opts && opts.sentenceNatq);
    const lines = [
      '## قواعد نطق (اجباری)',
      '1) حرف جدید خارج از لایهٔ منبع کاندید ممنوع است؛ هر کاندید باید از یکی از لایه‌های خام/نظیره/ترفع/تنزل/مخزن ABCD (یا حروف مشترک چندروش) قابل‌توجیه باشد.',
      '2) دیکشنری داخلی و بانک موضوعی فقط «پیشنهاد اولویت»اند؛ زندان نیستند.',
      '3) نطق آزاد مجاز است: واژه/عبارت تازه از حروف مجاز بساز و برچسب «نطق‌آزاد» بزن.',
      '4) اولویت امتیاز: پوشش حروف + هم‌عنصری + هم‌مدخل + پایداری؛ نه زیبایی ادبی.',
      '5) موضوع تشخیص‌داده‌شده قطب‌نماست؛ خودِ کلمهٔ مدعا را طوطی‌وار بازتاب نده مگر حروف مجبور کند.',
      '6) برای هر کاندید نطق معکوس + درصد پوشش + حروف کم‌آمده را بنویس.',
      '7) چند خوانش بده؛ ادعای قطعی پزشکی/غیب نکن.',
      '8) خروجی فارسی باشد.',
      '9) پنجره‌های بی‌معنا (مثل ذضز/فقذس) را کاندید غالب نکن؛ فقط شاهد حرفی فرعی.',
      `10) پروفایل این سؤال: ${profile.title}. قالب: ${profile.outputHint}.`
    ];
    if (sentenceNatq) {
      lines.push('11) محصول اصلی جفر جدولی یک «نطق یک‌خطی کلاسیک» است — نه فقط جدول کاندیدهای مدرن.');
      lines.push('12) نطق یک‌خطی را فقط از حروف مخزن A+B+C+D بساز (۸–۲۵ کلمه؛ ترتیب آزاد، نه اجبار ترتیب ستون).');
      if (isConflict) {
        lines.push('13) الگوی مطلوب شبیه این است (فقط سبک؛ عین این جمله را کپی نکن): «نادم شوند که نهایت گرفت عمید سقوط حصول به خوف نظامی باخت سخت».');
        lines.push('14) سبک نطق یک‌خطی = زنجیرهٔ کلاسیک حرف‌محور (نادم شوند که … / حصول به … / … سخت). نه خبر تحلیلی مدرن.');
        lines.push('15) در خودِ نطق یک‌خطی نام طرفین سیاسی/جغرافیایی (اسرائیل، امریکا، ایران، …) ننویس؛ نام‌ها فقط در «تفسیر» مجازند.');
        lines.push('16) ویرگول مدرن (،) و ساختار «الف …، ب با …» را کم کن؛ اتصال با که / و / به / ز / از.');
        lines.push('17) واژه‌های نتیجه را از مخزن بچین: ندامت، سخت، خوف، نظامی/نظام، سقوط، حصول، بقا، نصر، باخت، عمید، … — نه روایت خبری بلند.');
      } else {
        lines.push('13) سبک نطق یک‌خطی = زنجیرهٔ کلاسیک حرف‌محور از مخزن (۸–۲۵ کلمه)؛ الگوی جنگ را کپی نکن.');
        lines.push('14) موضوع سؤال (ازدواج/سفر/کار/نام/…) را در نطق رعایت کن؛ بانک جنگ (نادم/سقوط/نظامی) را وارد نکن مگر حروف مجبور کند.');
        lines.push('15) نام اشخاص خاص سؤال را در نطق ننویس مگر برای نام‌یابی؛ جزئیات روان در تفسیر بیاید.');
        lines.push('16) ویرگول مدرن کم کن؛ اتصال با که / و / به / ز / از.');
        lines.push('17) از واژه‌های هم‌خوان با موضوع و حروف مخزن استفاده کن (مثل میسر، تاخیر، موانع، خیر، صبر، …).');
      }
      lines.push('18) رنگ/هایلایت را کلید استخراج ندان؛ بعد از نطق با جاروی چندبارهٔ جدول خانه‌های مصرف‌شده مشخص می‌شود.');
      lines.push('19) بعد از نطق یک‌خطی، بخش «تفسیر هوش مصنوعی» را جدا بنویس (۲–۵ جملهٔ فارسی روان' + (isConflict ? '؛ اینجا می‌توانی طرفین را نام ببری' : '') + ').');
      lines.push('20) جدول کاندید فقط پشتیبان است؛ جواب آخر همان نطق یک‌خطی + تفسیر است.');
      lines.push('21) حرف خارج از مخزن ممنوع. حروف اولویت (انتخاب/میزان) کمکی‌اند نه زندان ترتیب.');
    } else if (isChoice) {
      lines.push('11) در سؤال انتخابی بانک اصلی فقط گزینه‌های خود سؤال است.');
      lines.push('12) ساخت واژه‌های بی‌ربط از حروف مشترک به‌عنوان جواب اصلی ممنوع است.');
      lines.push('13) عنصر و مدخل گزینه را در امتیاز دخالت بده.');
      lines.push('14) خروجی: جدول گزینه‌ها + ۲–۴ جمله توضیح؛ پایان با «برنده بین گزینه‌ها: X» یا مبهم.');
    } else if (isYesNo) {
      lines.push('11) اول بین آری/خیر/مبهم کاندید بده؛ ۲–۴ جمله دلیل حرفی/عنصری/مدخل.');
      lines.push('12) کاندیدهای پشتیبان می‌توانند از دیکشنری یا نطق‌آزاد باشند.');
      lines.push('13) اگر مثبت/منفی نزدیک بودند، مبهم اعلام کن.');
    } else if (isNameQuest) {
      lines.push('11) نام را از حروف لایه‌ها استخراج کن (۲ تا ۸ حرف ترجیحاً)؛ دیکشنری فقط کمک است.');
      lines.push('12) اگر نام غالب روشن نبود بگو «نام استخراج نشد» و ۲–۳ کاندید محتمل بیاور.');
    } else {
      lines.push('11) موضوع کمکی را در نظر بگیر ولی اگر حروف چیز دیگری نشان داد، با برچسب نطق‌آزاد گزارش کن.');
      lines.push('12) علاوه بر جدول کاندید، خوانش چندجمله‌ای (۲ تا ۶ جمله) بنویس.');
    }
    if (isConflict && !sentenceNatq) {
      lines.push('14) نزاع/جنگ: هر کاندید قطبی را به مهاجم یا مدافع نسبت بده (مثلاً: ناکام=مهاجم، بقا=مدافع).');
      lines.push('15) بدون نسبت‌دهی طرفین، خوانش غالب ناقص است.');
      if (topic.parties && topic.parties.label) lines.push('16) طرف‌ها: ' + topic.parties.label);
    }
    if (isConflict && sentenceNatq) {
      lines.push('22) نزاع/جنگ: در تفسیر (نه لزوماً در نطق یک‌خطی) مهاجم/مدافع را نسبت بده.');
      if (topic.parties && topic.parties.label) lines.push('23) طرف‌ها: ' + topic.parties.label);
    }
    if (opts && opts.multi && !isChoice) {
      lines.push('17) لایه A = حروف مشترک روش‌ها؛ لایه B = هر روش.');
    }
    if (opts && opts.multi && isChoice) {
      lines.push('17) همگرایی = پوشش بهتر گزینه در روش‌های بیشتر.');
    }
    lines.push('');
    lines.push(`## موضوع تشخیص‌داده‌شده (قطب‌نما): ${topic.title}`);
    if (topic.bank.length) {
      lines.push(isChoice ? '## گزینه‌های خود سؤال (تنها بانک اصلی)' : '## بانک واژگانی پیشنهادی (الزامی نیست)');
      lines.push(topic.bank.join('، '));
      if (!isChoice) lines.push('الزام به همین بانک نیست؛ نطق‌آزاد از حروف لایه‌ها مجاز است.');
    }
    lines.push('');
    lines.push('## فرمت خروجی اجباری');
    if (isChoice) {
      lines.push('جدول گزینه‌ها: پوشش مشترک / پوشش روش‌ها / عنصر / مدخل / امتیاز');
      lines.push('سپس ۲–۴ جمله توضیح خوانش.');
      lines.push('پایان: برنده بین گزینه‌ها + قطعی یا فقط محتمل‌تر');
    } else if (isYesNo) {
      lines.push('پاسخ قطبی + ۲–۴ جمله دلیل + جدول کاندیدهای پشتیبان');
    } else if (sentenceNatq) {
      lines.push('### ۱) جدول کاندید پشتیبان');
      lines.push('کاندید | نوع | منبع‌لایه | پوشش | عنصر | مدخل | نسبت‌طرف(اگر نزاع) | امتیاز | اطمینان');
      lines.push('### ۲) نطق یک‌خطی (اصلی — اجباری)');
      lines.push('نطق یک‌خطی: <زنجیرهٔ کلاسیک ۸–۲۵ کلمه‌ای فقط از حروف مخزن؛ بدون نام طرفین؛ شبیه «نادم شوند که … سخت»>');
      lines.push('### ۳) تفسیر هوش مصنوعی (اجباری)');
      lines.push('تفسیر: <۲–۵ جمله روان؛ معنای نطق را برای صورت‌مسئله بگو؛ اینجا طرفین را نام ببر؛ غلبه را دقیق تعریف کن>');
      lines.push('### پایان');
      lines.push('پایان: نطق یک‌خطی نهایی + سطح اطمینان');
    } else {
      lines.push('کاندید | نوع(دیکشنری/نطق‌آزاد) | منبع‌لایه | پوشش | عنصر | مدخل | امتیاز | اطمینان');
      lines.push('سپس خوانش چندجمله‌ای (۲ تا ۶ جمله) — نه فقط یک کلمه.');
      lines.push('پایان: بهترین کاندید معتبر + یک خط خلاصه خوانش');
    }
    return { topic, profile, lines, isChoice, isYesNo, isConflict, sentenceNatq };
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
    return !!(input && (
      input.questionDate ||
      (input.extraEnabled && (input.saelFamily || input.talebFamily || input.matloobFamily || input.questionTime))
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
    const topic = detectTopic(meta || {});
    const isConflict = topic.id === 'conflict';
    const isSentence = /جدولی|نطق یک‌خطی|مخزن A\+B\+C\+D|pipeline/.test((contextLines || []).join('\n')) ||
      !!(meta && meta._sentenceNatq);
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
      '1) فقط روی کاندیدهایی که مولّد نوشته داوری کن. کاندید جدید نساز.',
      '2) هر کاندید: قبول / رد / مشروط',
      '3) رد کن اگر: حرف اضافه نسبت به لایهٔ ادعایی دارد، پوشش خیلی ضعیف است، یا بازتاب طوطی‌وار عین مدعاست.',
      '4) کاندید «نطق‌آزاد» را فقط به‌خاطر خارج‌بودن از دیکشنری رد نکن؛ معیار حروف/پوشش/پایداری است.',
      '5) پنجره‌های بی‌معنا/ناخوانا را حداکثر مشروطِ فرعی کن؛ قبول نهایی نده.',
      '6) اولویت قبول با کاندیدهای پایدار، پوشش‌دار و معنادار.',
      '7) حداکثر ۲ کاندید قبول‌شده نهایی بده.',
      '8) اگر هیچ‌کدام قبول نشد بگو: نتیجه معتبر استخراج نشد.',
      '9) ادعای قطعی پزشکی/غیب نکن.',
      isConflict
        ? '10) در نزاع: قبول نهایی فقط اگر نسبت به مهاجم/مدافع روشن باشد؛ وگرنه مشروط یا رد.'
        : '10) در پایان خوانش غالب را روشن بنویس.',
      isConflict && topic.parties && topic.parties.label ? ('11) طرف‌ها: ' + topic.parties.label) : '11) اگر مولّد نطق یک‌خطی داده، همان را از نظر حروف مخزن و معنا داوری کن.',
      '12) محصول نهایی باید مثل سنت جدولی باشد: اول «نطق یک‌خطی کلاسیک»، بعد «تفسیر هوش مصنوعی» — نه فقط دو کلمهٔ مدرن.',
      '13) اگر مولّد نطق یک‌خطی دارد، همان را از نظر حروف مخزن بررسی کن؛ در صورت قبول، ویرایش جزئی برای روان‌تر شدن مجاز است ولی حرف جدید اضافه نکن.',
      '14) اگر نطق یک‌خطی نام طرفین سیاسی دارد یا سبک خبری مدرن است، آن را به زنجیرهٔ کلاسیک (بدون نام طرفین) ویرایش کن؛ نام‌ها فقط در تفسیر بمانند.',
      '',
      '## فرمت خروجی داور',
      'برای هر کاندید مولّد:',
      '- کاندید:',
      '- حکم: قبول/رد/مشروط',
      '- دلیل کوتاه:',
      'پایان:',
      '- کاندیدهای قبول‌شده نهایی:',
      '- نطق یک‌خطی نهایی: <زنجیرهٔ کلاسیک از حروف مخزن؛ بدون نام طرفین>',
      '- تفسیر هوش مصنوعی: <۲–۵ جمله روان برای صورت‌مسئله؛ در نزاع طرفین را نام ببر>',
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
    const sentenceNatq = !!(result.options && (result.options.natqStyle === 'sentence' || result.options.pipeline === 'jadwali'));
    const rules = natqRulesBlock(meta, { multi: false, sentenceNatq });
    let ranked = rules.isChoice ? scoreChoiceOptions(rules.topic.choices || rules.topic.bank, [result], result.mustehsilaUnique) : [];
    if (rules.isChoice) ranked = enhanceChoiceScores(ranked, [result], meta);
    const choiceLines = formatChoiceScoreTable(ranked);
    const dictSource = (result.jadwal && result.jadwal.poolABCD) ? result.jadwal.poolABCD : result.mustehsila;
    const dict = buildInternalDictionary(dictSource, meta, { madkhal: result.madkhal, table: result.options.table });
    const assist = formatNatiqAssistBlock(dict, result.madkhal);
    const stability = extras && extras.stability;
    const stabilityLines = formatStabilityBlock(stability);
    const jadwalLines = [];
    if (result.jadwal) {
      jadwalLines.push('## جزئیات جفر جدولی میزان‌دار');
      const modelLabel = (result.jadwal.model === 'tttm')
        ? 'ترفع/ترقی/تنزل/مساوات (+ نظیره)'
        : 'ربع دایره ۲۸ (A+0, B+7, C+14, D+21)';
      jadwalLines.push(`- مدل لایه: ${modelLabel}`);
      jadwalLines.push(`- جمل (اساس کامل · سائل/سؤال/تاریخ): ${result.jamal}`);
      jadwalLines.push(`- میزان: ${result.mizan != null ? result.mizan : result.jadwal.mizan}`);
      if (result.jadwal.columnCount != null || result.columnBase) {
        jadwalLines.push(`- ستون‌های جدول (فقط سؤال): ${result.jadwal.columnCount || String(result.columnBase || '').length}`);
        jadwalLines.push(`- پایه ستون: ${result.jadwal.columnBase || result.columnBase}`);
      }
      jadwalLines.push(`- سطر انتخاب (تقریب): ${result.jadwal.selected}`);
      jadwalLines.push(`- لقط میزانی از انتخاب: ${result.jadwal.mizanExtract}`);
      if (result.jadwal.classicLaqt) {
        jadwalLines.push(`- لقط کلاسیک (گام=${result.jadwal.classicLaqt.step}): ${result.jadwal.classicLaqt.pooled}`);
        jadwalLines.push(`- لقط کلاسیک یکتا: ${result.jadwal.classicLaqt.unique}`);
      }
      jadwalLines.push(`- اولویت حروف (انتخاب+میزان): ${result.jadwal.priority || result.jadwal.selected}`);
      jadwalLines.push(`- مخزن حروف نطق A+B+C+D: ${result.jadwal.poolABCD}`);
      jadwalLines.push(`- بدون تکرار مخزن: ${result.jadwal.poolUnique}`);
      jadwalLines.push(`- شمارش حروف مخزن: ${letterBag(result.jadwal.poolABCD)}`);
      if (result.natqLock || (result.jadwal && result.jadwal.natqLock)) {
        const nl = result.natqLock || result.jadwal.natqLock;
        jadwalLines.push(`- قفل نطق: ${nl.summary}`);
        (nl.rules || []).forEach((rule, i) => jadwalLines.push(`  · ${i + 1}) ${rule}`));
        if (nl.reference && nl.reference.highlight) {
          jadwalLines.push(`- مسیر رنگ نمونهٔ مرجع: ${nl.reference.highlight.summary}`);
        }
      }
      jadwalLines.push('## دستور نطق جدولی (قفل باز)');
      jadwalLines.push('1) از مخزن A+B+C+D یک «نطق یک‌خطی کلاسیک» با ترتیب آزاد بساز (ترتیب ستون اجباری نیست).');
      if (rules.isConflict) {
        jadwalLines.push('2) سبک هدف: زنجیرهٔ واژه‌های حرف‌محور شبیه «نادم شوند که نهایت گرفت عمید سقوط حصول به خوف نظامی باخت سخت» (عین آن را کپی نکن؛ برای سؤال فعلی بساز).');
        jadwalLines.push('3) ممنوع در نطق یک‌خطی: نام طرفین (اسرائیل/امریکا/ایران/…) و جملهٔ خبری مدرن با ویرگول‌های تحلیلی.');
        jadwalLines.push('4) مجاز در تفسیر: نام طرفین + توضیح روان (ندامت مهاجم، بقا/نصر مدافع، فرسایش، نه لزوماً پیروزی سریع بی‌خسارت).');
      } else {
        jadwalLines.push('2) سبک هدف: زنجیرهٔ کلاسیک از حروف مخزن هم‌خوان با موضوع سؤال — الگوی جنگ را کپی نکن.');
        jadwalLines.push('3) بانک جنگ (نادم/سقوط/نظامی/…) را وارد نکن مگر حروف مخزن مجبور کند.');
        jadwalLines.push('4) تفسیر: ۲–۵ جمله روان برای صورت‌مسئلهٔ همین سؤال (ازدواج/سفر/کار/نام/…).');
      }
      jadwalLines.push('5) رنگ/هایلایت را فرمول استخراج فرض نکن؛ بعد از نطق، حروف مصرف‌شده در جدول جارو می‌شوند.');
      jadwalLines.push('6) جدول کاندید فقط پشتیبان است؛ محصول اصلی = نطق یک‌خطی + تفسیر. حرف خارج از مخزن ممنوع.');
      (result.jadwal.layers || []).forEach((row) => {
        jadwalLines.push(`- ${row.title}: ${row.str}`);
      });
      jadwalLines.push('');
    }
    const generator = [
      rules.isChoice ? 'تو مولّد نطق جفر هستی (حالت انتخاب بین گزینه‌ها).'
        : (rules.isYesNo ? 'تو مولّد نطق جفر هستی (حالت بله/خیر).'
          : (sentenceNatq ? 'تو مولّد نطق جفر هستی (جفر جدولی · نطق جمله‌ای).' : 'تو مولّد نطق جفر هستی (نطق آزاد + پیشنهاد دیکشنری).')),
      'کاندید بساز و رتبه‌بندی کن. داوری نهایی با پرامپت داور است.',
      sentenceNatq
        ? 'محصول اصلی: نطق یک‌خطی کلاسیک از مخزن A+B+C+D + تفسیر جدا. جدول کاندید فقط پشتیبان است.'
        : 'دیکشنری داخلی پیشنهاد است نه زندان. از حروف لایه‌ها می‌توانی نطق‌آزاد بسازی؛ حرف جدید خارج از لایه ممنوع.',
      '', '## صورت مسئله', ...metaLines(meta), '',
      '## روش محاسباتی',
      `- قاعده: ${result.method}`, `- دایره/جدول: ${result.options.table}`,
      result.mizan != null ? `- میزان: ${result.mizan}` : null,
      `- بسط: ${result.options.bastMode || '—'}`, `- تکسیر: ${result.options.takseer || '—'}`, `- تخلیص: ${result.options.takhlis || '—'}`, '',
      '## خروجی محاسبات',
      `- اساس: ${result.asas}`, `- نظیره: ${result.nazira}`, `- جمع جمل اساس: ${result.jamal}`, `- مدخل: ${result.madkhal}`,
      result.mizan != null ? `- میزان جدولی: ${result.mizan}` : null,
      `- مستحصله کامل: ${result.mustehsila}`, `- شمارش حروف: ${letterBag(result.mustehsila)}`, `- حروف بدون تکرار: ${result.mustehsilaUnique}`, '',
      ...jadwalLines, ...assist, '', ...stabilityLines, '', ...choiceLines, ...rules.lines, '', '## درخواست مولّد',
      ...(rules.isChoice ? ['1) فقط گزینه‌های سؤال را مقایسه کن.', '2) جدول پوشش + عنصر + مدخل + پایداری را مبنا بگیر.', '3) ۳ تا ۵ رتبه + ۲–۴ جمله توضیح بده.', '4) کاندیدهای پایدار را علامت بزن.']
        : rules.isYesNo ? ['1) بین آری/خیر/مبهم کاندید بده.', '2) ۲–۴ جمله دلیل از حروف/عنصر/مدخل.', '3) ۲ تا ۴ کاندید پشتیبان (دیکشنری یا نطق‌آزاد).']
        : sentenceNatq ? [
          '1) مخزن A+B+C+D و حروف اولویت را باز کن.',
          rules.isConflict
            ? '2) یک «نطق یک‌خطی کلاسیک» ۸–۲۵ کلمه‌ای فقط از همان حروف بساز (سبک: نادم شوند که … باخت سخت).'
            : '2) یک «نطق یک‌خطی کلاسیک» ۸–۲۵ کلمه‌ای فقط از همان حروف بساز؛ الگوی جنگ را کپی نکن و موضوع سؤال را رعایت کن.',
          rules.isConflict
            ? '3) در نطق یک‌خطی نام طرفین ننویس؛ ویرگول خبری کم کن؛ زنجیرهٔ که/و/به/ز.'
            : '3) بانک جنگ را وارد نکن مگر حروف مجبور کند؛ جزئیات روان در تفسیر.',
          '4) جدول کاندید پشتیبان بده (معنادار؛ پنجرهٔ بی‌معنا غالب نشود).',
          rules.isConflict
            ? '5) «تفسیر هوش مصنوعی» جدا بنویس و آنجا طرفین را نام ببر.'
            : '5) «تفسیر هوش مصنوعی» جدا بنویس برای همین صورت‌مسئله.',
          '6) قضاوت نهایی با داور.'
        ]
        : ['1) از دیکشنری شروع کن ولی به آن محدود نشو.', '2) در صورت نیاز نطق‌آزاد از لایه‌ها بساز.', '3) پایدارها را بالاتر بنویس.', '4) جدول ۳ تا ۸ کاندید + خوانش ۲ تا ۶ جمله‌ای بده؛ نهایی‌سازی با داور.'])
    ].filter((x) => x != null).join('\n');

    const judgeContext = [
      ...assist,
      '',
      ...stabilityLines,
      '',
      result.mizan != null ? `- میزان: ${result.mizan}` : null,
      result.jadwal ? `- سطر انتخاب: ${result.jadwal.selected}` : null,
      `- مستحصله: ${result.mustehsila}`,
      `- بدون تکرار: ${result.mustehsilaUnique}`,
      `- مدخل: ${result.madkhal}`
    ].filter((x) => x != null);
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
    const sentenceNatq = !!(bundle.primary && bundle.primary.options &&
      (bundle.primary.options.natqStyle === 'sentence' || bundle.primary.options.pipeline === 'jadwali' ||
        bundle.results.some((r) => r.options && r.options.pipeline === 'jadwali')));
    const rules = natqRulesBlock(meta, { multi: true, sentenceNatq });
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
      `### روش ${i + 1}: ${r.method}`, `- جدول: ${r.options.table}`, `- اساس: ${r.asas}`,
      `- جمل: ${r.jamal} | مدخل: ${r.madkhal}` + (r.mizan != null ? ` | میزان: ${r.mizan}` : ''),
      `- عناصر: ${elementProfile(r.mustehsila).summary}`, `- مستحصله کامل: ${r.mustehsila}`, `- شمارش حروف: ${letterBag(r.mustehsila)}`, `- بدون تکرار: ${r.mustehsilaUnique}`,
      r.jadwal ? `- سطر انتخاب جدولی: ${r.jadwal.selected}` : null
    ].filter(Boolean).join('\n'));
    const generator = [
      rules.isChoice ? 'تو مولّد نطق جفر هستی (انتخابی · چندروش).'
        : (sentenceNatq ? 'تو مولّد نطق جفر هستی (چندروش + جفر جدولی · نطق جمله‌ای).' : 'تو مولّد نطق جفر هستی (چندروش + نطق آزاد).'),
      'کاندید بساز و رتبه‌بندی کن. داوری نهایی با پرامپت داور است.',
      sentenceNatq
        ? 'محصول اصلی: نطق یک‌خطی کلاسیک از مخزن + تفسیر. کاندیدها پشتیبان‌اند.'
        : 'دیکشنری پیشنهاد است نه زندان. نطق‌آزاد از حروف لایه‌ها/حروف مشترک مجاز است؛ حرف جدید خارج از لایه ممنوع.',
      '', '## صورت مسئله', ...metaLines(meta), '', '## نتایج چندروش', ...blocks, '',
      '## لایه A — حروف مشترک همه روش‌ها',
      `- حروف مشترک: ${bundle.sharedUnique || '—'}`, `- شمارش: ${letterBag(bundle.sharedUnique || '')}`, `- عناصر مشترک: ${elementProfile(bundle.sharedUnique || '').summary}`,
      ...(bundle.results.length >= 6 ? ['نکته: تعداد روش‌ها زیاد است؛ حروف مشترک تنگ می‌شود — نطق‌آزاد از لایه‌های روش۱ و حروف پرتکرار هم مجاز است.'] : []),
      '', ...assist, '', ...stabilityLines, '', ...choiceLines, ...rules.lines, '', '## درخواست مولّد',
      ...(rules.isChoice
        ? ['1) جدول پوشش+عنصر+مدخل+پایداری گزینه‌ها را مبنا بگیر.', '2) رتبه‌بندی گزینه‌ها + ۲–۴ جمله توضیح.', '3) واژه‌های خارج از گزینه‌ها را جواب اصلی نکن.', '4) قضاوت نهایی قطعی را به داور واگذار کن.']
        : sentenceNatq
          ? [
            '1) مخزن جدولی ABCD را مبنا بگیر.',
            '2) نطق یک‌خطی کلاسیک بساز (سبک نادم شوند که …).',
            '3) تفسیر هوش مصنوعی جدا + نسبت طرفین در نزاع.',
            '4) جدول کاندید فقط پشتیبان؛ نهایی با داور.'
          ]
          : ['1) از دیکشنری و پایدارها شروع کن ولی محدود نشو.', '2) نطق‌آزاد از لایه A و لایه‌های نظیره/ترفع/تنزل بساز.', '3) جدول ۳ تا ۸ کاندید با پوشش/عنصر/مدخل/پایداری.', '4) خوانش ۲ تا ۶ جمله‌ای بده؛ نهایی‌سازی با داور.'])
    ].join('\n');

    const judgeContext = [
      ...assist,
      '',
      ...stabilityLines,
      '',
      `- حروف مشترک: ${bundle.sharedUnique || '—'}`,
      bundle.primary.mizan != null ? `- میزان روش۱: ${bundle.primary.mizan}` : null,
      `- مستحصله روش۱: ${bundle.primary.mustehsilaUnique}`,
      `- مدخل روش۱: ${bundle.primary.madkhal}`
    ].filter((x) => x != null);
    const judge = buildJudgePrompt(meta, judgeContext);
    return { generator, judge, prompt: generator, stability, dict: merged, ranked };
  }

  global.JafrEngine = {
    ABJAD_ORDER, ABJAD_KABIR, LETTER_NAMES, METHOD_PRESETS, JAMAL_LOCK_TARGET,
    normalizeText, normalizeDateTimeField, expandDigitsToWords,
    extractChoiceOptions, coverageAgainst, scoreChoiceOptions,
    detectTopic, detectQuestionProfile, extractConflictParties, letterElement, elementProfile,
    buildNatiqLayers, buildInternalDictionary, madkhalOfWord,
    analyzeStabilityForResult, analyzeStabilityForMulti, formatStabilityBlock, buildJudgePrompt, fillJudgePrompt,
    runClassic, runMany, buildReport, buildNatqPrompt, buildMultiReport, buildMultiNatqPrompt,
    describeOptions, sumAbjad, nazira, mapNazira, mapTarfa, mapTanzil, istintaqKabir, nisbatRow, haroofQuwa,
    computeMizan, analyzeJamalLock, analyzeNatqLock, planNatqHighlight,
    classifyQuestionScope, buildMustehsilaGrid,
    buildJadwalLayers, selectJadwalRow, extractByMizanStep, buildClassicLaqtBundle, shiftAbjad,
    applyTaraqi, applyTanzilCircle, applyTarfaGrid, applyMusawatGrid,
    takseerSadrMuakhkhar, takseerMuakhkharSadr, bastMalfuzi, bayyinat, takhlisLaqt
  };
})(typeof window !== 'undefined' ? window : globalThis);
