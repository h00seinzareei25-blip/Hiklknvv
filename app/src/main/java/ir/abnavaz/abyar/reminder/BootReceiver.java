package ir.abnavaz.abyar.reminder;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import ir.abnavaz.abyar.widget.WaterWidgetProvider;

public final class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        ReminderScheduler.sync(context);
        WaterWidgetProvider.updateAll(context);
    }
}
