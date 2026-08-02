package ir.abnavaz.abyar.data;

import static org.junit.Assert.assertEquals;

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
}
