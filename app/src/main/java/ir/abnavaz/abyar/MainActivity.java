package ir.abnavaz.abyar;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.TimePickerDialog;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.NumberPicker;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONException;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

import ir.abnavaz.abyar.data.HydrationCalculator;
import ir.abnavaz.abyar.data.WaterStore;
import ir.abnavaz.abyar.reminder.AddWaterReceiver;
import ir.abnavaz.abyar.reminder.ReminderReceiver;
import ir.abnavaz.abyar.reminder.ReminderScheduler;
import ir.abnavaz.abyar.util.JalaliCalendar;
import ir.abnavaz.abyar.util.PersianNumbers;
import ir.abnavaz.abyar.widget.MiniWidgetProvider;
import ir.abnavaz.abyar.widget.WaterWidgetProvider;

public final class MainActivity extends Activity {
    private ThemeColors theme;
    private WaterStore store;
    private ScrollView scrollView;
    private LinearLayout root;
    private TextView amountText;
    private TextView percentText;
    private TextView remainingText;
    private TextView glassesText;
    private TextView streakText;
    private TextView goalText;
    private TextView weightText;
    private TextView activityText;
    private TextView reminderText;
    private ProgressBar progressBar;
    private Switch reminderSwitch;
    private Switch darkSwitch;
    private Switch hotSwitch;
    private HistoryView historyView;
    private CalendarView calendarView;
    private LinearLayout cupsRow;
    private LinearLayout todayLogBox;
    private boolean bindingSwitches;

