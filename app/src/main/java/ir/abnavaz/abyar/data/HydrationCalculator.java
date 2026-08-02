package ir.abnavaz.abyar.data;

/**
 * A simple baseline for healthy adults. Individual medical needs can differ,
 * so the UI presents the result as an estimate rather than medical advice.
 */
public final class HydrationCalculator {
    public static final int MILLILITERS_PER_KILOGRAM = 35;
    public static final int MIN_WEIGHT_KG = 30;
    public static final int MAX_WEIGHT_KG = 250;

    private HydrationCalculator() {
    }

    public static int dailyGoalMl(float weightKg) {
        float safeWeight = Math.max(MIN_WEIGHT_KG, Math.min(MAX_WEIGHT_KG, weightKg));
        return Math.round((safeWeight * MILLILITERS_PER_KILOGRAM) / 50f) * 50;
    }
}
