package ir.abnavaz.abyar;

import android.Manifest;
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
import android.os.Build;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.NumberPicker;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

import ir.abnavaz.abyar.data.HydrationCalculator;
import ir.abnavaz.abyar.data.WaterStore;
import ir.abnavaz.abyar.reminder.AddWaterReceiver;
import ir.abnavaz.abyar.reminder.ReminderReceiver;
import ir.abnavaz.abyar.reminder.ReminderScheduler;
import ir.abnavaz.abyar.util.PersianNumbers;
import ir.abnavaz.abyar.widget.WaterWidgetProvider;

public final class MainActivity extends Activity {
    private static final int OCEAN = Color.rgb(17, 107, 120);
    private static final int OCEAN_DARK = Color.rgb(7, 63, 74);
    private static final int AQUA = Color.rgb(66, 198, 217);
    private static final int ICE = Color.rgb(234, 248, 250);
    private static final int INK = Color.rgb(16, 42, 48);
    private static final int MUTED = Color.rgb(94, 119, 124);
    private static final int BG = Color.rgb(244, 249, 250);

    private WaterStore store;
    private TextView amountText;
    private TextView percentText;
    private TextView remainingText;
    private TextView glassesText;
    private TextView goalText;
    private TextView weightText;
    private TextView reminderText;
    private ProgressBar progressBar;
    private Switch reminderSwitch;
    private HistoryView historyView;
    private boolean bindingReminder;

