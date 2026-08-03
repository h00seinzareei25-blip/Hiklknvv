package ir.abnavaz.abyar.util;

import java.util.Locale;

public final class PersianNumbers {
    private static final char[] PERSIAN_DIGITS = {'۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'};

    private PersianNumbers() {
    }

    public static String format(int value) {
        return localize(String.format(Locale.US, "%,d", value));
    }

    public static String format(float value) {
        String text = value == Math.round(value)
                ? String.format(Locale.US, "%.0f", value)
                : String.format(Locale.US, "%.1f", value);
        return localize(text);
    }

    public static String localize(String text) {
        StringBuilder result = new StringBuilder(text.length());
        for (int i = 0; i < text.length(); i++) {
            char current = text.charAt(i);
            if (current >= '0' && current <= '9') {
                result.append(PERSIAN_DIGITS[current - '0']);
            } else if (current == ',') {
                result.append('٬');
            } else {
                result.append(current);
            }
        }
        return result.toString();
    }

    public static String normalize(String text) {
        StringBuilder result = new StringBuilder(text.length());
        for (int i = 0; i < text.length(); i++) {
            char current = text.charAt(i);
            if (current >= '۰' && current <= '۹') {
                result.append((char) ('0' + current - '۰'));
            } else if (current >= '٠' && current <= '٩') {
                result.append((char) ('0' + current - '٠'));
            } else {
                result.append(current);
            }
        }
        return result.toString();
    }
}
