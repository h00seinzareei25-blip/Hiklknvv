/**
 * ممیزی ۳۰ سؤال متنوع روی موتور جفر (v3)
 * اجرا: node test/audit30.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const code = fs.readFileSync(path.join(__dirname, '../www/js/engine.js'), 'utf8');
const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(code + '\nthis.JafrEngine = window.JafrEngine;', ctx);
const E = ctx.window.JafrEngine;

const DATE = 'پانزدهم مرداد هزار و چهارصد و پنج هجری شمسی در ایران';
const DATE_WAR = 'هشتم مراد هزاروچهارصدو پنج هجری شمسی در ایران';

const CASES = [
  { id: 1, tag: 'war+sael59', expectProfile: 'general', expectTopic: 'conflict', sael: 'نواب', soal: 'نتیجه نهایی جنگ اسراییل و آمریکا علیه ایران چگونه خواهد بود', date: DATE_WAR, notes: 'قفل ۵۰۲۲' },
  { id: 2, tag: 'war-central', expectProfile: 'general', expectTopic: 'conflict', sael: '', soal: 'نتیجه نهایی جنگ اسراییل و آمریکا علیه ایران چگونه خواهد بود', date: DATE_WAR, notes: 'مرکزی بدون سائل' },
  { id: 3, tag: 'marriage-yesno', expectProfile: 'yesno', expectTopic: 'yesno', sael: 'حسین', soal: 'آیا علی با فاطمه ازدواج خواهد کرد', date: DATE, modda: 'ازدواج' },
  { id: 4, tag: 'marriage-open', expectProfile: 'general', expectTopic: 'marriage', sael: 'حسین', soal: 'نتیجه پیوند حسین و فاطمه چگونه است', date: DATE, modda: 'ازدواج' },
  { id: 5, tag: 'travel-yesno', expectProfile: 'yesno', expectTopic: 'yesno', sael: 'مریم', soal: 'آیا این سفر به صلاح است', date: DATE, modda: 'سفر' },
  { id: 6, tag: 'travel-open', expectProfile: 'general', expectTopic: 'travel', sael: 'مریم', soal: 'نتیجه سفر مریم به مشهد چیست', date: DATE, modda: 'سفر' },
  { id: 7, tag: 'work', expectProfile: 'general', expectTopic: 'work', sael: 'رضا', soal: 'نتیجه معامله خرید خانه چگونه خواهد بود', date: DATE, modda: 'معامله' },
  { id: 8, tag: 'work-job', expectProfile: 'general', expectTopic: 'work', sael: 'سعید', soal: 'آینده شغل سعید در این شرکت چیست', date: DATE, modda: 'کار' },
  { id: 9, tag: 'cause-teeth', expectProfile: 'cause', expectTopic: 'medical_cause', sael: 'حسین', soal: 'علت دندان قروچه حسین در خواب چیست', date: DATE, modda: 'دندان قروچه' },
  { id: 10, tag: 'cause-why-pain', expectProfile: 'cause', expectTopic: 'medical_cause', sael: 'زهرا', soal: 'چرا سردرد شبانه دارم', date: DATE, modda: 'درد' },
  { id: 11, tag: 'cause-stress', expectProfile: 'cause', expectTopic: 'medical_cause', sael: 'علی', soal: 'دلیل اضطراب خواب علی چیست', date: DATE },
  { id: 12, tag: 'yesno-medicine', expectProfile: 'yesno', expectTopic: 'yesno', sael: 'حسین', soal: 'آیا این دارو برای من مفید است', date: DATE, modda: 'دارو' },
  { id: 13, tag: 'choice-herbs', expectProfile: 'choice', expectTopic: 'choice', sael: 'حسین', soal: 'بین سیر شنبلیله و سماق کدام مورد برای پایین اوردن چربی خون مفید است', date: DATE, modda: 'دارو گیاهی' },
  { id: 14, tag: 'herbal-name', expectProfile: 'name', expectTopic: 'herbal', sael: 'نرگس', soal: 'اسم گیاه آرامبخش مناسب چیست', date: DATE, modda: 'گیاه' },
  { id: 15, tag: 'lipid', expectProfile: 'general', expectTopic: 'herbal_lipid', sael: 'کامران', soal: 'گیاه مناسب برای کلسترول بالا کدام است', date: DATE, modda: 'چربی خون' },
  { id: 16, tag: 'timing', expectProfile: 'timing', expectTopic: 'marriage', sael: 'لیلا', soal: 'کی زمان مناسب ازدواج است', date: DATE, modda: 'ازدواج' },
  { id: 17, tag: 'name-person', expectProfile: 'name', expectTopic: 'name', sael: 'پدر', soal: 'نام مناسب برای نوزاد پسر چیست', date: DATE, modda: 'نام' },
  { id: 18, tag: 'sport-not-war', expectProfile: 'general', expectTopic: 'general', sael: 'احمد', soal: 'نتیجه مسابقه فوتبال استقلال و پرسپولیس چگونه خواهد بود', date: DATE, modda: 'ورزش', forbidTopic: 'conflict' },
  { id: 19, tag: 'economy-not-war', expectProfile: 'general', expectTopic: null, sael: 'بازرگان', soal: 'سقوط قیمت دلار چه اثری بر معامله دارد', date: DATE, modda: 'اقتصاد', forbidTopic: 'conflict' },
  { id: 20, tag: 'yesno-or-not', expectProfile: 'yesno', expectTopic: 'yesno', sael: 'مینا', soal: 'این کار به صلاح است یا نه', date: DATE },
  { id: 21, tag: 'general-open', expectProfile: 'general', expectTopic: 'general', sael: 'حسن', soal: 'نتیجه این نیت چگونه خواهد بود', date: DATE, modda: 'نیت' },
  { id: 22, tag: 'sael59-mahdi-war', expectProfile: 'general', expectTopic: 'conflict', sael: 'مهدی', soal: 'نتیجه نهایی جنگ اسراییل و آمریکا علیه ایران چگونه خواهد بود', date: DATE_WAR, notes: 'قفل با مهدی=۵۹' },
  { id: 23, tag: 'short-soal', expectProfile: 'general', expectTopic: null, sael: 'علی', soal: 'خیر است', date: DATE },
  { id: 24, tag: 'empty-sael-mehvari-ish', expectProfile: 'cause', expectTopic: 'medical_cause', sael: '', soal: 'علت بی‌خوابی اخیر چیست', date: DATE },
  { id: 25, tag: 'travel-yesno-alt', expectProfile: 'yesno', expectTopic: 'yesno', sael: 'نادر', soal: 'آیا رفتن به این سفر میسر است یا نه', date: DATE, modda: 'سفر' },
  { id: 26, tag: 'work-profit', expectProfile: 'yesno', expectTopic: 'yesno', sael: 'کاوه', soal: 'آیا این معامله سود دارد', date: DATE, modda: 'معامله' },
  { id: 27, tag: 'marriage-choice', expectProfile: 'choice', expectTopic: 'choice', sael: 'مادر', soal: 'بین فاطمه و زهرا کدام برای علی مناسب‌تر است', date: DATE, modda: 'ازدواج' },
  { id: 28, tag: 'numeric-date', expectProfile: 'general', expectTopic: 'marriage', sael: 'حسین', soal: 'نتیجه ازدواج حسین چگونه است', date: '1405/05/15', modda: 'ازدواج', notes: 'تاریخ عددی ≠ حروفی' },
  { id: 29, tag: 'long-soal', expectProfile: 'cause', expectTopic: 'medical_cause', sael: 'حسین', soal: 'علت اصلی دندان قروچه در خواب شبانه و فشار فک چیست و از چه ناشی میشود', date: DATE },
  { id: 30, tag: 'war-soft-false', expectProfile: 'general', expectTopic: null, sael: 'دانشجو', soal: 'نتیجه امتحان سخت نظامی چیست', date: DATE, modda: 'تحصیل', forbidTopic: 'conflict', notes: 'نظامی بدون جنگ نباید conflict شود مگر soft match' }
];

function runCase(c) {
  const meta = {
    sael: c.sael || '',
    taleb: c.taleb || '',
    matloob: c.matloob || '',
    modda: c.modda || '',
    soal: c.soal,
    questionDate: c.date || DATE
  };
  const input = Object.assign({}, meta, {
    options: { pipeline: 'jadwali', table: 'kabir', natqStyle: 'sentence' }
  });
  const profile = E.detectQuestionProfile(meta);
  const topic = E.detectTopic(meta);
  const result = E.runClassic(input);
  const issues = [];

  if (!result.ok) issues.push({ sev: 'critical', msg: 'اجرا ناموفق: ' + (result.error || '?') });

  // انتظارات پروفایل/موضوع
  if (c.expectProfile && profile.id !== c.expectProfile) {
    issues.push({ sev: 'high', msg: `پروفایل انتظار ${c.expectProfile} بود، شد ${profile.id}` });
  }
  if (c.expectTopic && topic.id !== c.expectTopic) {
    issues.push({ sev: 'high', msg: `موضوع انتظار ${c.expectTopic} بود، شد ${topic.id}` });
  }
  if (c.forbidTopic && topic.id === c.forbidTopic) {
    issues.push({ sev: 'high', msg: `موضوع ممنوع ${c.forbidTopic} به‌اشتباه تشخیص داده شد` });
  }

  // قفل جمل جنگ
  if (c.tag === 'war+sael59' || c.tag === 'sael59-mahdi-war') {
    if (!(result.jamal === 5022 && result.mizan === 10)) {
      issues.push({ sev: 'critical', msg: `قفل ۵۰۲۲/۱۰ بسته نشد (جمل=${result.jamal} میزان=${result.mizan})` });
    }
  }
  if (c.tag === 'war-central') {
    if (!(result.jamal === 4963 && result.mizan === 7)) {
      issues.push({ sev: 'high', msg: `مرکزی جنگ انتظار ۴۹۶۳/۷ داشت (جمل=${result.jamal} میزان=${result.mizan})` });
    }
  }

  // قفل ۵۰۲۲ نباید روی غیرجنگ فشار بیاورد
  if (topic.id !== 'conflict' && result.jamalLock && result.jamalLock.relevant && result.jamalLock.matched === false && /۵۰۲۲|5022/.test(result.jamalLock.summary || '')) {
    // relevant true on non-war is a problem
    issues.push({ sev: 'medium', msg: 'قفل جنگ روی سؤال غیرجنگ relevant شده: ' + result.jamalLock.summary });
  }
  if (topic.id !== 'conflict' && result.jamalLock && result.jamalLock.relevant === true) {
    issues.push({ sev: 'high', msg: 'قفل جمل جنگ برای سؤال غیرجنگ relevant=true' });
  }

  // مستحصله / بذر
  if (!result.mustehsila || !result.mustehsila.length) issues.push({ sev: 'critical', msg: 'مستحصله خالی' });
  if (!result.natqSeed || !result.natqSeed.afterNazira) issues.push({ sev: 'high', msg: 'بذر نطق A ندارد' });
  if (!result.natqChecklist || result.natqChecklist.items.length < 6) issues.push({ sev: 'medium', msg: 'چک‌لیست نطق ناقص' });

  // علت: بدون آری‌خیر در بانک و دیکشنری
  if (topic.id === 'medical_cause' || profile.id === 'cause') {
    if ((topic.bank || []).some((w) => E.isPolarBankWord(w))) {
      issues.push({ sev: 'high', msg: 'بانک علت شامل آری/خیر است' });
    }
    const dict = E.buildInternalDictionary(
      (result.jadwal && result.jadwal.poolABCD) || result.mustehsila,
      meta,
      { madkhal: result.madkhal, table: 'kabir' }
    );
    const polarHits = (dict.candidates || []).filter((x) => E.isPolarBankWord(x.word) || E.isPolarBankWord(x.norm));
    if (polarHits.length) {
      issues.push({ sev: 'high', msg: 'دیکشنری علت کاندید قطبی دارد: ' + polarHits.map((x) => x.word).join(',') });
    }
    const prompt = E.buildNatqPrompt(result, meta).generator || '';
    if (!/تشخیص پزشکی/.test(prompt)) issues.push({ sev: 'medium', msg: 'پرامپت علت هشدار غیرپزشکی ندارد' });
    if (/پاسخ قطبی آری/.test(prompt)) issues.push({ sev: 'high', msg: 'پرامپت علت قالب بله‌خیر دارد' });
  }

  // پرامپت جدولی
  let prompt = '';
  try {
    prompt = E.buildNatqPrompt(result, meta).generator || '';
  } catch (e) {
    issues.push({ sev: 'critical', msg: 'ساخت پرامپت شکست: ' + e.message });
  }
  if (prompt && prompt.length < 200) issues.push({ sev: 'medium', msg: 'پرامپت خیلی کوتاه' });
  if (topic.id === 'conflict' && prompt && !/نطق یک‌خطی/.test(prompt)) {
    issues.push({ sev: 'medium', msg: 'پرامپت جنگ بدون قالب نطق یک‌خطی' });
  }

  // ستون جدولی فقط از سؤال
  if (result.jadwal && result.columnBase) {
    const soalNorm = E.normalizeText(c.soal);
    if (result.columnBase.length !== soalNorm.length) {
      // ممکن است نرمال‌سازی متفاوت باشد — فقط اگر اختلاف زیاد
      const diff = Math.abs(result.columnBase.length - soalNorm.length);
      if (diff > 2) {
        issues.push({ sev: 'medium', msg: `طول ستون (${result.columnBase.length}) با نرمال سؤال (${soalNorm.length}) فرق زیاد دارد` });
      }
    }
  }

  // تاریخ عددی vs حروفی — فقط گزارش اختلاف جمل با حروفی
  if (c.tag === 'numeric-date') {
    const letterRun = E.runClassic(Object.assign({}, input, {
      questionDate: DATE,
      options: input.options
    }));
    if (letterRun.ok && letterRun.jamal === result.jamal) {
      issues.push({ sev: 'low', msg: 'تاریخ عددی و حروفی جمل یکسان شد (ممکن است نرمال رقم‌به‌واژه اثر بگذارد)' });
    }
  }

  // draft یک‌خطی که فقط چسباندن قطبی باشد
  const draft = (result.natqSeed && result.natqSeed.draftLine) || '';
  if (profile.id === 'cause' || topic.id === 'medical_cause') {
    const polarInDraft = (draft.split(/\s+/)).filter((w) => E.isPolarBankWord(w));
    if (polarInDraft.length) {
      issues.push({ sev: 'high', msg: 'بذر علت واژهٔ قطبی دارد: ' + polarInDraft.join(',') });
    }
    const polarWords = ((result.natqSeed && result.natqSeed.candidateWords) || [])
      .filter((w) => w.complete && E.isPolarBankWord(w.word));
    if (polarWords.length) {
      issues.push({ sev: 'high', msg: 'واژه‌پوش علت شامل قطبی: ' + polarWords.map((w) => w.word).join(',') });
    }
  }

  // کوتاه بودن سؤال
  if (E.normalizeText(c.soal).length < 5) {
    issues.push({ sev: 'low', msg: 'سؤال خیلی کوتاه برای جدولی' });
  }

  // بذر خیلی شبیه بین موضوعات بی‌ربط (هشدار کیفیت)
  if (draft && /^(بد|شر)\s+رد\s+هل\s+سر\s+دل/.test(draft) && topic.id === 'medical_cause') {
    issues.push({ sev: 'low', msg: 'بذر علت با الگوی عمومی بد/رد/هل شروع شده (کیفیت واژه‌پوش)' });
  }

  return {
    id: c.id,
    tag: c.tag,
    soal: c.soal,
    sael: c.sael || '—',
    profile: profile.id,
    topic: topic.id,
    jamal: result.jamal,
    mizan: result.mizan,
    mustLen: result.mustehsila ? result.mustehsila.length : 0,
    draft: draft.slice(0, 80),
    scope: result.questionScope && result.questionScope.id,
    lockRelevant: !!(result.jamalLock && result.jamalLock.relevant),
    lockMatched: !!(result.jamalLock && result.jamalLock.matched),
    issues
  };
}

const rows = CASES.map(runCase);
const allIssues = [];
rows.forEach((r) => {
  r.issues.forEach((iss) => allIssues.push(Object.assign({ id: r.id, tag: r.tag }, iss)));
});

const bySev = { critical: 0, high: 0, medium: 0, low: 0 };
allIssues.forEach((i) => { bySev[i.sev] = (bySev[i.sev] || 0) + 1; });

console.log('=== ممیزی ۳۰ سؤال · جفر v3 ===\n');
rows.forEach((r) => {
  const flag = r.issues.length ? '⚠' : '✓';
  console.log(`${flag} #${r.id} [${r.tag}] profile=${r.profile} topic=${r.topic} jamal=${r.jamal} mizan=${r.mizan} must=${r.mustLen} scope=${r.scope || '—'}`);
  console.log(`   سؤال: ${r.soal}`);
  console.log(`   بذر: ${r.draft || '—'}`);
  if (r.issues.length) {
    r.issues.forEach((i) => console.log(`   → [${i.sev}] ${i.msg}`));
  }
  console.log('');
});

console.log('=== خلاصه ===');
console.log(`کل: ${rows.length} | بدون مسئله: ${rows.filter((r) => !r.issues.length).length} | با مسئله: ${rows.filter((r) => r.issues.length).length}`);
console.log(`شدت: critical=${bySev.critical} high=${bySev.high} medium=${bySev.medium} low=${bySev.low}`);
if (allIssues.length) {
  console.log('\n=== فهرست مسائل ===');
  allIssues.forEach((i) => console.log(`#${i.id} ${i.tag}: [${i.sev}] ${i.msg}`));
}

// خروجی JSON برای گزارش
const outPath = path.join(__dirname, 'audit30-report.json');
fs.writeFileSync(outPath, JSON.stringify({ summary: bySev, rows, allIssues }, null, 2), 'utf8');
console.log('\nگزارش JSON:', outPath);

process.exit(bySev.critical > 0 ? 2 : 0);
