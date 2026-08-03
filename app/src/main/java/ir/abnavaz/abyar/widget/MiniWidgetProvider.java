package ir.abnavaz.abyar.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import ir.abnavaz.abyar.MainActivity;
import ir.abnavaz.abyar.R;
import ir.abnavaz.abyar.data.WaterStore;
import ir.abnavaz.abyar.reminder.AddWaterReceiver;
import ir.abnavaz.abyar.util.PersianNumbers;

public final class MiniWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            manager.updateAppWidget(appWidgetId, createViews(context));
        }
    }

    public static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName provider = new ComponentName(context, MiniWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(provider);
        if (ids.length > 0) {
            manager.updateAppWidget(ids, createViews(context));
        }
    }

    private static RemoteViews createViews(Context context) {
        WaterStore store = new WaterStore(context);
        int total = store.getTodayTotalMl();
        int goal = store.getGoalMl();
        int percent = goal == 0 ? 0 : Math.min(100, Math.round(total * 100f / goal));

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.mini_widget);
        views.setTextViewText(R.id.mini_percent, PersianNumbers.format(percent) + "٪");
        views.setTextViewText(R.id.mini_amount, PersianNumbers.format(total));

        Intent openIntent = new Intent(context, MainActivity.class);
        PendingIntent openPending = PendingIntent.getActivity(
                context,
                804,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.mini_root, openPending);

        Intent addIntent = new Intent(context, AddWaterReceiver.class)
                .putExtra(AddWaterReceiver.EXTRA_AMOUNT_ML, 250);
        PendingIntent addPending = PendingIntent.getBroadcast(
                context,
                805,
                addIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.mini_add, addPending);
        return views;
    }
}
