package ir.abnavaz.abyar.reminder;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public final class SnoozeReceiver extends BroadcastReceiver {
    public static final String EXTRA_MINUTES = "minutes";

    @Override
    public void onReceive(Context context, Intent intent) {
        int minutes = intent != null ? intent.getIntExtra(EXTRA_MINUTES, 15) : 15;
        if (minutes < 5 || minutes > 120) {
            minutes = 15;
        }
        ReminderScheduler.snooze(context, minutes);
    }
}
