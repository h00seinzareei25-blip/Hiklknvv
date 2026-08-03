package ir.abnavaz.abyar.data;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public final class WaterStore {
    private static final String PREFS = "water_store_v2";
    private static final String KEY_WEIGHT = "weight_kg";
    private static final String KEY_ONBOARDED = "onboarded";
    private static final String KEY_REMINDERS = "reminders_enabled";
    private static final String KEY_INTERVAL = "reminder_interval_minutes";
    private static final String KEY_START_HOUR = "reminder_start_hour";
    private static final String KEY_END_HOUR = "reminder_end_hour";
    private static final String KEY_NEXT_ALARM = "next_alarm_at";
    private static final String KEY_NEXT_SUMMARY = "next_summary_at";
    private static final String KEY_LAST_SUMMARY_DAY = "last_summary_day";
    private static final String KEY_ACTIVITY = "activity_level";
    private static final String KEY_HOT = "hot_weather";
    private static final String KEY_MANUAL_GOAL = "manual_goal_ml";
    private static final String KEY_DARK = "dark_mode";
    private static final String KEY_BATTERY_TIP = "battery_tip_shown";
    private static final String KEY_CUPS = "custom_cups";
    private static final String KEY_LOGS = "intake_logs";
    private static final String LEGACY_PREFS = "water_store";
    private static final float DEFAULT_WEIGHT = 70f;
    private static final int MAX_DAILY_ML = 20_000;
    private static final long LOG_RETENTION_MS = 60L * 24 * 60 * 60 * 1000;

    private final SharedPreferences preferences;

    public WaterStore(Context context) {
        preferences = context.getApplicationContext()
                .getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        migrateFromLegacy(context);
        ensureDefaultCups();
    }

    private void migrateFromLegacy(Context context) {
        if (preferences.contains(KEY_WEIGHT) || preferences.contains(KEY_ONBOARDED)) {
            return;
        }
        SharedPreferences legacy = context.getApplicationContext()
                .getSharedPreferences(LEGACY_PREFS, Context.MODE_PRIVATE);
        if (!legacy.contains("weight_kg") && !legacy.getBoolean("onboarded", false)) {
            return;
        }
        SharedPreferences.Editor editor = preferences.edit();
        editor.putFloat(KEY_WEIGHT, legacy.getFloat("weight_kg", DEFAULT_WEIGHT));
        editor.putBoolean(KEY_ONBOARDED, legacy.getBoolean("onboarded", false));
        editor.putBoolean(KEY_REMINDERS, legacy.getBoolean("reminders_enabled", false));
        editor.putInt(KEY_INTERVAL, legacy.getInt("reminder_interval_minutes", 120));
        editor.putInt(KEY_START_HOUR, legacy.getInt("reminder_start_hour", 8));
        editor.putInt(KEY_END_HOUR, legacy.getInt("reminder_end_hour", 22));
        String today = dayKey(new Date());
        int total = legacy.getInt("total_" + today, 0);
        if (total > 0) {
            JSONArray logs = new JSONArray();
            try {
                JSONObject entry = new JSONObject();
                entry.put("ts", System.currentTimeMillis());
                entry.put("ml", total);
                entry.put("type", "water");
                entry.put("effective", total);
                logs.put(entry);
                editor.putString(KEY_LOGS, logs.toString());
            } catch (JSONException ignored) {
            }
        }
        editor.apply();
    }

    private void ensureDefaultCups() {
        if (preferences.contains(KEY_CUPS)) {
            return;
        }
        try {
            JSONArray cups = new JSONArray();
            cups.put(cup("لیوان", 200));
            cups.put(cup("فنجان", 250));
            cups.put(cup("بطری", 500));
            cups.put(cup("قمقمه", 750));
            preferences.edit().putString(KEY_CUPS, cups.toString()).apply();
        } catch (JSONException ignored) {
        }
    }

    private static JSONObject cup(String name, int ml) throws JSONException {
        JSONObject object = new JSONObject();
        object.put("name", name);
        object.put("ml", ml);
        return object;
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

    public int getActivityLevel() {
        return preferences.getInt(KEY_ACTIVITY, HydrationCalculator.ACTIVITY_SEDENTARY);
    }

    public void setActivityLevel(int level) {
        preferences.edit().putInt(KEY_ACTIVITY, Math.max(0, Math.min(3, level))).apply();
    }

    public boolean isHotWeather() {
        return preferences.getBoolean(KEY_HOT, false);
    }

    public void setHotWeather(boolean hot) {
        preferences.edit().putBoolean(KEY_HOT, hot).apply();
    }

    public int getManualGoalMl() {
        return preferences.getInt(KEY_MANUAL_GOAL, 0);
    }

    public void setManualGoalMl(int ml) {
        preferences.edit().putInt(KEY_MANUAL_GOAL, Math.max(0, Math.min(MAX_DAILY_ML, ml))).apply();
    }

    public int getCalculatedGoalMl() {
        return HydrationCalculator.dailyGoalMl(getWeightKg(), getActivityLevel(), isHotWeather());
    }

    public int getGoalMl() {
        int manual = getManualGoalMl();
        return manual > 0 ? manual : getCalculatedGoalMl();
    }

    public boolean isDarkMode() {
        return preferences.getBoolean(KEY_DARK, false);
    }

    public void setDarkMode(boolean dark) {
        preferences.edit().putBoolean(KEY_DARK, dark).apply();
    }

    public boolean wasBatteryTipShown() {
        return preferences.getBoolean(KEY_BATTERY_TIP, false);
    }

    public void setBatteryTipShown(boolean shown) {
        preferences.edit().putBoolean(KEY_BATTERY_TIP, shown).apply();
    }

    public List<Cup> getCups() {
        List<Cup> cups = new ArrayList<>();
        try {
            JSONArray array = new JSONArray(preferences.getString(KEY_CUPS, "[]"));
            for (int i = 0; i < array.length(); i++) {
                JSONObject object = array.getJSONObject(i);
                cups.add(new Cup(object.getString("name"), object.getInt("ml")));
            }
        } catch (JSONException ignored) {
        }
        if (cups.isEmpty()) {
            cups.add(new Cup("لیوان", 200));
            cups.add(new Cup("فنجان", 250));
            cups.add(new Cup("بطری", 500));
        }
        return cups;
    }

    public void setCups(List<Cup> cups) {
        JSONArray array = new JSONArray();
        try {
            for (Cup cup : cups) {
                array.put(cup(cup.name, cup.ml));
            }
            preferences.edit().putString(KEY_CUPS, array.toString()).apply();
        } catch (JSONException ignored) {
        }
    }

    public int getTodayTotalMl() {
        return getTotalForDay(dayKey(new Date()));
    }

    public int getTodayCount() {
        return getCountForDay(dayKey(new Date()));
    }

    public long getLastIntakeTimestamp() {
        List<Intake> logs = getLogs();
        long latest = 0L;
        for (Intake intake : logs) {
            if (intake.timestamp > latest) {
                latest = intake.timestamp;
            }
        }
        return latest;
    }

    public synchronized int addWater(int amountMl) {
        return addIntake(amountMl, "water");
    }

    public synchronized int addIntake(int amountMl, String type) {
        if (amountMl <= 0) {
            return getTodayTotalMl();
        }
        String safeType = type == null ? "water" : type;
        int effective = HydrationCalculator.effectiveMl(amountMl, safeType);
        List<Intake> logs = getLogs();
        logs.add(new Intake(System.currentTimeMillis(), amountMl, safeType, effective));
        pruneAndSave(logs);
        return getTodayTotalMl();
    }

    public synchronized int undoLastWater() {
        List<Intake> logs = getLogs();
        String today = dayKey(new Date());
        for (int i = logs.size() - 1; i >= 0; i--) {
            if (dayKey(new Date(logs.get(i).timestamp)).equals(today)) {
                logs.remove(i);
                pruneAndSave(logs);
                break;
            }
        }
        return getTodayTotalMl();
    }

    public List<Intake> getTodayIntakes() {
        String today = dayKey(new Date());
        List<Intake> result = new ArrayList<>();
        for (Intake intake : getLogs()) {
            if (dayKey(new Date(intake.timestamp)).equals(today)) {
                result.add(intake);
            }
        }
        return result;
    }

    public int getTotalForDay(String day) {
        int total = 0;
        for (Intake intake : getLogs()) {
            if (dayKey(new Date(intake.timestamp)).equals(day)) {
                total += intake.effectiveMl;
            }
        }
        return Math.min(MAX_DAILY_ML, total);
    }

    public int getCountForDay(String day) {
        int count = 0;
        for (Intake intake : getLogs()) {
            if (dayKey(new Date(intake.timestamp)).equals(day)) {
                count++;
            }
        }
        return count;
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

    /** Day totals for a Jalali month, indexed 1..daysInMonth. */
    public int[] getMonthDayTotals(int jy, int jm) {
        int days = JalaliDays.daysInMonth(jy, jm);
        int[] totals = new int[days + 1];
        for (int day = 1; day <= days; day++) {
            int[] g = JalaliDays.fromJalali(jy, jm, day);
            Calendar calendar = Calendar.getInstance();
            calendar.set(g[0], g[1] - 1, g[2], 12, 0, 0);
            totals[day] = getTotalForDay(dayKey(calendar.getTime()));
        }
        return totals;
    }

    public int getStreak() {
        int goal = getGoalMl();
        if (goal <= 0) {
            return 0;
        }
        Calendar calendar = Calendar.getInstance();
        int streak = 0;
        if (getTodayTotalMl() >= goal) {
            streak = 1;
        }
        calendar.add(Calendar.DAY_OF_YEAR, -1);
        while (streak < 400) {
            if (getTotalForDay(dayKey(calendar.getTime())) < goal) {
                break;
            }
            streak++;
            calendar.add(Calendar.DAY_OF_YEAR, -1);
        }
        return streak;
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

    public long getNextAlarmAt() {
        return preferences.getLong(KEY_NEXT_ALARM, 0L);
    }

    public void setNextAlarmAt(long millis) {
        preferences.edit().putLong(KEY_NEXT_ALARM, millis).apply();
    }

    public long getNextSummaryAt() {
        return preferences.getLong(KEY_NEXT_SUMMARY, 0L);
    }

    public void setNextSummaryAt(long millis) {
        preferences.edit().putLong(KEY_NEXT_SUMMARY, millis).apply();
    }

    public String getLastSummaryDay() {
        return preferences.getString(KEY_LAST_SUMMARY_DAY, "");
    }

    public void setLastSummaryDay(String day) {
        preferences.edit().putString(KEY_LAST_SUMMARY_DAY, day).apply();
    }

    public int suggestedSipMl() {
        int remaining = Math.max(0, getGoalMl() - getTodayTotalMl());
        if (remaining == 0) {
            return 0;
        }
        int remainingSlots = Math.max(1, remainingReminderSlots());
        int suggestion = Math.round(remaining / (float) remainingSlots / 50f) * 50;
        return Math.max(100, Math.min(500, suggestion));
    }

    public int remainingReminderSlots() {
        Calendar now = Calendar.getInstance();
        int hour = now.get(Calendar.HOUR_OF_DAY);
        int end = getEndHour();
        int start = getStartHour();
        if (hour >= end) {
            return 1;
        }
        int from = Math.max(hour, start);
        int minutesLeft = Math.max(30, (end - from) * 60 - now.get(Calendar.MINUTE));
        return Math.max(1, minutesLeft / Math.max(30, getReminderIntervalMinutes()));
    }

    public String exportJson() throws JSONException {
        JSONObject root = new JSONObject();
        root.put("app", "abyar");
        root.put("version", 2);
        root.put("exportedAt", System.currentTimeMillis());
        root.put("weightKg", getWeightKg());
        root.put("activityLevel", getActivityLevel());
        root.put("hotWeather", isHotWeather());
        root.put("manualGoalMl", getManualGoalMl());
        root.put("darkMode", isDarkMode());
        root.put("remindersEnabled", remindersEnabled());
        root.put("reminderIntervalMinutes", getReminderIntervalMinutes());
        root.put("startHour", getStartHour());
        root.put("endHour", getEndHour());
        root.put("cups", new JSONArray(preferences.getString(KEY_CUPS, "[]")));
        root.put("logs", new JSONArray(preferences.getString(KEY_LOGS, "[]")));
        return root.toString(2);
    }

    public void importJson(String json) throws JSONException {
        JSONObject root = new JSONObject(json);
        SharedPreferences.Editor editor = preferences.edit();
        if (root.has("weightKg")) {
            editor.putFloat(KEY_WEIGHT, (float) root.getDouble("weightKg"));
            editor.putBoolean(KEY_ONBOARDED, true);
        }
        if (root.has("activityLevel")) {
            editor.putInt(KEY_ACTIVITY, root.getInt("activityLevel"));
        }
        if (root.has("hotWeather")) {
            editor.putBoolean(KEY_HOT, root.getBoolean("hotWeather"));
        }
        if (root.has("manualGoalMl")) {
            editor.putInt(KEY_MANUAL_GOAL, root.getInt("manualGoalMl"));
        }
        if (root.has("darkMode")) {
            editor.putBoolean(KEY_DARK, root.getBoolean("darkMode"));
        }
        if (root.has("remindersEnabled")) {
            editor.putBoolean(KEY_REMINDERS, root.getBoolean("remindersEnabled"));
        }
        if (root.has("reminderIntervalMinutes")) {
            editor.putInt(KEY_INTERVAL, root.getInt("reminderIntervalMinutes"));
        }
        if (root.has("startHour")) {
            editor.putInt(KEY_START_HOUR, root.getInt("startHour"));
        }
        if (root.has("endHour")) {
            editor.putInt(KEY_END_HOUR, root.getInt("endHour"));
        }
        if (root.has("cups")) {
            editor.putString(KEY_CUPS, root.getJSONArray("cups").toString());
        }
        if (root.has("logs")) {
            editor.putString(KEY_LOGS, root.getJSONArray("logs").toString());
        }
        editor.apply();
    }

    /** Health-compatible export rows for third-party apps / Health Connect bridges. */
    public String exportHealthCsv() {
        StringBuilder builder = new StringBuilder();
        builder.append("timestamp,amount_ml,type,effective_ml\n");
        for (Intake intake : getLogs()) {
            builder.append(intake.timestamp).append(',')
                    .append(intake.amountMl).append(',')
                    .append(intake.type).append(',')
                    .append(intake.effectiveMl).append('\n');
        }
        return builder.toString();
    }

    private List<Intake> getLogs() {
        List<Intake> logs = new ArrayList<>();
        try {
            JSONArray array = new JSONArray(preferences.getString(KEY_LOGS, "[]"));
            for (int i = 0; i < array.length(); i++) {
                JSONObject object = array.getJSONObject(i);
                logs.add(new Intake(
                        object.getLong("ts"),
                        object.getInt("ml"),
                        object.optString("type", "water"),
                        object.optInt("effective", object.getInt("ml"))
                ));
            }
        } catch (JSONException ignored) {
        }
        return logs;
    }

    private void pruneAndSave(List<Intake> logs) {
        long cutoff = System.currentTimeMillis() - LOG_RETENTION_MS;
        JSONArray array = new JSONArray();
        try {
            for (Intake intake : logs) {
                if (intake.timestamp >= cutoff) {
                    JSONObject object = new JSONObject();
                    object.put("ts", intake.timestamp);
                    object.put("ml", intake.amountMl);
                    object.put("type", intake.type);
                    object.put("effective", intake.effectiveMl);
                    array.put(object);
                }
            }
            preferences.edit().putString(KEY_LOGS, array.toString()).apply();
        } catch (JSONException ignored) {
        }
    }

    private static int clampHour(int hour) {
        return Math.max(0, Math.min(23, hour));
    }

    public static String dayKey(Date date) {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(date);
    }

    public static final class Cup {
        public final String name;
        public final int ml;

        public Cup(String name, int ml) {
            this.name = name;
            this.ml = ml;
        }
    }

    public static final class Intake {
        public final long timestamp;
        public final int amountMl;
        public final String type;
        public final int effectiveMl;

        public Intake(long timestamp, int amountMl, String type, int effectiveMl) {
            this.timestamp = timestamp;
            this.amountMl = amountMl;
            this.type = type;
            this.effectiveMl = effectiveMl;
        }
    }

    /** Tiny bridge so WaterStore can call Jalali helpers without a hard cycle. */
    private static final class JalaliDays {
        static int daysInMonth(int jy, int jm) {
            return ir.abnavaz.abyar.util.JalaliCalendar.daysInMonth(jy, jm);
        }

        static int[] fromJalali(int jy, int jm, int jd) {
            return ir.abnavaz.abyar.util.JalaliCalendar.fromJalali(jy, jm, jd);
        }
    }
}