    private final BroadcastReceiver waterChangedReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            refresh();
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(OCEAN_DARK);
        getWindow().setNavigationBarColor(Color.WHITE);
        store = new WaterStore(this);
        ReminderReceiver.ensureChannel(this);
        setContentView(buildContent());
        if (!store.isOnboarded()) {
            amountText.post(() -> showWeightDialog(true));
        }
    }

    @Override
    protected void onStart() {
        super.onStart();
        IntentFilter filter = new IntentFilter(AddWaterReceiver.ACTION_WATER_CHANGED);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(waterChangedReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(waterChangedReceiver, filter);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        refresh();
    }

    @Override
    protected void onStop() {
        unregisterReceiver(waterChangedReceiver);
        super.onStop();
    }

    private View buildContent() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BG);

        LinearLayout root = vertical();
        root.setPadding(dp(16), 0, dp(16), dp(32));
        root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        scroll.addView(root, matchWrap());

        root.addView(buildHeader(), matchWidth(dp(216)));
        LinearLayout.LayoutParams overlap = matchWidth(ViewGroup.LayoutParams.WRAP_CONTENT);
        overlap.setMargins(0, dp(-38), 0, 0);
        root.addView(buildProgressCard(), overlap);
        root.addView(sectionTitle("ثبت سریع"), topMargin(dp(24)));
        root.addView(buildQuickAdd(), matchWidth(ViewGroup.LayoutParams.WRAP_CONTENT));
        root.addView(buildUndoButton(), topMargin(dp(8)));
        root.addView(sectionTitle("برنامه روزانه"), topMargin(dp(24)));
        root.addView(buildGoalCard(), matchWidth(ViewGroup.LayoutParams.WRAP_CONTENT));
        root.addView(buildReminderCard(), topMargin(dp(12)));
        root.addView(sectionTitle("۷ روز گذشته"), topMargin(dp(24)));
        root.addView(buildHistoryCard(), matchWidth(dp(190)));
        root.addView(buildDisclaimer(), topMargin(dp(16)));

        return scroll;
    }

    private View buildHeader() {
        LinearLayout header = vertical();
        header.setGravity(Gravity.CENTER_HORIZONTAL);
        header.setPadding(dp(20), dp(28), dp(20), dp(62));
        GradientDrawable gradient = new GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                new int[]{OCEAN_DARK, OCEAN, Color.rgb(25, 145, 158)}
        );
        gradient.setCornerRadii(new float[]{0, 0, 0, 0, dp(30), dp(30), dp(30), dp(30)});
        header.setBackground(gradient);

        TextView title = text("آب‌یار  💧", 25, Color.WHITE, Typeface.BOLD);
        title.setGravity(Gravity.CENTER);
        header.addView(title, matchWidth(ViewGroup.LayoutParams.WRAP_CONTENT));

        String date = new SimpleDateFormat("EEEE، d MMMM", new Locale("fa"))
                .format(new Date());
        TextView subtitle = text("امروز " + PersianNumbers.localize(date), 14,
                Color.argb(210, 255, 255, 255), Typeface.NORMAL);
        subtitle.setGravity(Gravity.CENTER);
        header.addView(subtitle, topMargin(dp(5)));
        return header;
    }

    private View buildProgressCard() {
        LinearLayout card = card();
        card.setGravity(Gravity.CENTER_HORIZONTAL);
        card.setPadding(dp(20), dp(22), dp(20), dp(18));

        TextView label = text("مصرف امروز", 14, MUTED, Typeface.BOLD);
        card.addView(label);

        amountText = text("", 36, OCEAN_DARK, Typeface.BOLD);
        amountText.setGravity(Gravity.CENTER);
        card.addView(amountText, topMargin(dp(3)));

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setProgressTintList(ColorStateList.valueOf(AQUA));
        progressBar.setProgressBackgroundTintList(ColorStateList.valueOf(Color.rgb(221, 236, 239)));
        LinearLayout.LayoutParams progressParams = matchWidth(dp(12));
        progressParams.setMargins(0, dp(14), 0, dp(12));
        card.addView(progressBar, progressParams);

        percentText = text("", 14, OCEAN, Typeface.BOLD);
        percentText.setGravity(Gravity.CENTER);
        card.addView(percentText);

        LinearLayout stats = horizontal();
        stats.setGravity(Gravity.CENTER);
        stats.setPadding(0, dp(16), 0, 0);
        remainingText = text("", 13, MUTED, Typeface.NORMAL);
        remainingText.setGravity(Gravity.CENTER);
        glassesText = text("", 13, MUTED, Typeface.NORMAL);
        glassesText.setGravity(Gravity.CENTER);
        stats.addView(remainingText, weighted());
        View separator = new View(this);
        separator.setBackgroundColor(Color.rgb(221, 232, 234));
        stats.addView(separator, new LinearLayout.LayoutParams(dp(1), dp(32)));
        stats.addView(glassesText, weighted());
        card.addView(stats, matchWidth(ViewGroup.LayoutParams.WRAP_CONTENT));
        return card;
    }

    private View buildQuickAdd() {
        LinearLayout row = horizontal();
        row.setGravity(Gravity.CENTER);
        int[] values = {200, 250, 500};
        for (int value : values) {
            Button button = actionButton("+" + PersianNumbers.format(value), false);
            button.setContentDescription("افزودن " + PersianNumbers.format(value) + " میلی‌لیتر");
            button.setOnClickListener(v -> addWater(value));
            LinearLayout.LayoutParams params = weighted();
            params.setMargins(dp(4), 0, dp(4), 0);
            row.addView(button, params);
        }
        Button custom = actionButton("مقدار دلخواه", true);
        custom.setOnClickListener(v -> showCustomAmountDialog());
        LinearLayout.LayoutParams customParams = weighted();
        customParams.setMargins(dp(4), 0, dp(4), 0);
        row.addView(custom, customParams);
        return row;
    }

    private View buildUndoButton() {
        TextView undo = text("↶  حذف آخرین ثبت", 13, MUTED, Typeface.BOLD);
        undo.setGravity(Gravity.CENTER);
        undo.setPadding(dp(10), dp(10), dp(10), dp(10));
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
        card.setPadding(dp(18), dp(17), dp(18), dp(17));
        card.setOnClickListener(v -> showWeightDialog(false));

        TextView icon = text("⚖", 25, OCEAN, Typeface.NORMAL);
        icon.setGravity(Gravity.CENTER);
        icon.setBackground(roundRect(ICE, dp(16)));
        icon.setPadding(dp(11), dp(9), dp(11), dp(9));
        card.addView(icon, new LinearLayout.LayoutParams(dp(52), dp(52)));

        LinearLayout labels = vertical();
        labels.setPadding(dp(12), 0, dp(12), 0);
        labels.addView(text("هدف پیشنهادی روزانه", 14, INK, Typeface.BOLD));
        weightText = text("", 12, MUTED, Typeface.NORMAL);
        labels.addView(weightText, topMargin(dp(3)));
        card.addView(labels, weighted());

        goalText = text("", 16, OCEAN, Typeface.BOLD);
        goalText.setGravity(Gravity.END | Gravity.CENTER_VERTICAL);
        card.addView(goalText);
        return card;
    }

    private View buildReminderCard() {
        LinearLayout card = card();
        card.setOrientation(LinearLayout.HORIZONTAL);
        card.setGravity(Gravity.CENTER_VERTICAL);
        card.setPadding(dp(18), dp(14), dp(18), dp(14));

        LinearLayout labels = vertical();
        labels.addView(text("یادآوری نوشیدن آب", 14, INK, Typeface.BOLD));
        reminderText = text("", 12, MUTED, Typeface.NORMAL);
        labels.addView(reminderText, topMargin(dp(3)));
        labels.setOnClickListener(v -> showReminderDialog());
        card.addView(labels, weighted());

        reminderSwitch = new Switch(this);
        reminderSwitch.setShowText(false);
        reminderSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (bindingReminder) {
                return;
            }
            store.setRemindersEnabled(isChecked);
            if (isChecked) {
                requestNotificationPermission();
            }
            ReminderScheduler.sync(this);
            refreshReminder();
        });
        card.addView(reminderSwitch);
        return card;
    }

    private View buildHistoryCard() {
        LinearLayout card = card();
        card.setPadding(dp(14), dp(16), dp(14), dp(10));
        historyView = new HistoryView(this);
        card.addView(historyView, matchWidth(dp(160)));
        return card;
    }

    private View buildDisclaimer() {
        TextView note = text(
                "هدف بر پایه فرمول عمومی ۳۵ میلی‌لیتر به‌ازای هر کیلوگرم است. نیاز واقعی با فعالیت، آب‌وهوا، بارداری و شرایط پزشکی تغییر می‌کند؛ در بیماری‌های کلیوی یا قلبی با پزشک مشورت کنید.",
                12, MUTED, Typeface.NORMAL
        );
        note.setLineSpacing(0, 1.25f);
        note.setBackground(roundRect(Color.rgb(232, 241, 243), dp(14)));
        note.setPadding(dp(14), dp(12), dp(14), dp(12));
        return note;
    }

    private void refresh() {
        int total = store.getTodayTotalMl();
        int goal = store.getGoalMl();
        int percent = goal == 0 ? 0 : Math.min(100, Math.round(total * 100f / goal));
        amountText.setText(PersianNumbers.format(total) + " میلی‌لیتر");
        progressBar.setProgress(percent, true);
        percentText.setText(percent >= 100
                ? "آفرین! هدف امروز کامل شد ✓"
                : PersianNumbers.format(percent) + "٪ از هدف روزانه");
        remainingText.setText(percent >= 100
                ? "هدف کامل شده"
                : PersianNumbers.format(Math.max(0, goal - total)) + " میلی‌لیتر مانده");
        glassesText.setText(PersianNumbers.format(store.getTodayCount()) + " بار ثبت");
        goalText.setText(PersianNumbers.format(goal) + " ml");
        weightText.setText("بر اساس وزن " + PersianNumbers.format(store.getWeightKg()) + " کیلوگرم  ›");
        refreshReminder();
        if (historyView != null) {
            historyView.setValues(store.getLastSevenDaysMl(), goal);
        }
    }

    private void refreshReminder() {
        bindingReminder = true;
        reminderSwitch.setChecked(store.remindersEnabled());
        bindingReminder = false;
        reminderText.setText(store.remindersEnabled()
                ? "هر " + intervalLabel(store.getReminderIntervalMinutes()) + " · از "
                + hourLabel(store.getStartHour()) + " تا " + hourLabel(store.getEndHour()) + "  ›"
                : "خاموش · برای تنظیم لمس کنید");
    }

    private void addWater(int amount) {
        store.addWater(amount);
        refreshAfterChange();
        Toast.makeText(this,
                PersianNumbers.format(amount) + " میلی‌لیتر ثبت شد",
                Toast.LENGTH_SHORT).show();
    }

    private void refreshAfterChange() {
        refresh();
        WaterWidgetProvider.updateAll(this);
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
                        addWater(amount);
                        dialog.dismiss();
                    } catch (NumberFormatException error) {
                        input.setError("مقدار معتبر وارد کنید");
                    }
                }));
        dialog.getWindow();
        dialog.show();
    }

    private void showWeightDialog(boolean firstRun) {
        EditText input = numberInput("وزن به کیلوگرم",
                firstRun ? "" : PersianNumbers.format(store.getWeightKg()));
        AlertDialog.Builder builder = new AlertDialog.Builder(this)
                .setTitle(firstRun ? "برای شروع، وزنت چقدر است؟" : "ویرایش وزن")
                .setMessage("آب‌یار هدف روزانه را با فرمول ۳۵ میلی‌لیتر به‌ازای هر کیلوگرم محاسبه می‌کند.")
                .setView(input)
                .setPositiveButton("محاسبه هدف", null);
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
                    } catch (NumberFormatException error) {
                        input.setError("وزن معتبر وارد کنید");
                    }
                }));
        dialog.show();
    }

    private void showReminderDialog() {
        LinearLayout content = vertical();
        content.setPadding(dp(22), 0, dp(22), 0);

        TextView intervalTitle = text("فاصله یادآوری", 13, MUTED, Typeface.BOLD);
        content.addView(intervalTitle);
        NumberPicker intervalPicker = new NumberPicker(this);
        String[] intervals = {"۳۰ دقیقه", "۱ ساعت", "۱ ساعت و ۳۰ دقیقه", "۲ ساعت", "۳ ساعت", "۴ ساعت"};
        int[] intervalValues = {30, 60, 90, 120, 180, 240};
        intervalPicker.setMinValue(0);
        intervalPicker.setMaxValue(intervals.length - 1);
        intervalPicker.setDisplayedValues(intervals);
        intervalPicker.setValue(indexOf(intervalValues, store.getReminderIntervalMinutes()));
        content.addView(intervalPicker, matchWidth(dp(92)));

        LinearLayout times = horizontal();
        Button startButton = actionButton("شروع: " + hourLabel(store.getStartHour()), true);
        Button endButton = actionButton("پایان: " + hourLabel(store.getEndHour()), true);
        final int[] selectedHours = {store.getStartHour(), store.getEndHour()};
        startButton.setOnClickListener(v -> showHourPicker("ساعت شروع", selectedHours[0], hour -> {
            selectedHours[0] = hour;
            startButton.setText("شروع: " + hourLabel(hour));
        }));
        endButton.setOnClickListener(v -> showHourPicker("ساعت پایان", selectedHours[1], hour -> {
            selectedHours[1] = hour;
            endButton.setText("پایان: " + hourLabel(hour));
        }));
        times.addView(startButton, weighted());
        times.addView(endButton, weighted());
        content.addView(times, topMargin(dp(8)));

        new AlertDialog.Builder(this)
                .setTitle("تنظیم یادآوری")
                .setMessage("اعلان‌ها فقط در بازه انتخاب‌شده نمایش داده می‌شوند و پس از رسیدن به هدف روزانه متوقف می‌شوند.")
                .setView(content)
                .setPositiveButton("ذخیره و فعال‌سازی", (dialog, which) -> {
                    store.setReminderIntervalMinutes(intervalValues[intervalPicker.getValue()]);
                    store.setStartHour(selectedHours[0]);
                    store.setEndHour(selectedHours[1]);
                    store.setRemindersEnabled(true);
                    requestNotificationPermission();
                    ReminderScheduler.sync(this);
                    refreshReminder();
                })
                .setNegativeButton("انصراف", null)
                .show();
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

    private EditText numberInput(String hint, String initial) {
        EditText input = new EditText(this);
        input.setHint(hint);
        input.setText(initial);
        input.setSelectAllOnFocus(true);
        input.setGravity(Gravity.CENTER);
        input.setTextDirection(View.TEXT_DIRECTION_LTR);
        input.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        input.setPadding(dp(12), dp(12), dp(12), dp(12));
        return input;
    }

    private Button actionButton(String label, boolean secondary) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextSize(12);
        button.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        button.setAllCaps(false);
        button.setMinHeight(0);
        button.setMinWidth(0);
        button.setPadding(dp(6), dp(11), dp(6), dp(11));
        button.setTextColor(secondary ? OCEAN : Color.WHITE);
        button.setBackground(roundRect(secondary ? ICE : OCEAN, dp(14)));
        return button;
    }

    private LinearLayout card() {
        LinearLayout card = vertical();
        card.setBackground(roundRect(Color.WHITE, dp(22)));
        card.setElevation(dp(3));
        return card;
    }

    private TextView sectionTitle(String value) {
        TextView title = text(value, 16, INK, Typeface.BOLD);
        title.setPadding(dp(3), 0, dp(3), dp(10));
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

    private interface HourConsumer {
        void accept(int hour);
    }

    private static final class HistoryView extends View {
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final String[] labels = {"۶ روز", "۵ روز", "۴ روز", "۳ روز", "پریروز", "دیروز", "امروز"};
        private int[] values = new int[7];
        private int goal = 1;

        HistoryView(Context context) {
            super(context);
            setLayerType(View.LAYER_TYPE_SOFTWARE, null);
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
            float chartTop = dp(12);
            float chartBottom = height - dp(36);
            float slot = width / 7f;
            float barWidth = Math.min(dp(22), slot * 0.55f);

            paint.setTextAlign(Paint.Align.CENTER);
            paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.NORMAL));
            for (int i = 0; i < values.length; i++) {
                float x = slot * i + slot / 2f;
                float ratio = Math.min(1f, values[i] / (float) goal);
                float barHeight = Math.max(dp(5), (chartBottom - chartTop) * ratio);
                paint.setColor(Color.rgb(226, 239, 241));
                canvas.drawRoundRect(x - barWidth / 2, chartTop, x + barWidth / 2,
                        chartBottom, barWidth / 2, barWidth / 2, paint);
                paint.setColor(i == 6 ? OCEAN : AQUA);
                canvas.drawRoundRect(x - barWidth / 2, chartBottom - barHeight,
                        x + barWidth / 2, chartBottom, barWidth / 2, barWidth / 2, paint);
                paint.setColor(MUTED);
                paint.setTextSize(dp(9));
                canvas.drawText(i == 6 ? labels[i] : PersianNumbers.format(i + 1),
                        x, height - dp(10), paint);
            }
        }

        private float dp(int value) {
            return value * getResources().getDisplayMetrics().density;
        }
    }
}
