package ir.abnavaz.abyar.reminder;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;

import java.util.Calendar;

import ir.abnavaz.abyar.data.WaterStore;

public final class ReminderScheduler {
    private static final int REQUEST_REMINDER = 701;
    private static final int REQUEST_SUMMARY = 711;
    private static final int REQUEST_SNOOZE = 721;

    private ReminderScheduler() {
    }

    public static void sync(Context context) {
        WaterStore store = new WaterStore(context);
        if (store.remindersEnabled()) {
            ensureScheduled(context, store);
            scheduleSummary(context, store);
        } else {
            cancelAll(context);
            store.setNextAlarmAt(0L);
            store.setNextSummaryAt(0L);
        }
    }

    /**
     * Restores the alarm chain without pushing the next reminder further into
     * the future when the user simply opens the app.
     */
    public static void ensureScheduled(Context context, WaterStore store) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null || !store.remindersEnabled()) {
            return;
        }
        long now = System.currentTimeMillis();
        long stored = store.getNextAlarmAt();
        long triggerAt;
        if (stored > now + 5_000L) {
            triggerAt = stored;
        } else if (stored <= 0L) {
            triggerAt = nextTriggerMillis(store, true);
        } else {
            // Alarm was overdue/wiped — fire soon instead of delaying by a full interval.
            triggerAt = nextTriggerMillis(store, false);
        }
        store.setNextAlarmAt(triggerAt);
        manager.setAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                triggerAt,
                reminderIntent(context)
        );
    }

    public static void scheduleNext(Context context, WaterStore store) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) {
            return;
        }
        long triggerAt = nextTriggerMillis(store, true);
        store.setNextAlarmAt(triggerAt);
        manager.setAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                triggerAt,
                reminderIntent(context)
        );
    }

    public static void snooze(Context context, int minutes) {
        WaterStore store = new WaterStore(context);
        if (!store.remindersEnabled()) {
            return;
        }
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) {
            return;
        }
        long triggerAt = System.currentTimeMillis() + minutes * 60_000L;
        // Keep snooze inside today's end window when possible.
        Calendar end = Calendar.getInstance();
        end.set(Calendar.HOUR_OF_DAY, store.getEndHour());
        end.set(Calendar.MINUTE, 0);
        end.set(Calendar.SECOND, 0);
        end.set(Calendar.MILLISECOND, 0);
        if (triggerAt > end.getTimeInMillis()) {
            triggerAt = nextTriggerMillis(store, true);
        }
        store.setNextAlarmAt(triggerAt);
        Intent intent = new Intent(context, ReminderReceiver.class)
                .putExtra(ReminderReceiver.EXTRA_SNOOZE, true);
        PendingIntent pending = PendingIntent.getBroadcast(
                context,
                REQUEST_SNOOZE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending);
    }

    public static void scheduleSummary(Context context, WaterStore store) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) {
            return;
        }
        long triggerAt = nextSummaryMillis(store);
        store.setNextSummaryAt(triggerAt);
        manager.setAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                triggerAt,
                summaryIntent(context)
        );
    }

    public static void cancelAll(Context context) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) {
            return;
        }
        manager.cancel(reminderIntent(context));
        manager.cancel(summaryIntent(context));
        Intent snooze = new Intent(context, ReminderReceiver.class)
                .putExtra(ReminderReceiver.EXTRA_SNOOZE, true);
        manager.cancel(PendingIntent.getBroadcast(
                context,
                REQUEST_SNOOZE,
                snooze,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        ));
    }

    public static void cancel(Context context) {
        cancelAll(context);
    }

    static long nextTriggerMillis(WaterStore store, boolean afterInterval) {
        Calendar now = Calendar.getInstance();
        Calendar start = atHour(now, store.getStartHour());
        Calendar end = atHour(now, store.getEndHour());

        if (!end.after(start)) {
            end.add(Calendar.DAY_OF_YEAR, 1);
            if (now.before(start) && now.get(Calendar.HOUR_OF_DAY) < store.getEndHour()) {
                start.add(Calendar.DAY_OF_YEAR, -1);
            }
        }

        if (now.before(start)) {
            return start.getTimeInMillis();
        }
        if (!now.before(end)) {
            start.add(Calendar.DAY_OF_YEAR, 1);
            return start.getTimeInMillis();
        }

        if (!afterInterval) {
            // Recovery: fire soon if overdue, otherwise keep cadence from "now".
            return now.getTimeInMillis() + 60_000L;
        }

        Calendar next = (Calendar) now.clone();
        next.add(Calendar.MINUTE, store.getReminderIntervalMinutes());
        if (next.after(end)) {
            start.add(Calendar.DAY_OF_YEAR, 1);
            return start.getTimeInMillis();
        }
        return next.getTimeInMillis();
    }

    static long nextSummaryMillis(WaterStore store) {
        Calendar summary = Calendar.getInstance();
        summary.set(Calendar.HOUR_OF_DAY, store.getEndHour());
        summary.set(Calendar.MINUTE, 0);
        summary.set(Calendar.SECOND, 0);
        summary.set(Calendar.MILLISECOND, 0);
        if (!summary.after(Calendar.getInstance())) {
            summary.add(Calendar.DAY_OF_YEAR, 1);
        }
        return summary.getTimeInMillis();
    }

    private static Calendar atHour(Calendar source, int hour) {
        Calendar result = (Calendar) source.clone();
        result.set(Calendar.HOUR_OF_DAY, hour);
        result.set(Calendar.MINUTE, 0);
        result.set(Calendar.SECOND, 0);
        result.set(Calendar.MILLISECOND, 0);
        return result;
    }

    private static PendingIntent reminderIntent(Context context) {
        Intent intent = new Intent(context, ReminderReceiver.class);
        return PendingIntent.getBroadcast(
                context,
                REQUEST_REMINDER,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static PendingIntent summaryIntent(Context context) {
        Intent intent = new Intent(context, SummaryReceiver.class);
        return PendingIntent.getBroadcast(
                context,
                REQUEST_SUMMARY,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
}
