# میز کار جفر

اپ اندروید برای محاسبه اصولی علم جفر تا مستحصله، با پرامپت آمادهٔ نطق برای هوش مصنوعی.

## قابلیت‌ها

- صورت مسئله: سائل / طالب / مطلوب / مدعا / سؤال
- زنجیره جفر کبیر کلاسیک: نرمال‌سازی → اساس → ابجد/مداخل → نظیره → مزج → بینات/بسط → تکسیر → تخلیص → مستحصله
- نمایش گام‌به‌گام هر مرحله
- تنظیمات دقت (جدول ابجد، نوع تکسیر، بسط، حذف مکرر، اسقاط)
- کپی پرامپت نطق برای استفاده در ChatGPT / Claude / Gemini
- کپی گزارش کامل و مستحصله

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

## وب

فایل‌های وب در `www/` هستند و بدون اندروید هم در مرورگر کار می‌کنند.
