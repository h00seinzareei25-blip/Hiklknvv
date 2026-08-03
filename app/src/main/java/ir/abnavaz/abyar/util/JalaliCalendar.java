package ir.abnavaz.abyar.util;

import java.util.Calendar;
import java.util.Locale;

/** Gregorian ↔ Jalali helpers for the Persian calendar UI. */
public final class JalaliCalendar {
    private JalaliCalendar() {
    }

    public static int[] toJalali(int gy, int gm, int gd) {
        int[] gDays = {0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334};
        int gy2 = gm > 2 ? gy + 1 : gy;
        int days = 355666 + (365 * gy) + ((gy2 + 3) / 4) - ((gy2 + 99) / 100)
                + ((gy2 + 399) / 400) + gd + gDays[gm - 1];
        int jy = -1595 + (33 * (days / 12053));
        days %= 12053;
        jy += 4 * (days / 1461);
        days %= 1461;
        if (days > 365) {
            jy += (days - 1) / 365;
            days = (days - 1) % 365;
        }
        int jm;
        int jd;
        if (days < 186) {
            jm = 1 + days / 31;
            jd = 1 + days % 31;
        } else {
            jm = 7 + (days - 186) / 30;
            jd = 1 + (days - 186) % 30;
        }
        return new int[]{jy, jm, jd};
    }

    public static int[] fromJalali(int jy, int jm, int jd) {
        jy += 1595;
        int days = -355668 + (365 * jy) + ((jy / 33) * 8) + (((jy % 33) + 3) / 4)
                + jd + (jm < 7 ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
        int gy = 400 * (days / 146097);
        days %= 146097;
        if (days > 36524) {
            gy += 100 * (--days / 36524);
            days %= 36524;
            if (days >= 365) {
                days++;
            }
        }
        gy += 4 * (days / 1461);
        days %= 1461;
        if (days > 365) {
            gy += (days - 1) / 365;
            days = (days - 1) % 365;
        }
        int gd = days + 1;
        int[] salA = {0, 31, (gy % 4 == 0 && gy % 100 != 0) || gy % 400 == 0 ? 29 : 28,
                31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
        int gm = 0;
        while (gm < 13 && gd > salA[gm]) {
            gd -= salA[gm];
            gm++;
        }
        return new int[]{gy, gm, gd};
    }

    public static int[] today() {
        Calendar calendar = Calendar.getInstance();
        return toJalali(
                calendar.get(Calendar.YEAR),
                calendar.get(Calendar.MONTH) + 1,
                calendar.get(Calendar.DAY_OF_MONTH)
        );
    }

    public static String monthName(int month) {
        String[] names = {
                "", "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
                "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
        };
        if (month < 1 || month > 12) {
            return "";
        }
        return names[month];
    }

    public static int daysInMonth(int jy, int jm) {
        if (jm <= 6) {
            return 31;
        }
        if (jm <= 11) {
            return 30;
        }
        return isLeap(jy) ? 30 : 29;
    }

    public static boolean isLeap(int jy) {
        int cycle = ((jy - (jy > 0 ? 474 : 473)) % 2820) + 474;
        return ((cycle + 38) * 682) % 2816 < 682;
    }

    public static String formatToday() {
        int[] j = today();
        Calendar calendar = Calendar.getInstance();
        String weekday = calendar.getDisplayName(Calendar.DAY_OF_WEEK, Calendar.LONG, new Locale("fa"));
        return weekday + "، " + j[2] + " " + monthName(j[1]) + " " + j[0];
    }

    /** Saturday=0 … Friday=6 for Persian week layout. */
    public static int weekdayIndex(int gy, int gm, int gd) {
        Calendar calendar = Calendar.getInstance();
        calendar.set(gy, gm - 1, gd);
        int dow = calendar.get(Calendar.DAY_OF_WEEK);
        // Calendar: Sunday=1 … Saturday=7 → convert to Sat=0
        return (dow % 7);
    }
}
