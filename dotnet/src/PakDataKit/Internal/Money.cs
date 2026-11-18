namespace PakDataKit.Internal;

/// <summary>
/// Exact money arithmetic in whole paisa (mirrors src/internal/money.ts).
/// Every port does the same steps so results match to the paisa.
/// </summary>
internal static class Money
{
    /// <summary>Largest amount accepted, in rupees (one trillion).</summary>
    internal const double MaxAmount = 1_000_000_000_000;

    /// <summary>
    /// Converts a number to an integer count of <c>10^-scale</c> units,
    /// rounding half up from the decimal digits as written (<c>1.005</c> with
    /// scale 2 is 101, not the 100 that floating-point <c>1.005 * 100</c>
    /// gives). Returns <c>null</c> for anything that is not a finite number
    /// from 0 to <see cref="MaxAmount"/>.
    /// </summary>
    internal static long? ToUnits(double value, int scale)
    {
        if (!double.IsFinite(value) || value < 0 || value > MaxAmount) return null;
        if (value == 0) return 0;
        // The shortest round-trip digits, as JavaScript's String(value) writes
        // them; value = 0.digits × 10^point.
        var (digits, point) = Js.ShortestDigits(value);
        // Units = digits shifted so that `scale` digits follow the point.
        var keep = point + scale;
        if (keep <= 0)
        {
            // Everything is below half a unit unless the first dropped digit is
            // >= 5 and sits exactly at the rounding position.
            return keep == 0 && digits[0] >= '5' ? 1 : 0;
        }
        if (keep >= digits.Length) return long.Parse(digits + new string('0', keep - digits.Length));
        var whole = long.Parse(digits[..keep]);
        return digits[keep] >= '5' ? whole + 1 : whole;
    }

    /// <summary>Rupees from paisa, as a double with at most 2 decimals (JavaScript's <c>paisa / 100</c>).</summary>
    internal static double FromPaisa(long paisa) => (double)paisa / 100;

    /// <summary>
    /// <c>numerator / denominator</c>, both non-negative, rounded half up.
    /// Amounts are capped at 1e14 paisa and multipliers at 1e4, so the
    /// numerator fits in a <c>long</c>.
    /// </summary>
    internal static long DivideHalfUp(long numerator, long denominator)
    {
        var quotient = Math.DivRem(numerator, denominator, out var remainder);
        return remainder * 2 >= denominator ? quotient + 1 : quotient;
    }
}
