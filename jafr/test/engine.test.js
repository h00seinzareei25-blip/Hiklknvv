/**
 * تست‌های سبک موتور جفر (Node)
 * اجرا: node test/engine.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const code = fs.readFileSync(path.join(__dirname, '../www/js/engine.js'), 'utf8');
const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(code + '\nthis.JafrEngine = window.JafrEngine;', ctx);
const E = ctx.window.JafrEngine;

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log('✓', msg);
  } else {
    failed++;
    console.error('✗', msg);
  }
}

assert(E.normalizeText('آیا علی؟') === 'ایاعلی', 'نرمال‌سازی همزه و حذف علائم');
assert(E.normalizeText('گچپژ') === 'کجبز', 'تبدیل گچپژ');
assert(E.normalizeText('ة') === 'ه', 'ة → ه');
assert(E.nazira('ا') === 'س', 'نظیره ا → س');
assert(E.nazira('ب') === 'ع', 'نظیره ب → ع');
assert(E.takseerSadrMuakhkhar('ABCDEF') === 'AFBECD', 'تکسیر صدر و مؤخر');
assert(E.takseerMuakhkharSadr('ABCDEF') === 'FAEBDC', 'تکسیر مؤخر و صدر');
assert(E.sumAbjad('محمد', 'kabir').sum === 92, 'ابجد محمد = ۹۲');
assert(E.expandDigitsToWords('14') === 'یکچهار', 'تبدیل ارقام به واژه');
assert(E.normalizeDateTimeField('14:30').includes('یک'), 'نرمال تاریخ/ساعت با رقم');

const baseInput = {
  sael: 'حسین',
  taleb: 'علی',
  matloob: 'فاطمه',
  modda: 'ازدواج',
  soal: 'آیا علی با فاطمه ازدواج خواهد کرد',
  options: {
    table: 'kabir',
    bastMode: 'bayyinat',
    takseer: 'sadr_muakhkhar',
    takhlis: 'odd',
    mazjNazira: true,
    removeDupAsas: false,
    takseerRounds: 1
  }
};

const r = E.runClassic(baseInput);
assert(r.ok === true, 'اجرای کلاسیک موفق');
assert(!!r.mustehsila && r.mustehsila.length > 0, 'مستحصله غیرخالی');
assert(r.steps.length >= 7, 'حداقل ۷ مرحله');

const withExtra = E.runClassic(Object.assign({}, baseInput, {
  extraEnabled: true,
  saelFamily: 'رضایی',
  talebFamily: 'محمدی',
  matloobFamily: 'احمدی',
  questionDate: '1404/05/13',
  questionTime: '14:30'
}));
assert(withExtra.ok === true, 'اجرا با اطلاعات تکمیلی');
assert(withExtra.asas.length > r.asas.length, 'اساس با فامیلی/تاریخ طولانی‌تر است');
assert(withExtra.mustehsila !== r.mustehsila, 'مستحصله با تکمیلی متفاوت است');

const multi = E.runMany(baseInput, ['classic_bayyinat', 'classic_malfuzi', 'muakhkhar_sadr'], { table: 'kabir' });
assert(multi.ok === true, 'اجرای چندروش');
assert(multi.results.length === 3, '۳ نتیجه چندروش');
assert(typeof multi.sharedUnique === 'string', 'حروف مشترک موجود است');

const promptPack = E.buildNatqPrompt(r, { sael: 'حسین', taleb: 'علی', matloob: 'فاطمه', modda: 'ازدواج', soal: 'سوال' });
const prompt = promptPack.generator || promptPack.prompt || promptPack;
assert(prompt.includes('مستحصله') && prompt.includes(r.mustehsila), 'پرامپت شامل مستحصله');

const multiPromptPack = E.buildMultiNatqPrompt(multi, {
  sael: 'حسین', taleb: 'علی', matloob: 'فاطمه', modda: 'ازدواج', soal: 'سوال', extraEnabled: false
});
const multiPrompt = multiPromptPack.generator || multiPromptPack.prompt || multiPromptPack;
assert(multiPrompt.includes('لایه A') && multiPrompt.includes('مولّد'), 'پرامپت تجمیعی چندروش پیشرفته');
const withDate = E.runClassic({
  sael: 'حسین', taleb: '', matloob: '', modda: 'جنگ',
  soal: 'نتیجه جنگ چگونه خواهد بود',
  extraEnabled: false,
  questionDate: '1405/05/14',
  options: { pipeline: 'jadwali', table: 'kabir' }
});
assert(withDate.ok && withDate.asas.includes(E.normalizeDateTimeField('1405/05/14')), 'تاریخ بدون تیک تکمیلی وارد اساس جدولی می‌شود');
assert(withDate.steps.some((s) => /تاریخ/.test(s.input || '') || /تاریخ/.test(s.note || '')), 'تاریخ در مراحل دیده می‌شود');
assert(E.METHOD_PRESETS.some((p) => p.id === 'laqt3'), 'پیش‌فرض لقط۳');
assert(E.METHOD_PRESETS.some((p) => p.id === 'laqt4'), 'پیش‌فرض لقط۴');
assert(E.METHOD_PRESETS.some((p) => p.id === 'fifteen_line'), 'پیش‌فرض ۱۵ سطری');
assert(E.METHOD_PRESETS.some((p) => p.id === 'jadwali_mizan'), 'پیش‌فرض جدولی میزان‌دار');
assert(E.METHOD_PRESETS.some((p) => p.id === 'jadwali_tttm'), 'پیش‌فرض جدولی ترفع/ترقی/تنزل/مساوات');
assert(E.computeMizan(5022) === 10, 'میزان ۵۰۲۲ → ۱۰');
assert(E.computeMizan(28) === 28, 'میزان مضرب ۲۸ → ۲۸');

assert(E.applyTaraqi('اب') === 'بج', 'ترقی ا→ب ب→ج');
assert(E.applyTanzilCircle('بج') === 'اب', 'تنزل دایره‌ای');
assert(E.applyTarfaGrid('ک') === 'ب', 'ترفع ک→ب در جدول ۹تایی');
assert(E.applyMusawatGrid('ب') === 'ک', 'مساوات ب→ک');

const jadwali = E.runClassic({
  sael: '', taleb: '', matloob: '', modda: '',
  soal: 'نتیجه جنگ چگونه خواهد بود',
  options: { pipeline: 'jadwali', table: 'kabir', methodId: 'jadwali_mizan', jadwalModel: 'quarter28' }
});
assert(jadwali.ok && jadwali.mizan > 0, 'اجرای جدولی میزان‌دار');
assert(jadwali.jadwal && jadwali.jadwal.layers.length === 8, '۸ لایه جدولی');
assert(jadwali.jadwal.model === 'quarter28', 'مدل ربع دایره');
assert(jadwali.jadwal.classicLaqt && jadwali.jadwal.classicLaqt.step === jadwali.mizan, 'لقط کلاسیک با گام میزان');
assert(jadwali.jadwal.classicLaqt.fromAsas.length > 0, 'لقط کلاسیک از اساس سؤال');
assert(jadwali.jadwal.selected.length === jadwali.columnBase.length, 'سطر انتخاب هم‌طول ستون‌های سؤال');
assert(jadwali.jadwal.poolABCD && jadwali.jadwal.poolABCD.length === jadwali.columnBase.length * 4, 'مخزن ABCD');
assert(jadwali.mustehsila.length > 0, 'مستحصله جدولی غیرخالی');

const jadwaliTttm = E.runClassic({
  sael: 'مهدی', taleb: '', matloob: '', modda: '',
  soal: 'نتیجه نهایی جنگ اسراییل و آمریکا علیه ایران چگونه خواهد بود',
  questionDate: 'هشتم مراد هزاروچهارصدو پنج هجری شمسی در ایران',
  options: { pipeline: 'jadwali', table: 'kabir', jadwalModel: 'tttm' }
});
assert(jadwaliTttm.ok && jadwaliTttm.jadwal.model === 'tttm', 'مدل tttm');
assert(jadwaliTttm.jamal === 5022 && jadwaliTttm.mizan === 10, 'tttm همچنان میزان از اساس کامل');
assert(jadwaliTttm.columnBase.length === 49, 'tttm ستون ۴۹');
assert(jadwaliTttm.jadwal.layers[0].title.includes('مساوات'), 'سطر اول مساوات');
assert(jadwaliTttm.steps.some((s) => s.id === 'jadwal_laqt_classic'), 'گام لقط کلاسیک در مراحل');
assert(E.describeOptions({ pipeline: 'jadwali', jadwalModel: 'tttm' }).includes('ترفع'), 'توضیح مدل tttm');

const layersQ = E.buildJadwalLayers(E.normalizeText('نتیجه نهایی جنگ'));
assert(layersQ.C === layersQ.nA && layersQ.D === layersQ.nB, 'C=نظیرهA و D=نظیرهB');
const layersT = E.buildJadwalLayers(E.normalizeText('نتیجه'), 'tttm');
assert(layersT.model === 'tttm' && layersT.B === E.applyTaraqi(layersT.A), 'tttm ترقی از اساس');
const warAsas = E.normalizeText('نتیجه نهایی جنگ اسراییل و آمریکا علیه ایران چگونه خواهد بود');
assert(warAsas.length === 49, 'سؤال جنگ = ۴۹ ستون');
const warLayers = E.buildJadwalLayers(warAsas);
const warTarget = E.normalizeText('نادم شوند که نهایت گرفت عمید سقوط حصول به خوف نظامی باخت سخت');
assert(E.coverageAgainst(warTarget, warLayers.poolABCD).complete, 'جواب نمونه تصویر از مخزن ABCD قابل‌ساخت است');

// تفکیک نقش: میزان از اساس کامل، ستون فقط از سؤال
const warDate = 'هشتم مراد هزاروچهارصدو پنج هجری شمسی در ایران';
const warSplit = E.runClassic({
  sael: '', taleb: '', matloob: '', modda: '',
  soal: 'نتیجه نهایی جنگ اسراییل و آمریکا علیه ایران چگونه خواهد بود',
  questionDate: warDate,
  options: { pipeline: 'jadwali', table: 'kabir' }
});
assert(warSplit.ok && warSplit.columnBase.length === 49, 'جدولی: ستون‌ها فقط سؤال = ۴۹');
assert(warSplit.asas.length > 49, 'جدولی: اساس کامل شامل تاریخ بلندتر از ستون‌هاست');
assert(warSplit.jamal === 4963 && warSplit.mizan === 7, 'بدون سائل: جمل ۴۹۶۳ / میزان ۷');
const warSael = E.runClassic({
  sael: 'مهدی', taleb: '', matloob: '', modda: '',
  soal: 'نتیجه نهایی جنگ اسراییل و آمریکا علیه ایران چگونه خواهد بود',
  questionDate: warDate,
  options: { pipeline: 'jadwali', table: 'kabir' }
});
assert(warSael.jamal === 5022 && warSael.mizan === 10, 'با سائل مهدی: جمل ۵۰۲۲ / میزان ۱۰');
assert(warSael.columnBase.length === 49, 'سائل عرض ستون را عوض نمی‌کند');
assert(warSael.jadwal.selected.length === 49, 'انتخاب روی ۴۹ ستون با میزان ۱۰');
assert(E.extractByMizanStep(warSael.columnBase, 10).length >= 4, 'لقط گام ۱۰ از ۴۹ ستون');
assert(warSael.jamalLock && warSael.jamalLock.matched, 'تشخیص قفل جمل بسته');
assert(warSael.jamalLock.saelJamal === 59, 'سائل مهدی جمل ۵۹');
assert(warSael.steps.some((s) => s.id === 'jamal_lock'), 'گام قفل جمل در مراحل');

assert(E.normalizeText('آمریکا') === 'امریکا', 'آ→ا کلاسیک');
assert(E.sumAbjad('مهدی').sum === 59 && E.sumAbjad('نواب').sum === 59, 'مهدی و نواب = ۵۹');

const warNawab = E.runClassic({
  sael: 'نواب', taleb: '', matloob: '', modda: '',
  soal: 'نتیجه نهایی جنگ اسراییل و آمریکا علیه ایران چگونه خواهد بود',
  questionDate: warDate,
  options: { pipeline: 'jadwali', table: 'kabir' }
});
assert(warNawab.jamal === 5022 && warNawab.mizan === 10, 'با سائل نواب: جمل ۵۰۲۲ / میزان ۱۰');

const lockDiag = E.analyzeJamalLock(4963, { sael: '' }, { table: 'kabir' });
assert(lockDiag.gap === 59 && lockDiag.recipes.length === 1 && lockDiag.recipes[0].classic, 'تحلیل قفل فقط دستور کلاسیک سائل ۵۹');
assert(E.JAMAL_LOCK_TARGET.jamal === 5022, 'ثابت هدف قفل');

// قفل نطق: مخزن‌آزاد + جاروی چندباره برای رنگ
const refNatq = 'نادم شوند که نهایت گرفت عمید سقوط حصول به خوف نظامی باخت سخت';
assert(E.coverageAgainst(E.normalizeText(refNatq), warSael.jadwal.poolABCD).complete, 'نطق مرجع از مخزن ABCD قابل‌ساخت است');
const hl = E.planNatqHighlight(refNatq, {
  A: warSael.jadwal.layers.find((l) => l.id === 'A').str,
  B: warSael.jadwal.layers.find((l) => l.id === 'B').str,
  C: warSael.jadwal.layers.find((l) => l.id === 'C').str,
  D: warSael.jadwal.layers.find((l) => l.id === 'D').str
});
assert(hl.complete && hl.sweeps === 6 && hl.picks.length === E.normalizeText(refNatq).length, 'جاروی ۶باره مسیر رنگ نطق مرجع را کامل می‌کند');
assert(hl.picks[0].row === 'A' && hl.picks[0].col === 1, 'شروع مسیر رنگ از A1');
assert(warSael.natqLock && warSael.natqLock.unlocked, 'قفل نطق در نتیجه باز علامت خورده');
assert(warSael.natqLock.reference && warSael.natqLock.reference.highlight.complete, 'نمونه مرجع جنگ مسیر رنگ کامل دارد');
assert(warSael.steps.some((s) => s.id === 'natq_lock'), 'گام قفل نطق در مراحل');
assert(E.analyzeNatqLock({ A: 'اب', B: 'جد', C: 'هز', D: 'حط', poolABCD: 'ابجدهزحط' }).unlocked, 'analyzeNatqLock unlocked');

const jadPrompt = E.buildNatqPrompt(jadwali, { sael: 'حسین', soal: 'نتیجه جنگ چگونه خواهد بود', modda: 'جنگ', extraEnabled: false });
assert(jadPrompt.generator.includes('میزان') && jadPrompt.generator.includes('نطق یک‌خطی'), 'پرامپت جدولی جمله‌ای');
assert(jadPrompt.generator.includes('مخزن') || jadPrompt.generator.includes('A+B+C+D'), 'پرامپت شامل مخزن ABCD');
assert(jadPrompt.generator.includes('نادم شوند') && jadPrompt.generator.includes('تفسیر هوش مصنوعی'), 'الگوی نطق یک‌خطی + تفسیر در پرامپت');
assert(jadPrompt.judge.includes('نطق یک‌خطی نهایی') && jadPrompt.judge.includes('تفسیر هوش مصنوعی'), 'داور خواهان نطق یک‌خطی + تفسیر است');

assert(E.takhlisLaqt('ابجدهوزحطی', 3) === 'ادزی', 'لقط گام ۳');
assert(E.takhlisLaqt('ابجدهوزحطیکل', 4) === 'اهط', 'لقط گام ۴');

const laqt3Run = E.runClassic({
  sael: 'حسین', taleb: 'علی', matloob: 'فاطمه', modda: 'ازدواج', soal: 'بین الف و ب کدام',
  options: { table: 'kabir', bastMode: 'bayyinat', takseer: 'sadr_muakhkhar', takhlis: 'laqt3', mazjNazira: true, takseerRounds: 1 }
});
assert(laqt3Run.ok && laqt3Run.mustehsila.length > 0, 'اجرای لقط۳');

const laqt4Run = E.runClassic({
  sael: 'حسین', taleb: 'علی', matloob: 'فاطمه', modda: 'ازدواج', soal: 'بین الف و ب کدام',
  options: { table: 'kabir', bastMode: 'bayyinat', takseer: 'sadr_muakhkhar', takhlis: 'laqt4', mazjNazira: true, takseerRounds: 1 }
});
assert(laqt4Run.ok && laqt4Run.mustehsila.length > 0, 'اجرای لقط۴');
assert(laqt4Run.mustehsila.length <= laqt3Run.mustehsila.length, 'لقط۴ معمولاً کوتاه‌تر/مساوی لقط۳');

const fifteen = E.runClassic({
  sael: 'حسین', taleb: 'علی', matloob: 'فاطمه', modda: 'ازدواج',
  soal: 'بین الف و ب کدام بهتر است',
  options: { pipeline: 'fifteen', table: 'kabir', methodId: 'fifteen_line' }
});
assert(fifteen.ok && fifteen.mustehsila.length > 0, 'اجرای ۱۵ سطری');
assert((fifteen.steps || []).filter((s) => String(s.id || '').startsWith('l')).length === 15, '۱۵ سطر برچسب‌دار');
assert(fifteen.fifteenLines && fifteen.fifteenLines[15] === fifteen.mustehsila, 'مستحصله = سطر ۱۵');
assert(E.describeOptions({ pipeline: 'fifteen' }) === 'جفر ۱۵ سطری', 'توضیح ۱۵ سطری');

const herbMeta = { sael: 'حسین', taleb: 'حسین', matloob: 'حسین', modda: 'دارو', soal: 'اسم دارو گیاهی برای ارامش اعصاب من', extraEnabled: false };
assert(E.detectTopic(herbMeta).id === 'herbal', 'تشخیص موضوع گیاهی');
const herbPrompt = (E.buildMultiNatqPrompt(multi, herbMeta).generator);
assert(E.detectTopic({ soal: 'نتیجه نهایی جنگ اسراییل و آمریکا علیه ایران چگونه خواهد بود', modda: 'جنگ' }).id === 'conflict', 'تشخیص موضوع جنگ');
assert(E.extractConflictParties({ soal: 'جنگ اسراییل و آمریکا علیه ایران چگونه خواهد بود' }).defenders.join('').includes('ایران'), 'استخراج مدافع ایران');
assert(herbPrompt.includes('به لیمو') && herbPrompt.includes('نطق معکوس') && herbPrompt.includes('بانک واژگانی'), 'پرامپت سخت‌گیر گیاهی');
assert(herbPrompt.includes('نطق‌آزاد') && herbPrompt.includes('زندان نیستند') && herbPrompt.includes('خوانش چندجمله‌ای'), 'نطق آزاد و خوانش چندجمله‌ای فعال است');
assert(!herbPrompt.includes('فقط از این‌ها رتبه‌بندی کن'), 'دیگر محدود به دیکشنری اجباری نیست');

const choiceSoal = 'بین سیر شنبلیله و سماق کدام مورد برای پایین اوردن چربی خون مفید است';
assert(JSON.stringify(E.extractChoiceOptions(choiceSoal)) === JSON.stringify(['سیر', 'شنبلیله', 'سماق']), 'استخراج گزینه‌های بین/کدام');
const choiceMeta = {
  sael: 'حسین', taleb: '', matloob: '', modda: 'دارو گیاهی', soal: choiceSoal,
  extraEnabled: true, saelFamily: 'زارعی', questionDate: '1404/05/13', questionTime: '12:47'
};
assert(E.detectTopic(choiceMeta).id === 'choice', 'تشخیص سؤال انتخابی');
const choiceBundle = E.runMany({
  sael: 'حسین', taleb: '', matloob: '', modda: 'دارو گیاهی', soal: choiceSoal,
  extraEnabled: true, saelFamily: 'زارعی', questionDate: '1404/05/13', questionTime: '12:47'
}, ['classic_bayyinat', 'classic_malfuzi', 'muakhkhar_sadr'], { table: 'kabir' });
const choicePrompt = E.buildMultiNatqPrompt(choiceBundle, choiceMeta).generator;
assert(choicePrompt.includes('برنده بین گزینه‌ها') && choicePrompt.includes('جدول پوشش') && choicePrompt.includes('سیر'), 'پرامپت انتخابی با جدول پوشش');
assert(!/اولویت با نام ۲ تا ۶ حرفی از دیکشنری داخلی/.test(choicePrompt), 'قواعد نام‌آزاد روی انتخابی اعمال نشود');

const yesMeta = { sael: 'حسین', modda: 'دارو', soal: 'آیا این دارو برای من مفید است', extraEnabled: false };
assert(E.detectQuestionProfile(yesMeta).id === 'yesno', 'پروفایل بله/خیر');
assert(E.detectQuestionProfile({ modda: 'دارو گیاهی', soal: 'اسم گیاه آرامبخش' }).id !== 'yesno', 'بدون آیا چندخوانشی می‌ماند');
assert(E.detectQuestionProfile({ modda: 'ازدواج', soal: 'نتیجه پیوند حسین و فاطمه' }).id !== 'yesno', 'بدون نشانه قطبی بله‌خیر نشود');
assert(E.detectQuestionProfile({ soal: 'بین سیر و سماق کدام بهتر است' }).id === 'choice', 'بین/کدام = انتخابی');
assert(/چندخوانشی|خوانش چندجمله‌ای/.test(E.detectQuestionProfile({ modda: 'دارو گیاهی', soal: '' }).outputHint), 'عمومی چندخوانشی');
const yesRun = E.runClassic(Object.assign({ taleb: '', matloob: '', options: { table: 'kabir', bastMode: 'bayyinat', takseer: 'sadr_muakhkhar', takhlis: 'odd', mazjNazira: true, takseerRounds: 1 } }, yesMeta));
const dict = E.buildInternalDictionary(yesRun.mustehsila, yesMeta, { madkhal: yesRun.madkhal, table: 'kabir' });
assert(dict.candidates.length > 0, 'دیکشنری داخلی غیرخالی');
assert(dict.layers.naziraUnique && dict.layers.tarfaUnique && dict.layers.tanzilUnique, 'لایه‌های ناطق موجود');
assert(E.letterElement('ا') === 'آتش' && E.letterElement('ب') === 'باد', 'عناصر حروف');
const yesPrompt = E.buildNatqPrompt(yesRun, yesMeta).generator;
assert(yesPrompt.includes('دیکشنری داخلی') && yesPrompt.includes('عناصر مستحصله') && yesPrompt.includes('بله / خیر'), 'پرامپت با ۴ لایه نطق');

const st = E.analyzeStabilityForResult({
  sael: 'حسین', taleb: '', matloob: '', modda: 'دارو', soal: 'آیا دارو مفید است',
  extraEnabled: true, saelFamily: 'زارعی', questionDate: '1404/05/13', questionTime: '12:00'
}, { table: 'kabir', bastMode: 'bayyinat', takseer: 'sadr_muakhkhar', takhlis: 'odd', mazjNazira: true, takseerRounds: 1 }, { sael: 'حسین', modda: 'دارو', soal: 'آیا دارو مفید است', extraEnabled: true });
assert(st.applicable && st.ok, 'تحلیل پایداری');
const pack = E.buildNatqPrompt(yesRun, yesMeta, { stability: st });
assert(pack.judge.includes('داور') && pack.judge.includes('PASTE_GENERATOR'), 'پرامپت داور');
assert(pack.generator.includes('پایدار'), 'مولّد شامل پایداری');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
