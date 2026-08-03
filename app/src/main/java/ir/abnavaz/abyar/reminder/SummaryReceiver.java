package ir.abnavaz.abyar.reminder;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import java.util.Date;

import ir.abnavaz.abyar.MainActivity;
import ir.abnavaz.abyar.R;
import ir.abnavaz.abyar.data.WaterStore;
import ir.abnavaz.abyar.util.PersianNumbers;

public final class SummaryReceiver extends BroadcastReceiver {
    private static final int NOTIFICATION_ID = 712;

    @Override
    public void onReceive(Context context, Intent intent) {
        WaterStore store = new WaterStore(context);
        if (!store.remindersEnabled()) {
            return;
        }

        String today = WaterStore.dayKey(new Date());
        if (today.equals(store.getLastSummaryDay())) {
            ReminderScheduler.scheduleSummary(context, store);
            return;
        }
        store.setLastSummaryDay(today);

        int total = store.getTodayTotalMl();
        int goal = store.getGoalMl();
        int percent = goal == 0 ? 0 : Math.min(100, Math.round(total * 100f / goal));
        String title = percent >= 100
                ? "آفرین! هدف امروز کامل شد ✓"
                : "جمع‌بندی آب امروز";
        String body = percent >= 100
                ? "امروز " + PersianNumbers.format(total) + " میلی‌لیتر نوشیدی و به هدف رسیدی."
                : "امروز " + PersianNumbers.format(percent) + "٪ از هدف را زدی · "
                + PersianNumbers.format(total) + " از " + PersianNumbers.format(goal) + " میلی‌لیتر";

        ReminderReceiver.ensureChannel(context);
        NotificationManager manager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            Intent openIntent = new Intent(context, MainActivity.class)
                    .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent openPending = PendingIntent.getActivity(
                    context,
                    0,
                    openIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    ? new Notification.Builder(context, ReminderReceiver.CHANNEL_SUMMARY)
                    : new Notification.Builder(context);
            builder.setSmallIcon(R.drawable.ic_water_drop)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setStyle(new Notification.BigTextStyle().bigText(body))
                    .setContentIntent(openPending)
                    .setAutoCancel(true)
                    .setCategory(Notification.CATEGORY_STATUS);
            manager.notify(NOTIFICATION_ID, builder.build());
        }

        ReminderScheduler.scheduleSummary(context, store);
    }
}
