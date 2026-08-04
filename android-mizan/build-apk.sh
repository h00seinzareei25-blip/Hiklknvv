#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"

cp "$ROOT/mizan.html" "$ROOT/android-mizan/app/src/main/assets/mizan.html"
cd "$ROOT/android-mizan"
./gradlew assembleDebug
mkdir -p "$ROOT/dist"
cp app/build/outputs/apk/debug/app-debug.apk "$ROOT/dist/mizan-raml-debug.apk"
echo "APK: $ROOT/dist/mizan-raml-debug.apk"
ls -lh "$ROOT/dist/mizan-raml-debug.apk"
