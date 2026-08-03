package ir.abnavaz.abyar.util;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class JalaliCalendarTest {
    @Test
    public void convertsKnownGregorianDate() {
        // 2024-03-20 = 1403-01-01
        assertArrayEquals(new int[]{1403, 1, 1}, JalaliCalendar.toJalali(2024, 3, 20));
        assertArrayEquals(new int[]{2024, 3, 20}, JalaliCalendar.fromJalali(1403, 1, 1));
    }

    @Test
    public void reportsFarvardinLength() {
        assertEquals(31, JalaliCalendar.daysInMonth(1403, 1));
        assertEquals(29, JalaliCalendar.daysInMonth(1403, 12));
    }
}