    private final BroadcastReceiver waterChangedReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            refresh();
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        store = new WaterStore(this);
        theme = ThemeColors.from(store.isDarkMode());
        ReminderReceiver.ensureChannel(this);
        setContentView(buildContent());
        applyWindowColors();
        if (!store.isOnboarded()) {
            amountText.post(() -> showWeightDialog(true));
        } else {
            amountText.post(this::maybeShowBatteryTip);
        }
    }

    @SuppressLint("UnspecifiedRegisterReceiverFlag")
    @Override
    protected void onStart() {
        super.onStart();
        IntentFilter filter = new IntentFilter(AddWaterReceiver.ACTION_WATER_CHANGED);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(waterChangedReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(
                    waterChangedReceiver,
                    filter,
                    AddWaterReceiver.INTERNAL_PERMISSION,
                    null
            );
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        ReminderScheduler.sync(this);
        refresh();
    }

    @Override
    protected void onStop() {
        unregisterReceiver(waterChangedReceiver);
        super.onStop();
    }

    private View buildContent() {
        scrollView = new ScrollView(this);
        scrollView.setFillViewport(true);
        scrollView.setBackgroundColor(theme.bg);

        root = vertical();
        root.setPadding(dp(16), 0, dp(16), dp(36));
        root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        scrollView.addView(root, matchWrap());

        root.addView(buildHeader(), matchWidth(dp(200)));
        LinearLayout.LayoutParams overlap = matchWidth(ViewGroup.LayoutParams.WRAP_CONTENT);
        overlap.setMargins(0, dp(-36), 0, 0);
        root.addView(buildProgressCard(), overlap);
        root.addView(sectionTitle("ثبت سریع"), topMargin(dp(22)));
        cupsRow = horizontal();
        root.addView(cupsRow, matchWidth(ViewGroup.LayoutParams.WRAP_CONTENT));
        root.addView(buildDrinkRow(), topMargin(dp(8)));
        root.addView(buildUndoButton(), topMargin(dp(4)));
        root.addView(sectionTitle("امروز"), topMargin(dp(20)));
        todayLogBox = vertical();
        root.addView(cardWrap(todayLogBox), matchWidth(ViewGroup.LayoutParams.WRAP_CONTENT));
        root.addView(sectionTitle("برنامه روزانه"), topMargin(dp(22)));
        root.addView(buildGoalCard(), matchWidth(ViewGroup.LayoutParams.WRAP_CONTENT));
        root.addView(buildActivityCard(), topMargin(dp(10)));
        root.addView(buildReminderCard(), topMargin(dp(10)));
        root.addView(sectionTitle("۷ روز گذشته"), topMargin(dp(22)));
        root.addView(buildHistoryCard(), matchWidth(dp(180)));
        root.addView(sectionTitle("تقویم شمسی"), topMargin(dp(22)));
        root.addView(buildCalendarCard(), matchWidth(ViewGroup.LayoutParams.WRAP_CONTENT));
        root.addView(sectionTitle("تنظیمات"), topMargin(dp(22)));
        root.addView(buildSettingsCard(), matchWidth(ViewGroup.LayoutParams.WRAP_CONTENT));
        root.addView(buildDisclaimer(), topMargin(dp(14)));
        return scrollView;
    }

    private void rebuildUi() {
        theme = ThemeColors.from(store.isDarkMode());
        setContentView(buildContent());
        applyWindowColors();
        refresh();
    }

    private void applyWindowColors() {
        getWindow().setStatusBarColor(theme.oceanDark);
        getWindow().setNavigationBarColor(theme.surface);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            int flags = getWindow().getDecorView().getSystemUiVisibility();
            if (store.isDarkMode()) {
                flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            }
            getWindow().getDecorView().setSystemUiVisibility(flags);
        }
    }

    private View buildHeader() {
        LinearLayout header = vertical();
        header.setGravity(Gravity.CENTER_HORIZONTAL);
        header.setPadding(dp(18), dp(26), dp(18), dp(58));
        GradientDrawable gradient = new GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                new int[]{theme.oceanDark, theme.ocean, Color.rgb(25, 145, 158)}
        );
        gradient.setCornerRadii(new float[]{0, 0, 0, 0, dp(30), dp(30), dp(30), dp(30)});
        header.setBackground(gradient);

        TextView title = text("آب‌یار  💧", 25, Color.WHITE, Typeface.BOLD);
        title.setGravity(Gravity.CENTER);
        header.addView(title, matchWidth(ViewGroup.LayoutParams.WRAP_CONTENT));

        TextView subtitle = text(
                "امروز " + PersianNumbers.localize(JalaliCalendar.formatToday()),
                13, Color.argb(210, 255, 255, 255), Typeface.NORMAL
        );
        subtitle.setGravity(Gravity.CENTER);
        header.addView(subtitle, topMargin(dp(4)));

        streakText = text("", 13, Color.rgb(255, 230, 150), Typeface.BOLD);
        streakText.setGravity(Gravity.CENTER);
        header.addView(streakText, topMargin(dp(8)));
        return header;
    }

    private View buildProgressCard() {
        LinearLayout card = card();
        card.setGravity(Gravity.CENTER_HORIZONTAL);
        card.setPadding(dp(18), dp(20), dp(18), dp(16));

        card.addView(text("مصرف امروز", 13, theme.muted, Typeface.BOLD));
        amountText = text("", 34, theme.oceanDark, Typeface.BOLD);
        amountText.setGravity(Gravity.CENTER);
        card.addView(amountText, topMargin(dp(2)));

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setProgressTintList(ColorStateList.valueOf(theme.aqua));
        progressBar.setProgressBackgroundTintList(ColorStateList.valueOf(theme.progressTrack));
        LinearLayout.LayoutParams progressParams = matchWidth(dp(12));
        progressParams.setMargins(0, dp(12), 0, dp(10));
        card.addView(progressBar, progressParams);

        percentText = text("", 14, theme.ocean, Typeface.BOLD);
        percentText.setGravity(Gravity.CENTER);
        card.addView(percentText);

        LinearLayout stats = horizontal();
        stats.setGravity(Gravity.CENTER);
        stats.setPadding(0, dp(14), 0, 0);
        remainingText = text("", 12, theme.muted, Typeface.NORMAL);
        remainingText.setGravity(Gravity.CENTER);
        glassesText = text("", 12, theme.muted, Typeface.NORMAL);
        glassesText.setGravity(Gravity.CENTER);
        stats.addView(remainingText, weighted());
        View separator = new View(this);
        separator.setBackgroundColor(theme.line);
        stats.addView(separator, new LinearLayout.LayoutParams(dp(1), dp(30)));
        stats.addView(glassesText, weighted());
        card.addView(stats, matchWidth(ViewGroup.LayoutParams.WRAP_CONTENT));
        return card;
    }

    private void rebuildCupsRow() {
        cupsRow.removeAllViews();
        List<WaterStore.Cup> cups = store.getCups();
        for (WaterStore.Cup cup : cups) {
            Button button = actionButton(cup.name + "\n+" + PersianNumbers.format(cup.ml), false);
            button.setOnClickListener(v -> addIntake(cup.ml, "water"));
            LinearLayout.LayoutParams params = weighted();
            params.setMargins(dp(3), 0, dp(3), 0);
            cupsRow.addView(button, params);
        }
        Button custom = actionButton("دلخواه", true);
        custom.setOnClickListener(v -> showCustomAmountDialog());
        LinearLayout.LayoutParams customParams = weighted();
        customParams.setMargins(dp(3), 0, dp(3), 0);
        cupsRow.addView(custom, customParams);
    }

    private View buildDrinkRow() {
        LinearLayout row = horizontal();
        String[][] drinks = {
                {"چای", "tea"}, {"قهوه", "coffee"}, {"آبمیوه", "juice"}, {"شیر", "milk"}
        };
        for (String[] drink : drinks) {
            Button button = actionButton(drink[0], true);
            String type = drink[1];
            button.setOnClickListener(v -> showDrinkAmountDialog(type, drink[0]));
            LinearLayout.LayoutParams params = weighted();
            params.setMargins(dp(3), 0, dp(3), 0);
            row.addView(button, params);
        }
        return row;
    }

    private View buildUndoButton() {
        TextView undo = text("↶  حذف آخرین ثبت", 13, theme.muted, Typeface.BOLD);
        undo.setGravity(Gravity.CENTER);
        undo.setPadding(dp(10), dp(8), dp(10), dp(8));
        undo.setOnClickListener(v -> {
            int before = store.getTodayTotalMl();
            store.undoLastWater();
            if (before == store.getTodayTotalMl()) {
                Toast.makeText(this, "ثبتی برای حذف وجود ندارد", Toast.LENGTH_SHORT).show();
            } else {
                refreshAfterChange();
                Toast.makeText(this, "آخرین ثبت حذف شد", Toast.LENGTH_SHORT).show();
            }
        });
        return undo;
    }

    private View buildGoalCard() {
        LinearLayout card = card();
        card.setOrientation(LinearLayout.HORIZONTAL);
        card.setGravity(Gravity.CENTER_VERTICAL);
        card.setPadding(dp(16), dp(15), dp(16), dp(15));
        card.setOnClickListener(v -> showGoalDialog());

        TextView icon = text("⚖", 24, theme.ocean, Typeface.NORMAL);
        icon.setGravity(Gravity.CENTER);
        icon.setBackground(roundRect(theme.ice, dp(14)));
        icon.setPadding(dp(10), dp(8), dp(10), dp(8));
        card.addView(icon, new LinearLayout.LayoutParams(dp(48), dp(48)));

        LinearLayout labels = vertical();
        labels.setPadding(dp(10), 0, dp(10), 0);
        labels.addView(text("هدف روزانه", 14, theme.ink, Typeface.BOLD));
        weightText = text("", 12, theme.muted, Typeface.NORMAL);
        labels.addView(weightText, topMargin(dp(2)));
        card.addView(labels, weighted());

        goalText = text("", 15, theme.ocean, Typeface.BOLD);
        card.addView(goalText);
        return card;
    }

    private View buildActivityCard() {
        LinearLayout card = card();
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(16), dp(14), dp(16), dp(14));

        LinearLayout top = horizontal();
        top.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout labels = vertical();
        labels.addView(text("سطح فعالیت و هوا", 14, theme.ink, Typeface.BOLD));
        activityText = text("", 12, theme.muted, Typeface.NORMAL);
        labels.addView(activityText, topMargin(dp(2)));
        labels.setOnClickListener(v -> showActivityDialog());
        top.addView(labels, weighted());

        hotSwitch = new Switch(this);
        hotSwitch.setShowText(false);
        hotSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (bindingSwitches) {
                return;
            }
            store.setHotWeather(isChecked);
            refreshAfterChange();
        });
        TextView hotLabel = text("هوای گرم", 12, theme.muted, Typeface.NORMAL);
        hotLabel.setPadding(dp(8), 0, dp(4), 0);
        top.addView(hotLabel);
        top.addView(hotSwitch);
        card.addView(top);
        return card;
    }

    private View buildReminderCard() {
        LinearLayout card = card();
        card.setOrientation(LinearLayout.HORIZONTAL);
        card.setGravity(Gravity.CENTER_VERTICAL);
        card.setPadding(dp(16), dp(12), dp(16), dp(12));

        LinearLayout labels = vertical();
        labels.addView(text("یادآوری هوشمند", 14, theme.ink, Typeface.BOLD));
        reminderText = text("", 12, theme.muted, Typeface.NORMAL);
        labels.addView(reminderText, topMargin(dp(2)));
        labels.setOnClickListener(v -> showReminderDialog());
        card.addView(labels, weighted());

        reminderSwitch = new Switch(this);
        reminderSwitch.setShowText(false);
        reminderSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (bindingSwitches) {
                return;
            }
            store.setRemindersEnabled(isChecked);
            if (isChecked) {
                requestNotificationPermission();
                maybeShowBatteryTip();
            }
            ReminderScheduler.sync(this);
            refreshReminder();
        });
        card.addView(reminderSwitch);
        return card;
    }

    private View buildHistoryCard() {
        LinearLayout card = card();
        card.setPadding(dp(12), dp(14), dp(12), dp(8));
        historyView = new HistoryView(this);
        card.addView(historyView, matchWidth(dp(150)));
        return card;
    }

    private View buildCalendarCard() {
        LinearLayout card = card();
        card.setPadding(dp(12), dp(14), dp(12), dp(12));
        calendarView = new CalendarView(this);
        card.addView(calendarView, matchWidth(dp(250)));
        return card;
    }

    private View buildSettingsCard() {
        LinearLayout card = card();
        card.setPadding(dp(16), dp(8), dp(16), dp(8));

        LinearLayout darkRow = horizontal();
        darkRow.setGravity(Gravity.CENTER_VERTICAL);
        darkRow.setPadding(0, dp(8), 0, dp(8));
        darkRow.addView(text("حالت تیره", 14, theme.ink, Typeface.BOLD), weighted());
        darkSwitch = new Switch(this);
        darkSwitch.setShowText(false);
        darkSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (bindingSwitches) {
                return;
            }
            store.setDarkMode(isChecked);
            rebuildUi();
        });
        darkRow.addView(darkSwitch);
        card.addView(darkRow, matchWidth(ViewGroup.LayoutParams.WRAP_CONTENT));

        card.addView(settingsButton("ویرایش ظرف‌های سریع", v -> showCupsEditor()));
        card.addView(settingsButton("پشتیبان‌گیری / بازیابی", v -> showBackupDialog()));
        card.addView(settingsButton("خروجی برای اپ‌های سلامت", v -> shareHealthExport()));
        card.addView(settingsButton("بهینه‌سازی باتری (یادآور پایدار)", v -> openBatterySettings(true)));
        return card;
    }

    private TextView settingsButton(String label, View.OnClickListener listener) {
        TextView view = text(label + "  ›", 13, theme.ocean, Typeface.BOLD);
        view.setPadding(0, dp(12), 0, dp(12));
        view.setOnClickListener(listener);
        return view;
    }

    private View buildDisclaimer() {
        TextView note = text(
                "هدف بر پایه ۳۵ میلی‌لیتر به‌ازای هر کیلوگرم، سطح فعالیت و هوای گرم است. چای/قهوه با ضریب آب‌رسانی کمتر محاسبه می‌شوند. در بیماری‌های کلیوی یا قلبی با پزشک مشورت کنید. خروجی سلامت برای Health Connect و اپ‌های مشابه قابل اشتراک است.",
                12, theme.muted, Typeface.NORMAL
        );
        note.setLineSpacing(0, 1.25f);
        note.setBackground(roundRect(theme.ice, dp(14)));
        note.setPadding(dp(14), dp(12), dp(14), dp(12));
        return note;
    }

    private View cardWrap(View child) {
        LinearLayout card = card();
        card.setPadding(dp(14), dp(12), dp(14), dp(12));
        card.addView(child, matchWidth(ViewGroup.LayoutParams.WRAP_CONTENT));
        return card;
    }

    private void refresh() {
        int total = store.getTodayTotalMl();
        int goal = store.getGoalMl();
        int percent = goal == 0 ? 0 : Math.min(100, Math.round(total * 100f / goal));
        amountText.setText(getString(R.string.today_amount, PersianNumbers.format(total)));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            progressBar.setProgress(percent, true);
        } else {
            progressBar.setProgress(percent);
        }
        percentText.setText(percent >= 100
                ? "آفرین! هدف امروز کامل شد ✓"
                : PersianNumbers.format(percent) + "٪ از هدف روزانه");
        remainingText.setText(percent >= 100
                ? "هدف کامل شده"
                : PersianNumbers.format(Math.max(0, goal - total)) + " میلی‌لیتر مانده");
        glassesText.setText(getString(R.string.intake_count, PersianNumbers.format(store.getTodayCount())));
        goalText.setText(getString(R.string.goal_amount, PersianNumbers.format(goal)));
        weightText.setText(store.getManualGoalMl() > 0
                ? "هدف دستی · لمس برای ویرایش ›"
                : getString(R.string.weight_summary, PersianNumbers.format(store.getWeightKg())));
        activityText.setText(activityLabel(store.getActivityLevel())
                + (store.isHotWeather() ? " · هوای گرم (+۱۰٪)" : "") + "  ›");
        int streak = store.getStreak();
        streakText.setText(streak > 0
                ? "🔥 " + PersianNumbers.format(streak) + " روز پیاپی رسیدن به هدف"
                : "streak از فردا با رسیدن به هدف شروع می‌شود");
        rebuildCupsRow();
        refreshTodayLog();
        refreshReminder();
        bindingSwitches = true;
        if (hotSwitch != null) {
            hotSwitch.setChecked(store.isHotWeather());
        }
        if (darkSwitch != null) {
            darkSwitch.setChecked(store.isDarkMode());
        }
        bindingSwitches = false;
        if (historyView != null) {
            historyView.setTheme(theme);
            historyView.setValues(store.getLastSevenDaysMl(), goal);
        }
        if (calendarView != null) {
            int[] jalali = JalaliCalendar.today();
            calendarView.setTheme(theme);
            calendarView.setMonth(jalali[0], jalali[1], store.getMonthDayTotals(jalali[0], jalali[1]), goal);
        }
    }

    private void refreshTodayLog() {
        todayLogBox.removeAllViews();
        List<WaterStore.Intake> intakes = store.getTodayIntakes();
        if (intakes.isEmpty()) {
            todayLogBox.addView(text("هنوز چیزی ثبت نشده", 13, theme.muted, Typeface.NORMAL));
            return;
        }
        for (int i = intakes.size() - 1; i >= 0 && i >= intakes.size() - 8; i--) {
            WaterStore.Intake intake = intakes.get(i);
            String time = new SimpleDateFormat("HH:mm", Locale.US).format(new Date(intake.timestamp));
            String line = PersianNumbers.localize(time) + " · "
                    + drinkLabel(intake.type) + " "
                    + PersianNumbers.format(intake.amountMl) + " ml"
                    + (intake.effectiveMl != intake.amountMl
                    ? " ≈ " + PersianNumbers.format(intake.effectiveMl) : "");
            todayLogBox.addView(text(line, 13, theme.ink, Typeface.NORMAL), topMargin(dp(4)));
        }
    }

    private void refreshReminder() {
        bindingSwitches = true;
        reminderSwitch.setChecked(store.remindersEnabled());
        bindingSwitches = false;
        reminderText.setText(store.remindersEnabled()
                ? "هر " + intervalLabel(store.getReminderIntervalMinutes()) + " · از "
                + hourLabel(store.getStartHour()) + " تا " + hourLabel(store.getEndHour())
                + " · پیشنهاد پویا و snooze  ›"
                : "خاموش · برای تنظیم لمس کنید");
    }

    private void addIntake(int amount, String type) {
        store.addIntake(amount, type);
        refreshAfterChange();
        String msg = PersianNumbers.format(amount) + " میلی‌لیتر "
                + drinkLabel(type) + " ثبت شد";
        if (!"water".equals(type)) {
            int effective = HydrationCalculator.effectiveMl(amount, type);
            msg += " (≈ " + PersianNumbers.format(effective) + ")";
        }
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
    }

    private void refreshAfterChange() {
        refresh();
        WaterWidgetProvider.updateAll(this);
        MiniWidgetProvider.updateAll(this);
    }

    private void showCustomAmountDialog() {
        EditText input = numberInput("مثلاً ۳۵۰", "");
        AlertDialog dialog = new AlertDialog.Builder(this)
                .setTitle("مقدار آب")
                .setMessage("مقدار را بر حسب میلی‌لیتر وارد کنید.")
                .setView(input)
                .setPositiveButton("ثبت", null)
                .setNegativeButton("انصراف", null)
                .create();
        dialog.setOnShowListener(ignored -> dialog.getButton(AlertDialog.BUTTON_POSITIVE)
                .setOnClickListener(v -> {
                    try {
                        int amount = Integer.parseInt(PersianNumbers.normalize(
                                input.getText().toString().trim()));
                        if (amount < 50 || amount > 2_000) {
                            input.setError("عددی بین ۵۰ تا ۲۰۰۰ وارد کنید");
                            return;
                        }
                        addIntake(amount, "water");
                        dialog.dismiss();
                    } catch (NumberFormatException error) {
                        input.setError("مقدار معتبر وارد کنید");
                    }
                }));
        dialog.show();
    }

    private void showDrinkAmountDialog(String type, String label) {
        EditText input = numberInput("میلی‌لیتر", "250");
        AlertDialog dialog = new AlertDialog.Builder(this)
                .setTitle(label)
                .setMessage("ضریب آب‌رسانی این نوشیدنی "
                        + PersianNumbers.format(Math.round(HydrationCalculator.drinkFactor(type) * 100))
                        + "٪ است.")
                .setView(input)
                .setPositiveButton("ثبت", null)
                .setNegativeButton("انصراف", null)
                .create();
        dialog.setOnShowListener(ignored -> dialog.getButton(AlertDialog.BUTTON_POSITIVE)
                .setOnClickListener(v -> {
                    try {
                        int amount = Integer.parseInt(PersianNumbers.normalize(
                                input.getText().toString().trim()));
                        if (amount < 50 || amount > 2_000) {
                            input.setError("عددی بین ۵۰ تا ۲۰۰۰ وارد کنید");
                            return;
                        }
                        addIntake(amount, type);
                        dialog.dismiss();
                    } catch (NumberFormatException error) {
                        input.setError("مقدار معتبر وارد کنید");
                    }
                }));
        dialog.show();
    }

    private void showWeightDialog(boolean firstRun) {
        EditText input = numberInput("وزن به کیلوگرم",
                firstRun ? "" : PersianNumbers.format(store.getWeightKg()));
        AlertDialog.Builder builder = new AlertDialog.Builder(this)
                .setTitle(firstRun ? "برای شروع، وزنت چقدر است؟" : "ویرایش وزن")
                .setMessage("هدف پایه با فرمول ۳۵ میلی‌لیتر به‌ازای هر کیلوگرم محاسبه می‌شود.")
                .setView(input)
                .setPositiveButton("ذخیره", null);
        if (!firstRun) {
            builder.setNegativeButton("انصراف", null);
        }
        AlertDialog dialog = builder.create();
        dialog.setCancelable(!firstRun);
        dialog.setOnShowListener(ignored -> dialog.getButton(AlertDialog.BUTTON_POSITIVE)
                .setOnClickListener(v -> {
                    try {
                        float weight = Float.parseFloat(PersianNumbers.normalize(
                                input.getText().toString().trim()));
                        if (weight < HydrationCalculator.MIN_WEIGHT_KG
                                || weight > HydrationCalculator.MAX_WEIGHT_KG) {
                            input.setError("وزن باید بین ۳۰ تا ۲۵۰ کیلوگرم باشد");
                            return;
                        }
                        store.setWeightKg(weight);
                        refreshAfterChange();
                        dialog.dismiss();
                        if (firstRun) {
                            maybeShowBatteryTip();
                        }
                    } catch (NumberFormatException error) {
                        input.setError("وزن معتبر وارد کنید");
                    }
                }));
        dialog.show();
    }

    private void showGoalDialog() {
        String[] options = {
                "ویرایش وزن",
                "تنظیم هدف دستی",
                "بازگشت به هدف خودکار"
        };
        new AlertDialog.Builder(this)
                .setTitle("هدف روزانه")
                .setItems(options, (dialog, which) -> {
                    if (which == 0) {
                        showWeightDialog(false);
                    } else if (which == 1) {
                        EditText input = numberInput("میلی‌لیتر",
                                PersianNumbers.format(store.getGoalMl()));
                        new AlertDialog.Builder(this)
                                .setTitle("هدف دستی")
                                .setView(input)
                                .setPositiveButton("ذخیره", (d, w) -> {
                                    try {
                                        int goal = Integer.parseInt(PersianNumbers.normalize(
                                                input.getText().toString().trim()));
                                        if (goal < 500 || goal > 10_000) {
                                            Toast.makeText(this, "هدف بین ۵۰۰ تا ۱۰۰۰۰",
                                                    Toast.LENGTH_SHORT).show();
                                            return;
                                        }
                                        store.setManualGoalMl(goal);
                                        refreshAfterChange();
                                    } catch (NumberFormatException ignored) {
                                    }
                                })
                                .setNegativeButton("انصراف", null)
                                .show();
                    } else {
                        store.setManualGoalMl(0);
                        refreshAfterChange();
                    }
                })
                .show();
    }

    private void showActivityDialog() {
        String[] labels = {
                "کم‌تحرک (۱۰۰٪)",
                "سبک (۱۱۰٪)",
                "متوسط (۱۲۰٪)",
                "فعال (۱۳۰٪)"
        };
        new AlertDialog.Builder(this)
                .setTitle("سطح فعالیت")
                .setSingleChoiceItems(labels, store.getActivityLevel(), (dialog, which) -> {
                    store.setActivityLevel(which);
                    refreshAfterChange();
                    dialog.dismiss();
                })
                .setNegativeButton("انصراف", null)
                .show();
    }

    private void showReminderDialog() {
        LinearLayout content = vertical();
        content.setPadding(dp(22), 0, dp(22), 0);

        content.addView(text("فاصله یادآوری", 13, theme.muted, Typeface.BOLD));
        NumberPicker intervalPicker = new NumberPicker(this);
        String[] intervals = {"۳۰ دقیقه", "۱ ساعت", "۱ ساعت و ۳۰ دقیقه", "۲ ساعت", "۳ ساعت", "۴ ساعت"};
        int[] intervalValues = {30, 60, 90, 120, 180, 240};
        intervalPicker.setMinValue(0);
        intervalPicker.setMaxValue(intervals.length - 1);
        intervalPicker.setDisplayedValues(intervals);
        intervalPicker.setValue(indexOf(intervalValues, store.getReminderIntervalMinutes()));
        content.addView(intervalPicker, matchWidth(dp(92)));

        LinearLayout times = horizontal();
        Button startButton = actionButton(
                getString(R.string.start_time, hourLabel(store.getStartHour())), true);
        Button endButton = actionButton(
                getString(R.string.end_time, hourLabel(store.getEndHour())), true);
        final int[] selectedHours = {store.getStartHour(), store.getEndHour()};
        startButton.setOnClickListener(v -> showHourPicker("ساعت شروع", selectedHours[0], hour -> {
            selectedHours[0] = hour;
            startButton.setText(getString(R.string.start_time, hourLabel(hour)));
        }));
        endButton.setOnClickListener(v -> showHourPicker("ساعت پایان", selectedHours[1], hour -> {
            selectedHours[1] = hour;
            endButton.setText(getString(R.string.end_time, hourLabel(hour)));
        }));
        times.addView(startButton, weighted());
        times.addView(endButton, weighted());
        content.addView(times, topMargin(dp(8)));

        new AlertDialog.Builder(this)
                .setTitle("تنظیم یادآوری هوشمند")
                .setMessage("اعلان‌ها مقدار پیشنهادی پویا دارند، اگر تازه آب خورده باشی رد می‌شوند، دکمه snooze دارند و در پایان روز جمع‌بندی می‌فرستند.")
                .setView(content)
                .setPositiveButton("ذخیره و فعال‌سازی", (dialog, which) -> {
                    store.setReminderIntervalMinutes(intervalValues[intervalPicker.getValue()]);
                    store.setStartHour(selectedHours[0]);
                    store.setEndHour(selectedHours[1]);
                    store.setRemindersEnabled(true);
                    requestNotificationPermission();
                    ReminderScheduler.sync(this);
                    refreshReminder();
                    maybeShowBatteryTip();
                })
                .setNegativeButton("انصراف", null)
                .show();
    }

    private void showCupsEditor() {
        List<WaterStore.Cup> cups = new ArrayList<>(store.getCups());
        CharSequence[] lines = new CharSequence[cups.size()];
        for (int i = 0; i < cups.size(); i++) {
            lines[i] = cups.get(i).name + " — " + PersianNumbers.format(cups.get(i).ml) + " ml";
        }
        new AlertDialog.Builder(this)
                .setTitle("ظرف‌های سریع")
                .setItems(lines, (dialog, which) -> {
                    WaterStore.Cup selected = cups.get(which);
                    EditText name = textInput("نام", selected.name);
                    EditText ml = numberInput("میلی‌لیتر", PersianNumbers.format(selected.ml));
                    LinearLayout box = vertical();
                    box.setPadding(dp(20), 0, dp(20), 0);
                    box.addView(name);
                    box.addView(ml, topMargin(dp(8)));
                    new AlertDialog.Builder(this)
                            .setTitle("ویرایش ظرف")
                            .setView(box)
                            .setPositiveButton("ذخیره", (d, w) -> {
                                try {
                                    int amount = Integer.parseInt(PersianNumbers.normalize(
                                            ml.getText().toString().trim()));
                                    String cupName = name.getText().toString().trim();
                                    if (cupName.isEmpty() || amount < 50 || amount > 2000) {
                                        return;
                                    }
                                    cups.set(which, new WaterStore.Cup(cupName, amount));
                                    store.setCups(cups);
                                    refreshAfterChange();
                                } catch (NumberFormatException ignored) {
                                }
                            })
                            .setNeutralButton("حذف", (d, w) -> {
                                if (cups.size() > 1) {
                                    cups.remove(which);
                                    store.setCups(cups);
                                    refreshAfterChange();
                                }
                            })
                            .setNegativeButton("انصراف", null)
                            .show();
                })
                .setPositiveButton("افزودن ظرف", (dialog, which) -> {
                    EditText name = textInput("نام", "لیوان من");
                    EditText ml = numberInput("میلی‌لیتر", "300");
                    LinearLayout box = vertical();
                    box.setPadding(dp(20), 0, dp(20), 0);
                    box.addView(name);
                    box.addView(ml, topMargin(dp(8)));
                    new AlertDialog.Builder(this)
                            .setTitle("ظرف جدید")
                            .setView(box)
                            .setPositiveButton("افزودن", (d, w) -> {
                                try {
                                    int amount = Integer.parseInt(PersianNumbers.normalize(
                                            ml.getText().toString().trim()));
                                    String cupName = name.getText().toString().trim();
                                    if (cupName.isEmpty() || amount < 50 || amount > 2000) {
                                        return;
                                    }
                                    cups.add(new WaterStore.Cup(cupName, amount));
                                    store.setCups(cups);
                                    refreshAfterChange();
                                } catch (NumberFormatException ignored) {
                                }
                            })
                            .setNegativeButton("انصراف", null)
                            .show();
                })
                .setNegativeButton("بستن", null)
                .show();
    }

    private void showBackupDialog() {
        new AlertDialog.Builder(this)
                .setTitle("پشتیبان‌گیری")
                .setItems(new CharSequence[]{"اشتراک فایل پشتیبان JSON", "بازیابی از متن JSON"},
                        (dialog, which) -> {
                            if (which == 0) {
                                try {
                                    Intent share = new Intent(Intent.ACTION_SEND);
                                    share.setType("application/json");
                                    share.putExtra(Intent.EXTRA_SUBJECT, "پشتیبان آب‌یار");
                                    share.putExtra(Intent.EXTRA_TEXT, store.exportJson());
                                    startActivity(Intent.createChooser(share, "اشتراک پشتیبان"));
                                } catch (JSONException e) {
                                    Toast.makeText(this, "خطا در ساخت پشتیبان", Toast.LENGTH_SHORT).show();
                                }
                            } else {
                                EditText input = textInput("متن JSON را بچسبانید", "");
                                input.setMinLines(5);
                                input.setInputType(InputType.TYPE_CLASS_TEXT
                                        | InputType.TYPE_TEXT_FLAG_MULTI_LINE);
                                new AlertDialog.Builder(this)
                                        .setTitle("بازیابی")
                                        .setView(input)
                                        .setPositiveButton("بازیابی", (d, w) -> {
                                            try {
                                                store.importJson(input.getText().toString());
                                                ReminderScheduler.sync(this);
                                                rebuildUi();
                                                Toast.makeText(this, "بازیابی شد", Toast.LENGTH_SHORT).show();
                                            } catch (JSONException e) {
                                                Toast.makeText(this, "JSON نامعتبر", Toast.LENGTH_SHORT).show();
                                            }
                                        })
                                        .setNegativeButton("انصراف", null)
                                        .show();
                            }
                        })
                .setNegativeButton("انصراف", null)
                .show();
    }

    private void shareHealthExport() {
        Intent share = new Intent(Intent.ACTION_SEND);
        share.setType("text/csv");
        share.putExtra(Intent.EXTRA_SUBJECT, "Abyar hydration export");
        share.putExtra(Intent.EXTRA_TEXT, store.exportHealthCsv());
        startActivity(Intent.createChooser(share, "خروجی سلامت / Health Connect"));
        Toast.makeText(this,
                "CSV آماده اشتراک با اپ‌های سلامت و پل‌های Health Connect است",
                Toast.LENGTH_LONG).show();
    }

    private void maybeShowBatteryTip() {
        if (store.wasBatteryTipShown() || !store.remindersEnabled()) {
            return;
        }
        if (isIgnoringBatteryOptimizations()) {
            store.setBatteryTipShown(true);
            return;
        }
        new AlertDialog.Builder(this)
                .setTitle("یادآور پایدارتر")
                .setMessage("روی بعضی گوشی‌ها (شیائومی، هواوی، سامسونگ) بهینه‌سازی باتری باعث قطع یادآورها می‌شود. بهتر است آب‌یار را از محدودیت باتری خارج کنید.")
                .setPositiveButton("تنظیمات باتری", (d, w) -> {
                    store.setBatteryTipShown(true);
                    openBatterySettings(false);
                })
                .setNegativeButton("بعداً", (d, w) -> store.setBatteryTipShown(true))
                .show();
    }

    private boolean isIgnoringBatteryOptimizations() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return true;
        }
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        return pm != null && pm.isIgnoringBatteryOptimizations(getPackageName());
    }

    private void openBatterySettings(boolean fromSettings) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getPackageName()));
                startActivity(intent);
                return;
            }
        } catch (Exception ignored) {
        }
        try {
            startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));
        } catch (Exception e) {
            if (fromSettings) {
                Toast.makeText(this, "تنظیمات باتری در دسترس نیست", Toast.LENGTH_SHORT).show();
            }
        }
    }

    private void showHourPicker(String title, int initialHour, HourConsumer consumer) {
        TimePickerDialog picker = new TimePickerDialog(
                this,
                (view, hourOfDay, minute) -> consumer.accept(hourOfDay),
                initialHour,
                0,
                true
        );
        picker.setTitle(title);
        picker.show();
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 801);
        }
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            String[] permissions,
            int[] grantResults
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != 801) {
            return;
        }
        boolean granted = grantResults.length > 0
                && grantResults[0] == PackageManager.PERMISSION_GRANTED;
        if (!granted) {
            store.setRemindersEnabled(false);
            ReminderScheduler.cancel(this);
            refreshReminder();
            Toast.makeText(
                    this,
                    "برای فعال‌شدن یادآوری باید اجازه اعلان را بدهید",
                    Toast.LENGTH_LONG
            ).show();
        }
    }

    private EditText numberInput(String hint, String initial) {
        EditText input = textInput(hint, initial);
        input.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        input.setTextDirection(View.TEXT_DIRECTION_LTR);
        return input;
    }

    private EditText textInput(String hint, String initial) {
        EditText input = new EditText(this);
        input.setHint(hint);
        input.setText(initial);
        input.setSelectAllOnFocus(true);
        input.setGravity(Gravity.CENTER);
        input.setTextColor(theme.ink);
        input.setHintTextColor(theme.muted);
        input.setPadding(dp(12), dp(12), dp(12), dp(12));
        return input;
    }

    private Button actionButton(String label, boolean secondary) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextSize(11);
        button.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        button.setAllCaps(false);
        button.setMinHeight(0);
        button.setMinWidth(0);
        button.setPadding(dp(4), dp(10), dp(4), dp(10));
        button.setTextColor(secondary ? theme.ocean : Color.WHITE);
        button.setBackground(roundRect(secondary ? theme.ice : theme.ocean, dp(14)));
        return button;
    }

    private LinearLayout card() {
        LinearLayout card = vertical();
        card.setBackground(roundRect(theme.surface, dp(20)));
        card.setElevation(dp(2));
        return card;
    }

    private TextView sectionTitle(String value) {
        TextView title = text(value, 15, theme.ink, Typeface.BOLD);
        title.setPadding(dp(3), 0, dp(3), dp(8));
        return title;
    }

    private TextView text(String value, float size, int color, int style) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        view.setTypeface(Typeface.create("sans", style));
        view.setTextDirection(View.TEXT_DIRECTION_RTL);
        return view;
    }

    private LinearLayout vertical() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        return layout;
    }

    private LinearLayout horizontal() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.HORIZONTAL);
        return layout;
    }

    private GradientDrawable roundRect(int color, float radius) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(radius);
        return drawable;
    }

    private LinearLayout.LayoutParams weighted() {
        return new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
    }

    private LinearLayout.LayoutParams matchWrap() {
        return new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
    }

    private LinearLayout.LayoutParams matchWidth(int height) {
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, height);
    }

    private LinearLayout.LayoutParams topMargin(int margin) {
        LinearLayout.LayoutParams params = matchWidth(ViewGroup.LayoutParams.WRAP_CONTENT);
        params.setMargins(0, margin, 0, 0);
        return params;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private static int indexOf(int[] values, int target) {
        for (int i = 0; i < values.length; i++) {
            if (values[i] == target) {
                return i;
            }
        }
        return 3;
    }

    private static String intervalLabel(int minutes) {
        if (minutes < 60) {
            return PersianNumbers.format(minutes) + " دقیقه";
        }
        if (minutes % 60 == 0) {
            return PersianNumbers.format(minutes / 60) + " ساعت";
        }
        return PersianNumbers.format(minutes / 60) + " ساعت و "
                + PersianNumbers.format(minutes % 60) + " دقیقه";
    }

    private static String hourLabel(int hour) {
        return PersianNumbers.localize(String.format(Locale.US, "%02d:00", hour));
    }

    private static String activityLabel(int level) {
        switch (level) {
            case HydrationCalculator.ACTIVITY_LIGHT:
                return "فعالیت سبک";
            case HydrationCalculator.ACTIVITY_MODERATE:
                return "فعالیت متوسط";
            case HydrationCalculator.ACTIVITY_ACTIVE:
                return "فعالیت زیاد";
            default:
                return "کم‌تحرک";
        }
    }

    private static String drinkLabel(String type) {
        switch (type) {
            case "tea":
                return "چای";
            case "coffee":
                return "قهوه";
            case "juice":
                return "آبمیوه";
            case "milk":
                return "شیر";
            default:
                return "آب";
        }
    }

    private interface HourConsumer {
        void accept(int hour);
    }

    private static final class ThemeColors {
        final int ocean;
        final int oceanDark;
        final int aqua;
        final int ice;
        final int ink;
        final int muted;
        final int bg;
        final int surface;
        final int line;
        final int progressTrack;
        final int success;
        final int miss;

        private ThemeColors(
                int ocean, int oceanDark, int aqua, int ice, int ink, int muted,
                int bg, int surface, int line, int progressTrack, int success, int miss
        ) {
            this.ocean = ocean;
            this.oceanDark = oceanDark;
            this.aqua = aqua;
            this.ice = ice;
            this.ink = ink;
            this.muted = muted;
            this.bg = bg;
            this.surface = surface;
            this.line = line;
            this.progressTrack = progressTrack;
            this.success = success;
            this.miss = miss;
        }

        static ThemeColors from(boolean dark) {
            if (dark) {
                return new ThemeColors(
                        Color.rgb(66, 198, 217),
                        Color.rgb(4, 36, 42),
                        Color.rgb(66, 198, 217),
                        Color.rgb(18, 48, 54),
                        Color.rgb(230, 242, 244),
                        Color.rgb(150, 175, 180),
                        Color.rgb(8, 22, 26),
                        Color.rgb(14, 36, 42),
                        Color.rgb(30, 58, 64),
                        Color.rgb(30, 58, 64),
                        Color.rgb(72, 180, 130),
                        Color.rgb(50, 70, 76)
                );
            }
            return new ThemeColors(
                    Color.rgb(17, 107, 120),
                    Color.rgb(7, 63, 74),
                    Color.rgb(66, 198, 217),
                    Color.rgb(234, 248, 250),
                    Color.rgb(16, 42, 48),
                    Color.rgb(94, 119, 124),
                    Color.rgb(244, 249, 250),
                    Color.WHITE,
                    Color.rgb(221, 232, 234),
                    Color.rgb(221, 236, 239),
                    Color.rgb(46, 160, 120),
                    Color.rgb(226, 239, 241)
            );
        }
    }

    private final class HistoryView extends View {
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private int[] values = new int[7];
        private int goal = 1;
        private ThemeColors localTheme = theme;

        HistoryView(Context context) {
            super(context);
            setLayerType(View.LAYER_TYPE_SOFTWARE, null);
        }

        void setTheme(ThemeColors colors) {
            localTheme = colors;
        }

        void setValues(int[] newValues, int newGoal) {
            values = newValues;
            goal = Math.max(1, newGoal);
            invalidate();
        }

        @Override
        protected void onDraw(Canvas canvas) {
            super.onDraw(canvas);
            float width = getWidth();
            float height = getHeight();
            float chartTop = dp(10);
            float chartBottom = height - dp(30);
            float slot = width / 7f;
            float barWidth = Math.min(dp(20), slot * 0.55f);
            paint.setTextAlign(Paint.Align.CENTER);
            for (int i = 0; i < values.length; i++) {
                float x = slot * i + slot / 2f;
                float ratio = Math.min(1f, values[i] / (float) goal);
                float barHeight = Math.max(dp(5), (chartBottom - chartTop) * ratio);
                paint.setColor(localTheme.miss);
                canvas.drawRoundRect(x - barWidth / 2, chartTop, x + barWidth / 2,
                        chartBottom, barWidth / 2, barWidth / 2, paint);
                paint.setColor(i == 6 ? localTheme.ocean : localTheme.aqua);
                canvas.drawRoundRect(x - barWidth / 2, chartBottom - barHeight,
                        x + barWidth / 2, chartBottom, barWidth / 2, barWidth / 2, paint);
                paint.setColor(localTheme.muted);
                paint.setTextSize(dp(9));
                canvas.drawText(i == 6 ? "امروز" : PersianNumbers.format(i + 1),
                        x, height - dp(8), paint);
            }
        }

        private float dp(int value) {
            return value * getResources().getDisplayMetrics().density;
        }
    }

    private final class CalendarView extends View {
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private int jy;
        private int jm;
        private int[] dayTotals = new int[32];
        private int goal = 1;
        private ThemeColors localTheme = theme;

        CalendarView(Context context) {
            super(context);
        }

        void setTheme(ThemeColors colors) {
            localTheme = colors;
        }

        void setMonth(int year, int month, int[] totals, int newGoal) {
            jy = year;
            jm = month;
            dayTotals = totals;
            goal = Math.max(1, newGoal);
            invalidate();
        }

        @Override
        protected void onDraw(Canvas canvas) {
            super.onDraw(canvas);
            paint.setTextAlign(Paint.Align.CENTER);
            paint.setColor(localTheme.ink);
            paint.setTextSize(dp(13));
            paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
            canvas.drawText(
                    JalaliCalendar.monthName(jm) + " " + PersianNumbers.format(jy),
                    getWidth() / 2f,
                    dp(16),
                    paint
            );

            String[] week = {"ش", "ی", "د", "س", "چ", "پ", "ج"};
            float cellW = getWidth() / 7f;
            float startY = dp(34);
            paint.setTextSize(dp(11));
            paint.setColor(localTheme.muted);
            paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.NORMAL));
            for (int i = 0; i < 7; i++) {
                canvas.drawText(week[i], cellW * i + cellW / 2f, startY, paint);
            }

            int[] g = JalaliCalendar.fromJalali(jy, jm, 1);
            int offset = JalaliCalendar.weekdayIndex(g[0], g[1], g[2]);
            int days = JalaliCalendar.daysInMonth(jy, jm);
            int[] today = JalaliCalendar.today();
            float rowH = dp(28);
            paint.setTextSize(dp(12));
            for (int day = 1; day <= days; day++) {
                int index = offset + day - 1;
                int row = index / 7;
                int col = index % 7;
                float cx = cellW * col + cellW / 2f;
                float cy = startY + dp(18) + row * rowH;
                int total = day <= dayTotals.length - 1 ? dayTotals[day] : 0;
                boolean success = total >= goal;
                boolean isToday = today[0] == jy && today[1] == jm && today[2] == day;
                if (success) {
                    paint.setColor(localTheme.success);
                    canvas.drawCircle(cx, cy - dp(4), dp(11), paint);
                    paint.setColor(Color.WHITE);
                } else if (total > 0) {
                    paint.setColor(localTheme.aqua);
                    canvas.drawCircle(cx, cy - dp(4), dp(11), paint);
                    paint.setColor(Color.WHITE);
                } else {
                    paint.setColor(isToday ? localTheme.ocean : localTheme.ink);
                }
                canvas.drawText(PersianNumbers.format(day), cx, cy, paint);
                if (isToday && !success && total == 0) {
                    paint.setStyle(Paint.Style.STROKE);
                    paint.setStrokeWidth(dp(1.5f));
                    paint.setColor(localTheme.ocean);
                    canvas.drawCircle(cx, cy - dp(4), dp(12), paint);
                    paint.setStyle(Paint.Style.FILL);
                }
            }
        }

        @Override
        protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
            int width = MeasureSpec.getSize(widthMeasureSpec);
            int[] g = JalaliCalendar.fromJalali(jy == 0 ? JalaliCalendar.today()[0] : jy,
                    jm == 0 ? JalaliCalendar.today()[1] : jm, 1);
            int offset = JalaliCalendar.weekdayIndex(g[0], g[1], g[2]);
            int days = JalaliCalendar.daysInMonth(
                    jy == 0 ? JalaliCalendar.today()[0] : jy,
                    jm == 0 ? JalaliCalendar.today()[1] : jm
            );
            int rows = (offset + days + 6) / 7;
            setMeasuredDimension(width, dp(50) + rows * dp(28));
        }

        private int dp(int value) {
            return Math.round(value * getResources().getDisplayMetrics().density);
        }
    }
}
