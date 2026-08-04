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

const prompt = E.buildNatqPrompt(r, { sael: 'حسین', taleb: 'علی', matloob: 'فاطمه', modda: 'ازدواج', soal: 'سوال' });
assert(prompt.includes('مستحصله') && prompt.includes(r.mustehsila), 'پرامپت شامل مستحصله');

const multiPrompt = E.buildMultiNatqPrompt(multi, {
  sael: 'حسین', taleb: 'علی', matloob: 'فاطمه', modda: 'ازدواج', soal: 'سوال', extraEnabled: false
});
assert(multiPrompt.includes('نتایج چندروش') && multiPrompt.includes('خوانش غالب'), 'پرامپت تجمیعی چندروش');
assert(E.METHOD_PRESETS.length >= 6, 'حداقل ۶ پیش‌فرض روش');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
