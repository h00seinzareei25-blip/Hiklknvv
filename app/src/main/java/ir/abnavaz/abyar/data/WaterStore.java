package ir.abnavaz.abyar.data;

import android.content.Context;
import android.content.SharedPreferences;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

public final class WaterStore {
    private static final String PREFS = "water_store";
    private static final String KEY_WEIGHT = "weight_kg";
    private static final String KEY_ONBOARDED = "onboarded";
    private static final String KEY_REMINDERS = "reminders_enabled";
    private static final String KEY_INTERVAL = "reminder_interval_minutes";
    private static final String KEY_START_HOUR = "reminder_start_hour";
    private static final String KEY_END_HOUR = "reminder_end_hour";
    private static final String KEY_LAST_AMOUNT = "last_amount_";
    private static final String KEY_TOTAL = "total_";
    private static final String KEY_COUNT = "count_";
    private static final float DEFAULT_WEIGHT = 70f;
    private static final int MAX_DAILY_ML = 20_000;

    private final SharedPreferences preferences;

    public WaterStore(Context context) {
        preferences = context.getApplicationContext()
                .getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public float getWeightKg() {
        return preferences.getFloat(KEY_WEIGHT, DEFAULT_WEIGHT);
    }

    public void setWeightKg(float weight) {
        float safe = Math.max(HydrationCalculator.MIN_WEIGHT_KG,
                Math.min(HydrationCalculator.MAX_WEIGHT_KG, weight));
        preferences.edit().putFloat(KEY_WEIGHT, safe).putBoolean(KEY_ONBOARDED, true).apply();
    }

    public boolean isOnboarded() {
        return preferences.getBoolean(KEY_ONBOARDED, false);
    }

    public int getGoalMl() {
        return HydrationCalculator.dailyGoalMl(getWeightKg());
    }

    public int getTodayTotalMl() {
        return getTotalForDay(dayKey(new Date()));
    }

    public int getTodayCount() {
        return preferences.getInt(KEY_COUNT + dayKey(new Date()), 0);
    }

    public synchronized int addWater(int amountMl) {
        if (amountMl <= 0) {
            return getTodayTotalMl();
        }
        String day = dayKey(new Date());
        int current = getTotalForDay(day);
        int updated = Math.min(MAX_DAILY_ML, current + amountMl);
        preferences.edit()
                .putInt(KEY_TOTAL + day, updated)
                .putInt(KEY_COUNT + day, preferences.getInt(KEY_COUNT + day, 0) + 1)
                .putInt(KEY_LAST_AMOUNT + day, updated - current)
                .apply();
        return updated;
    }

    public synchronized int undoLastWater() {
        String day = dayKey(new Date());
        int lastAmount = preferences.getInt(KEY_LAST_AMOUNT + day, 0);
        if (lastAmount <= 0) {
            return getTodayTotalMl();
        }
        int updated = Math.max(0, getTotalForDay(day) - lastAmount);
        int count = Math.max(0, preferences.getInt(KEY_COUNT + day, 0) - 1);
        preferences.edit()
                .putInt(KEY_TOTAL + day, updated)
                .putInt(KEY_COUNT + day, count)
                .remove(KEY_LAST_AMOUNT + day)
                .apply();
        return updated;
    }

    public int[] getLastSevenDaysMl() {
        int[] values = new int[7];
        Calendar calendar = Calendar.getInstance();
        calendar.add(Calendar.DAY_OF_YEAR, -6);
        for (int i = 0; i < values.length; i++) {
            values[i] = getTotalForDay(dayKey(calendar.getTime()));
            calendar.add(Calendar.DAY_OF_YEAR, 1);
        }
        return values;
    }

    public boolean remindersEnabled() {
        return preferences.getBoolean(KEY_REMINDERS, false);
    }

    public void setRemindersEnabled(boolean enabled) {
        preferences.edit().putBoolean(KEY_REMINDERS, enabled).apply();
    }

    public int getReminderIntervalMinutes() {
        return preferences.getInt(KEY_INTERVAL, 120);
    }

    public void setReminderIntervalMinutes(int minutes) {
        preferences.edit().putInt(KEY_INTERVAL, Math.max(30, minutes)).apply();
    }

    public int getStartHour() {
        return preferences.getInt(KEY_START_HOUR, 8);
    }

    public void setStartHour(int hour) {
        preferences.edit().putInt(KEY_START_HOUR, clampHour(hour)).apply();
    }

    public int getEndHour() {
        return preferences.getInt(KEY_END_HOUR, 22);
    }

    public void setEndHour(int hour) {
        preferences.edit().putInt(KEY_END_HOUR, clampHour(hour)).apply();
    }

    private int getTotalForDay(String day) {
        return preferences.getInt(KEY_TOTAL + day, 0);
    }

    private static int clampHour(int hour) {
        return Math.max(0, Math.min(23, hour));
    }

    private static String dayKey(Date date) {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(date);
    }
}
