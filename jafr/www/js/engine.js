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

    const steps = [];
    const normReport = {};

    const parts = {
      sael: normalizeText(input.sael, {}),
      taleb: normalizeText(input.taleb, {}),
      matloob: normalizeText(input.matloob, {}),
      modda: normalizeText(input.modda, {}),
      soal: normalizeText(input.soal, normReport)
    };

    // نرمال‌سازی همه اجزا با گزارش تجمیعی
    const allRaw = [input.sael, input.taleb, input.matloob, input.modda, input.soal].filter(Boolean).join(' ');
    const fullNorm = {};
    normalizeText(allRaw, fullNorm);

    steps.push({
      id: 'normalize',
      title: 'نرمال‌سازی حروف',
      input: allRaw,
      output: fullNorm.after,
      note: [
        fullNorm.mapped.length ? `تبدیل‌ها: ${fullNorm.mapped.slice(0, 12).join('، ')}${fullNorm.mapped.length > 12 ? '…' : ''}` : 'بدون تبدیل معادل',
        fullNorm.rejected.length ? `حروف ردشده: ${[...new Set(fullNorm.rejected)].join(' ')}` : 'بدون حرف ردشده'
      ].join(' | ')
    });

    let asas = parts.sael + parts.taleb + parts.matloob + parts.modda + parts.soal;
    steps.push({
      id: 'asas_raw',
      title: 'ساخت اساس (سطر پایه)',
      input: `سائل:${parts.sael} | طالب:${parts.taleb} | مطلوب:${parts.matloob} | مدعا:${parts.modda} | سؤال:${parts.soal}`,
      output: asas,
      note: `طول اساس: ${asas.length} حرف`
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

    return {
      ok: true,
      method: 'جفر کبیر کلاسیک',
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
      normalize: fullNorm
    };
  }

  function buildReport(result, meta) {
    if (!result.ok) return result.error;
    const lines = [];
    lines.push('گزارش محاسبات جفر');
    lines.push('====================');
    lines.push(`روش: ${result.method}`);
    lines.push(`دایره/جدول: ${result.options.table}`);
    lines.push(`تاریخ گزارش: ${meta.date || new Date().toLocaleString('fa-IR')}`);
    lines.push('');
    lines.push('صورت مسئله:');
    lines.push(`- سائل: ${meta.sael || '—'}`);
    lines.push(`- طالب: ${meta.taleb || '—'}`);
    lines.push(`- مطلوب: ${meta.matloob || '—'}`);
    lines.push(`- مدعا: ${meta.modda || '—'}`);
    lines.push(`- سؤال: ${meta.soal || '—'}`);
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

  function buildNatqPrompt(result, meta) {
    if (!result.ok) return result.error;
    return [
      'تو یک متخصص نطق در علم جفر هستی.',
      'فقط از حروف مستحصله زیر برای ساخت جواب استفاده کن.',
      'حرف جدید اضافه نکن. اگر لازم شد حداکثر جابه‌جایی/حذف محدود طبق قواعد نطق مجاز است.',
      'چند خوانش ممکن بده، نه یک ادعای قطعی.',
      '',
      '## صورت مسئله',
      `- سائل: ${meta.sael || '—'}`,
      `- طالب: ${meta.taleb || '—'}`,
      `- مطلوب: ${meta.matloob || '—'}`,
      `- مدعا: ${meta.modda || '—'}`,
      `- سؤال: ${meta.soal || '—'}`,
      '',
      '## روش محاسباتی',
      `- قاعده: ${result.method}`,
      `- دایره/جدول: ${result.options.table}`,
      `- بسط: ${result.options.bastMode}`,
      `- تکسیر: ${result.options.takseer}`,
      `- تخلیص: ${result.options.takhlis}`,
      '- خلاصه مراحل: نرمال‌سازی → اساس → ابجد/مداخل → نظیره → مزج → بسط/بینات → تکسیر → تخلیص → مستحصله',
      '',
      '## خروجی محاسبات',
      `- اساس: ${result.asas}`,
      `- نظیره: ${result.nazira}`,
      `- جمع جمل اساس: ${result.jamal}`,
      `- مدخل: ${result.madkhal}`,
      `- مستحصله (حروف نهایی): ${result.mustehsila}`,
      `- حروف بدون تکرار: ${result.mustehsilaUnique}`,
      `- تعداد حروف مستحصله: ${result.letterCount}`,
      '',
      '## درخواست از تو',
      '1) ۳ تا ۵ نطق ممکن از مستحصله بساز',
      '2) برای هر نطق بنویس: عبارت جواب + حروف استفاده‌شده + میزان اطمینان (کم/متوسط/زیاد)',
      '3) در پایان یک «بهترین خوانش پیشنهادی» بده و دلیل کوتاه بیاور',
      '4) اگر حروف برای جواب کامل کافی نیست، صریح بگو',
      '5) خروجی را به فارسی بنویس'
    ].join('\n');
  }

  global.JafrEngine = {
    ABJAD_ORDER,
    ABJAD_KABIR,
    LETTER_NAMES,
    normalizeText,
    runClassic,
    buildReport,
    buildNatqPrompt,
    sumAbjad,
    nazira,
    mapNazira,
    takseerSadrMuakhkhar,
    takseerMuakhkharSadr,
    bastMalfuzi,
    bayyinat
  };
})(typeof window !== 'undefined' ? window : globalThis);
