package ir.abnavaz.abyar.reminder;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;

import java.util.Calendar;

import ir.abnavaz.abyar.data.WaterStore;

public final class ReminderScheduler {
    private static final int REQUEST_CODE = 701;

    private ReminderScheduler() {
    }

    public static void sync(Context context) {
        WaterStore store = new WaterStore(context);
        if (store.remindersEnabled()) {
            scheduleNext(context, store);
        } else {
            cancel(context);
        }
    }

    public static void scheduleNext(Context context, WaterStore store) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) {
            return;
        }
        long triggerAt = nextTriggerMillis(store);
        manager.setAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                triggerAt,
                reminderIntent(context)
        );
    }

    public static void cancel(Context context) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager != null) {
            manager.cancel(reminderIntent(context));
        }
    }

    static long nextTriggerMillis(WaterStore store) {
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

        Calendar next = (Calendar) now.clone();
        next.add(Calendar.MINUTE, store.getReminderIntervalMinutes());
        if (next.after(end)) {
            start.add(Calendar.DAY_OF_YEAR, 1);
            return start.getTimeInMillis();
        }
        return next.getTimeInMillis();
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
                REQUEST_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
}
