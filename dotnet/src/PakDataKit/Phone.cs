using System.Text.RegularExpressions;
using PakDataKit.Internal;

namespace PakDataKit;

/// <summary>Combined phone validation, formatting and network result.</summary>
/// <param name="Valid">Whether the number is a valid Pakistani mobile number.</param>
/// <param name="Formatted">E.164 form such as <c>+923001234567</c>, or <c>null</c> if invalid.</param>
/// <param name="Network">Network the prefix was originally allocated to, or <c>Unknown</c>.</param>
public sealed record PhoneAnalysis(bool Valid, string? Formatted, string Network);

/// <summary>Pakistani mobile number validation, formatting and analysis.</summary>
public static class Phone
{
    private static readonly SafeRegex Mobile = Js.Rx("^3[0-9]{9}\\z");

    private static readonly Lazy<HashSet<string>> Allocated = new(() =>
        new HashSet<string>(Data.Networks.Select(e => e.Prefix), StringComparer.Ordinal));

    /// <summary>
    /// Validates a Pakistani mobile number on an allocated <c>03XX</c> prefix.
    /// Accepts local (<c>0300 1234567</c>), international (<c>+92</c>,
    /// <c>0092</c>, <c>92</c>) and short (<c>3001234567</c>) forms.
    /// </summary>
    /// <param name="phone">Number to validate.</param>
    /// <returns><c>true</c> if valid.</returns>
    public static bool Validate(string phone) => NormalizeDigits(phone) is not null;

    /// <summary>Formats a mobile number as E.164, e.g. <c>+923001234567</c>.</summary>
    /// <param name="phone">Number in any accepted format.</param>
    /// <returns>The E.164 number, or <c>null</c> if invalid.</returns>
    public static string? Format(string phone)
    {
        var digits = NormalizeDigits(phone);
        return digits is null ? null : "+" + digits;
    }

    /// <summary>Validates, formats and detects the network of a mobile number in one call.</summary>
    /// <param name="phone">Number in any accepted format.</param>
    /// <returns>The analysis; <see cref="PhoneAnalysis.Valid"/> is <c>false</c> for invalid numbers.</returns>
    public static PhoneAnalysis Analyze(string phone)
    {
        var formatted = Format(phone);
        return formatted is null
            ? new PhoneAnalysis(false, null, Networks.Unknown)
            : new PhoneAnalysis(true, formatted, Networks.GetNetwork(phone));
    }

    /// <summary>Whether a <c>03XX</c> mobile prefix is allocated to an operator.</summary>
    internal static bool IsAllocatedPrefix(string prefix) => Allocated.Value.Contains(prefix);

    /// <summary>
    /// Normalizes a phone string to digits with country code (no plus), or
    /// <c>null</c> when it is not a mobile number on an allocated prefix.
    /// </summary>
    internal static string? NormalizeDigits(string? phone)
    {
        phone ??= "";
        var digits = Normalize.StripSeparators(Normalize.ToAsciiDigits(phone));
        if (digits.StartsWith('+')) digits = digits[1..];
        else if (digits.StartsWith("00", StringComparison.Ordinal)) digits = digits[2..];
        if (digits.StartsWith("92", StringComparison.Ordinal) && digits.Length > 10) digits = digits[2..];
        if (digits.StartsWith('0')) digits = digits[1..];
        if (!Mobile.IsMatch(digits)) return null;
        return Allocated.Value.Contains("0" + digits[..3]) ? "92" + digits : null;
    }

    /// <summary>The local mobile prefix (<c>0XXX</c>), or <c>null</c> if invalid.</summary>
    internal static string? GetPrefix(string phone)
    {
        var digits = NormalizeDigits(phone);
        return digits is null ? null : "0" + digits[2..5];
    }
}

/// <summary>Mobile network detection from the <c>03XX</c> prefix.</summary>
public static class Networks
{
    /// <summary>Value returned when the network cannot be determined.</summary>
    public const string Unknown = "Unknown";

    private static readonly Lazy<Dictionary<string, string>> Prefixes = new(() =>
    {
        var map = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var entry in Data.Networks) map[entry.Prefix] = entry.Network;
        return map;
    });

    /// <summary>
    /// Returns the network a number's prefix was originally allocated to:
    /// <c>Jazz</c>, <c>Zong</c>, <c>Telenor</c>, <c>Ufone</c>, <c>SCO</c> or
    /// <see cref="Unknown"/>. With number portability the current carrier can differ.
    /// </summary>
    /// <param name="phone">Mobile number in any accepted format.</param>
    /// <returns>The network name.</returns>
    public static string GetNetwork(string phone)
    {
        var prefix = Phone.GetPrefix(phone);
        return prefix is not null && Prefixes.Value.TryGetValue(prefix, out var network) ? network : Unknown;
    }
}
