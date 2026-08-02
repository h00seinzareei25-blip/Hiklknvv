package ir.abnavaz.abyar.reminder;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import ir.abnavaz.abyar.data.WaterStore;
import ir.abnavaz.abyar.widget.WaterWidgetProvider;

public final class AddWaterReceiver extends BroadcastReceiver {
    public static final String ACTION_WATER_CHANGED = "ir.abnavaz.abyar.WATER_CHANGED";
    public static final String EXTRA_AMOUNT_ML = "amount_ml";
    public static final String EXTRA_FROM_NOTIFICATION = "from_notification";

    @Override
    public void onReceive(Context context, Intent intent) {
        int amount = intent.getIntExtra(EXTRA_AMOUNT_ML, 250);
        if (amount < 50 || amount > 2_000) {
            amount = 250;
        }
        new WaterStore(context).addWater(amount);
        WaterWidgetProvider.updateAll(context);

        if (intent.getBooleanExtra(EXTRA_FROM_NOTIFICATION, false)) {
            NotificationManager manager =
                    (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.cancel(702);
            }
        }

        context.sendBroadcast(new Intent(ACTION_WATER_CHANGED).setPackage(context.getPackageName()));
    }
}
