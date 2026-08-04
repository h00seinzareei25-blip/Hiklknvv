# میزان — اپ اندروید

برنامه WebView برای `mizan.html` با دسترسی اینترنت جهت OpenRouter.

## ساخت APK

```bash
export ANDROID_HOME=$HOME/android-sdk
cd android-mizan
cp ../mizan.html app/src/main/assets/mizan.html
./gradlew assembleDebug
```

خروجی:
- `app/build/outputs/apk/debug/app-debug.apk`

## نصب

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## OpenRouter

در بخش «تفسیر طبیعی»، کلید API را از https://openrouter.ai/keys وارد کنید، مدل‌های رایگان را بارگذاری و تیک بزنید.
