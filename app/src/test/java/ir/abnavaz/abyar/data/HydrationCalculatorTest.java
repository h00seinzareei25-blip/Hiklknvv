package ir.abnavaz.abyar.data;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class HydrationCalculatorTest {
    @Test
    public void calculatesThirtyFiveMillilitersPerKilogram() {
        assertEquals(2450, HydrationCalculator.dailyGoalMl(70));
        assertEquals(2800, HydrationCalculator.dailyGoalMl(80));
    }

    @Test
    public void roundsGoalToNearestFiftyMilliliters() {
        assertEquals(2250, HydrationCalculator.dailyGoalMl(64));
    }

    @Test
    public void clampsUnsafeWeightInput() {
        assertEquals(1050, HydrationCalculator.dailyGoalMl(5));
        assertEquals(8750, HydrationCalculator.dailyGoalMl(500));
    }

    @Test
    public void appliesActivityAndWeatherFactors() {
        int base = HydrationCalculator.dailyGoalMl(70, HydrationCalculator.ACTIVITY_SEDENTARY, false);
        int active = HydrationCalculator.dailyGoalMl(70, HydrationCalculator.ACTIVITY_ACTIVE, false);
        int hot = HydrationCalculator.dailyGoalMl(70, HydrationCalculator.ACTIVITY_SEDENTARY, true);
        assertTrue(active > base);
        assertTrue(hot > base);
        assertEquals(3200, active);
    }

    @Test
    public void appliesDrinkHydrationFactors() {
        assertEquals(250, HydrationCalculator.effectiveMl(250, "water"));
        assertEquals(200, HydrationCalculator.effectiveMl(250, "tea"));
        assertEquals(188, HydrationCalculator.effectiveMl(250, "coffee"));
    }
}
