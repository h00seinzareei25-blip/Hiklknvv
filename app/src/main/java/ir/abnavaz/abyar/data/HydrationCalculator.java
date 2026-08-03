package ir.abnavaz.abyar.data;

/**
 * Baseline intake estimate for healthy adults. Medical conditions can differ,
 * so the UI presents the result as an estimate rather than medical advice.
 */
public final class HydrationCalculator {
    public static final int MILLILITERS_PER_KILOGRAM = 35;
    public static final int MIN_WEIGHT_KG = 30;
    public static final int MAX_WEIGHT_KG = 250;

    public static final int ACTIVITY_SEDENTARY = 0;
    public static final int ACTIVITY_LIGHT = 1;
    public static final int ACTIVITY_MODERATE = 2;
    public static final int ACTIVITY_ACTIVE = 3;

    private HydrationCalculator() {
    }

    public static int dailyGoalMl(float weightKg) {
        return dailyGoalMl(weightKg, ACTIVITY_SEDENTARY, false);
    }

    public static int dailyGoalMl(float weightKg, int activityLevel, boolean hotWeather) {
        float safeWeight = Math.max(MIN_WEIGHT_KG, Math.min(MAX_WEIGHT_KG, weightKg));
        float factor = activityFactor(activityLevel) + (hotWeather ? 0.10f : 0f);
        return Math.round((safeWeight * MILLILITERS_PER_KILOGRAM * factor) / 50f) * 50;
    }

    public static float activityFactor(int activityLevel) {
        switch (activityLevel) {
            case ACTIVITY_LIGHT:
                return 1.10f;
            case ACTIVITY_MODERATE:
                return 1.20f;
            case ACTIVITY_ACTIVE:
                return 1.30f;
            default:
                return 1.00f;
        }
    }

    public static float drinkFactor(String type) {
        if (type == null) {
            return 1f;
        }
        switch (type) {
            case "tea":
                return 0.80f;
            case "coffee":
                return 0.75f;
            case "juice":
                return 0.90f;
            case "milk":
                return 0.90f;
            default:
                return 1f;
        }
    }

    public static int effectiveMl(int amountMl, String type) {
        return Math.max(0, Math.round(amountMl * drinkFactor(type)));
    }
}
