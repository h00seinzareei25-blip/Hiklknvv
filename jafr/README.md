# میز کار جفر

اپ اندروید برای محاسبه اصولی علم جفر تا مستحصله، با پرامپت آمادهٔ نطق برای هوش مصنوعی.

## نسخه‌ها

| نسخه | وضعیت | شاخه / تگ | APK |
|---|---|---|---|
| **v1** | ثابت (دست‌نخورده) | تگ `jafr-v1` · شاخه `cursor/jafr-android-app-e707` | `dist/jafr-workbench-v1-debug.apk` |
| **v2** | ثابت (تا اینجا) | تگ `jafr-v2` · شاخه `cursor/jafr-v2-e707` / `cursor/jafr-v2-frozen-e707` | `dist/jafr-workbench-v2-debug.apk` |
| **v3** | توسعه بعدی | شاخه `cursor/jafr-v3-e707` | `dist/jafr-workbench-debug.apk` (با هر بیلد عوض می‌شود) |

کارهای بعدی فقط روی **v3** انجام می‌شود تا v1 و v2 حفظ بمانند.

تحقیق کتب معتبر: [`docs/CLASSICAL.md`](docs/CLASSICAL.md).

## v2 (ثابت) — خلاصه

- قفل جمل محوری ۵۰۲۲/۱۰ (سائل جمل ۵۹)
- مستحضره کلاسیک چهار دسته
- اعداد مقرره + سنجش میزان
- بذر نطق کلاسیک (قمری + ابجد قطب)
- تاریخ فارسی حروفی («امروز فارسی» · هجری شمسی در ایران)
- جداسازی جنگ از سؤال‌های عمومی

## قابلیت‌های پایه (از v1)

- صورت مسئله: سائل / طالب / مطلوب / مدعا / سؤال
- اطلاعات تکمیلی اختیاری: فامیلی، تاریخ، ساعت
- تک‌روش / چندروش
- جفر جدولی میزان‌دار + روش‌های کلاسیک / لقط / ۱۵ سطری
- پرامپت مولّد / داور برای نطق

## ساخت APK

```bash
export ANDROID_HOME=$HOME/android-sdk
export JAVA_HOME=$(dirname $(dirname $(readlink -f $(which javac))))
cd jafr
npm install
npx cap sync android
cd android
./gradlew assembleDebug
```

خروجی:
`android/app/build/outputs/apk/debug/app-debug.apk`

کپی آماده:
- v1 ثابت: `dist/jafr-workbench-v1-debug.apk`
- v2 ثابت: `dist/jafr-workbench-v2-debug.apk`
- بیلد جاری (v3): `dist/jafr-workbench-debug.apk`

## وب

فایل‌های وب در `www/` هستند و بدون اندروید هم در مرورگر کار می‌کنند.

## تست

```bash
cd jafr && npm test
```
