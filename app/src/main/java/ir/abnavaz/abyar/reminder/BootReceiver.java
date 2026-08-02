package ir.abnavaz.abyar.reminder;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import ir.abnavaz.abyar.widget.WaterWidgetProvider;

public final class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action)
                && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
                && !Intent.ACTION_TIMEZONE_CHANGED.equals(action)
                && !Intent.ACTION_TIME_CHANGED.equals(action)) {
            return;
        }
        ReminderScheduler.sync(context);
        WaterWidgetProvider.updateAll(context);
    }
}
