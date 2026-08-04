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

const r = E.runClassic({
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
});
assert(r.ok === true, 'اجرای کلاسیک موفق');
assert(!!r.mustehsila && r.mustehsila.length > 0, 'مستحصله غیرخالی');
assert(r.steps.length >= 7, 'حداقل ۷ مرحله');
const prompt = E.buildNatqPrompt(r, { sael: 'حسین', taleb: 'علی', matloob: 'فاطمه', modda: 'ازدواج', soal: 'سوال' });
assert(prompt.includes('مستحصله') && prompt.includes(r.mustehsila), 'پرامپت شامل مستحصله');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
