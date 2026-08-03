package ir.abnavaz.abyar.reminder;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;

import java.util.Random;

import ir.abnavaz.abyar.MainActivity;
import ir.abnavaz.abyar.R;
import ir.abnavaz.abyar.data.WaterStore;
import ir.abnavaz.abyar.util.PersianNumbers;

public final class ReminderReceiver extends BroadcastReceiver {
    public static final String EXTRA_SNOOZE = "snooze";
    public static final String CHANNEL_ID = "water_reminders";
    public static final String CHANNEL_SUMMARY = "water_summary";
    private static final int NOTIFICATION_ID = 702;
    private static final long RECENT_MS = 30L * 60L * 1000L;

    private static final String[] TITLES = {
            "وقت نوشیدن آب است 💧",
            "یک جرعه آب؟",
            "بدنت منتظر آب است",
            "یادآوری آب‌یار",
            "هیدراته بمون!",
            "لیوان بعدی آماده‌ست؟"
    };

    private static final String[] HINTS = {
            "یک لیوان آب کمکت می‌کنه سرحال بمونی.",
            "کم‌آبی باعث خستگی و سردرد می‌شود.",
            "همین الان یک جرعه بنوش.",
            "بدن از تو تشکر می‌کند.",
            "قدم کوچیک، حس بهتر."
    };

    @Override
    public void onReceive(Context context, Intent intent) {
        WaterStore store = new WaterStore(context);
        if (!store.remindersEnabled()) {
            ReminderScheduler.cancel(context);
            return;
        }

        boolean snooze = intent != null && intent.getBooleanExtra(EXTRA_SNOOZE, false);
        long lastIntake = store.getLastIntakeTimestamp();
        boolean recent = lastIntake > 0
                && System.currentTimeMillis() - lastIntake < RECENT_MS;

        if (store.getTodayTotalMl() < store.getGoalMl() && (!recent || snooze)) {
            showNotification(context, store);
        }
        ReminderScheduler.scheduleNext(context, store);
        ReminderScheduler.scheduleSummary(context, store);
    }

    public static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) {
            return;
        }
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                context.getString(R.string.notification_channel_name),
                NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription(context.getString(R.string.notification_channel_description));
        channel.enableVibration(true);
        channel.setLightColor(Color.CYAN);
        manager.createNotificationChannel(channel);

        NotificationChannel summary = new NotificationChannel(
                CHANNEL_SUMMARY,
                context.getString(R.string.summary_channel_name),
                NotificationManager.IMPORTANCE_LOW
        );
        summary.setDescription(context.getString(R.string.summary_channel_description));
        manager.createNotificationChannel(summary);
    }

    private static void showNotification(Context context, WaterStore store) {
        ensureChannel(context);
        NotificationManager manager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) {
            return;
        }

        Intent openIntent = new Intent(context, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPendingIntent = PendingIntent.getActivity(
                context,
                0,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        int suggested = store.suggestedSipMl();
        if (suggested <= 0) {
            suggested = 250;
        }

        Intent addIntent = new Intent(context, AddWaterReceiver.class)
                .putExtra(AddWaterReceiver.EXTRA_AMOUNT_ML, suggested)
                .putExtra(AddWaterReceiver.EXTRA_FROM_NOTIFICATION, true);
        PendingIntent addPendingIntent = PendingIntent.getBroadcast(
                context,
                703,
                addIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent snoozeIntent = new Intent(context, SnoozeReceiver.class)
                .putExtra(SnoozeReceiver.EXTRA_MINUTES, 15);
        PendingIntent snoozePending = PendingIntent.getBroadcast(
                context,
                704,
                snoozeIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        int remaining = Math.max(0, store.getGoalMl() - store.getTodayTotalMl());
        Random random = new Random();
        String title = TITLES[random.nextInt(TITLES.length)];
        String hint = HINTS[random.nextInt(HINTS.length)];
        String detail = hint + "\n"
                + "پیشنهاد الان: " + PersianNumbers.format(suggested) + " میلی‌لیتر · "
                + "مانده: " + PersianNumbers.format(remaining) + " میلی‌لیتر";

        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(context, CHANNEL_ID)
                : new Notification.Builder(context);
        builder.setSmallIcon(R.drawable.ic_water_drop)
                .setContentTitle(title)
                .setContentText(detail)
                .setStyle(new Notification.BigTextStyle().bigText(detail))
                .setContentIntent(openPendingIntent)
                .setAutoCancel(true)
                .setCategory(Notification.CATEGORY_REMINDER)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .addAction(new Notification.Action.Builder(
                        null,
                        "نوشیدم · " + PersianNumbers.format(suggested) + " ml",
                        addPendingIntent
                ).build())
                .addAction(new Notification.Action.Builder(
                        null,
                        context.getString(R.string.notification_snooze),
                        snoozePending
                ).build());
        manager.notify(NOTIFICATION_ID, builder.build());
    }
}
