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

import ir.abnavaz.abyar.MainActivity;
import ir.abnavaz.abyar.R;
import ir.abnavaz.abyar.data.WaterStore;
import ir.abnavaz.abyar.util.PersianNumbers;

public final class ReminderReceiver extends BroadcastReceiver {
    private static final String CHANNEL_ID = "water_reminders";
    private static final int NOTIFICATION_ID = 702;

    @Override
    public void onReceive(Context context, Intent intent) {
        WaterStore store = new WaterStore(context);
        if (!store.remindersEnabled()) {
            ReminderScheduler.cancel(context);
            return;
        }

        if (store.getTodayTotalMl() < store.getGoalMl()) {
            showNotification(context, store);
        }
        ReminderScheduler.scheduleNext(context, store);
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

        Intent addIntent = new Intent(context, AddWaterReceiver.class)
                .putExtra(AddWaterReceiver.EXTRA_AMOUNT_ML, 250)
                .putExtra(AddWaterReceiver.EXTRA_FROM_NOTIFICATION, true);
        PendingIntent addPendingIntent = PendingIntent.getBroadcast(
                context,
                703,
                addIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        int remaining = Math.max(0, store.getGoalMl() - store.getTodayTotalMl());
        String detail = "تا هدف امروز " + PersianNumbers.format(remaining)
                + " میلی‌لیتر باقی مانده است.";

        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(context, CHANNEL_ID)
                : new Notification.Builder(context);
        builder.setSmallIcon(R.drawable.ic_water_drop)
                .setContentTitle(context.getString(R.string.notification_title))
                .setContentText(detail)
                .setStyle(new Notification.BigTextStyle().bigText(detail))
                .setContentIntent(openPendingIntent)
                .setAutoCancel(true)
                .setCategory(Notification.CATEGORY_REMINDER)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .addAction(new Notification.Action.Builder(
                        null,
                        context.getString(R.string.notification_action_add),
                        addPendingIntent
                ).build());
        manager.notify(NOTIFICATION_ID, builder.build());
    }
}
