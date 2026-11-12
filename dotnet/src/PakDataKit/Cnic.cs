using System.Text.RegularExpressions;
using PakDataKit.Internal;

namespace PakDataKit;

/// <summary>Gender encoded in the last digit of a CNIC.</summary>
public enum CnicGender
{
    /// <summary>Odd last digit.</summary>
    Male,

    /// <summary>Even last digit.</summary>
    Female,
}

/// <summary>Information encoded in a CNIC number.</summary>
/// <param name="Digits">The CNIC as 13 digits without separators.</param>
/// <param name="Formatted">The CNIC in <c>#####-#######-#</c> form.</param>
/// <param name="Province">Province where the CNIC was first registered (from the first digit).</param>
/// <param name="Gender">Gender from the last digit: odd is male, even is female.</param>
public sealed record CnicInfo(string Digits, string Formatted, string Province, CnicGender Gender);

/// <summary>CNIC (Computerized National Identity Card) validation and decoding.</summary>
public static class Cnic
{
    // 13 digits, optionally grouped as #####-#######-# with a consistent separator.
    private static readonly Regex Pattern = Js.Rx(@"^[1-8][0-9]{4}([-‐‑‒–—. ]?)[0-9]{7}\1[0-9]\z");
    private static readonly Regex NonDigit = Js.Rx("[^0-9]");

    private static readonly Dictionary<char, string> Provinces = new()
    {
        ['1'] = "Khyber Pakhtunkhwa",
        ['2'] = "Khyber Pakhtunkhwa",
        ['3'] = "Punjab",
        ['4'] = "Sindh",
        ['5'] = "Balochistan",
        ['6'] = "Islamabad Capital Territory",
        ['7'] = "Gilgit-Baltistan",
        ['8'] = "Azad Jammu and Kashmir",
    };

    /// <summary>
    /// Validates a Pakistani CNIC number (structure only; NADRA publishes no
    /// check-digit algorithm). Accepts <c>3520212345671</c>,
    /// <c>35202-1234567-1</c>, <c>35202 1234567 1</c> and Urdu digits.
    /// </summary>
    /// <param name="cnic">CNIC to validate.</param>
    /// <returns><c>true</c> if the structure is valid.</returns>
    public static bool Validate(string cnic)
    {
        ArgumentNullException.ThrowIfNull(cnic);
        return Pattern.IsMatch(Normalize.ToAsciiDigits(Js.Trim(cnic)));
    }

    /// <summary>
    /// Reads the province of first registration and the gender encoded in a CNIC.
    /// </summary>
    /// <param name="cnic">CNIC in any accepted format.</param>
    /// <returns>The details, or <c>null</c> if the CNIC is invalid.</returns>
    public static CnicInfo? GetInfo(string cnic)
    {
        if (!Validate(cnic)) return null;
        var digits = NonDigit.Replace(Normalize.ToAsciiDigits(cnic), "");
        return new CnicInfo(
            digits,
            $"{digits[..5]}-{digits[5..12]}-{digits[12]}",
            Provinces[digits[0]],
            (digits[12] - '0') % 2 == 1 ? CnicGender.Male : CnicGender.Female);
    }
}
