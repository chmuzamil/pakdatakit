using System.Text.RegularExpressions;
using PakDataKit.Internal;

namespace PakDataKit;

/// <summary>State of a form field while the user is typing.</summary>
public enum InputState
{
    /// <summary>Nothing entered yet.</summary>
    Empty,

    /// <summary>What has been typed so far can still become valid.</summary>
    Incomplete,

    /// <summary>Complete and valid.</summary>
    Valid,

    /// <summary>Cannot become valid by typing more (wrong character, prefix or length).</summary>
    Invalid,
}

/// <summary>As-you-type formatters and checkers for form fields.</summary>
public static class Input
{
    // Characters people use between groups of digits.
    private static readonly Regex Separators = Js.Rx("[" + Js.Ws + @"\-‐‑‒–—./()]");
    private static readonly Regex NonDigit = Js.Rx("[^0-9]");
    private static readonly Regex AllDigits = Js.Rx("^[0-9]+\\z");
    private static readonly Regex PhoneShape = Js.Rx("^\\+?[0-9]*\\z");
    private static readonly Regex NonIbanChar = Js.Rx("[^A-Z0-9]");
    private static readonly Regex IbanSeparators = Js.Rx("[" + Js.Ws + "-]");
    private static readonly Regex FourGroups = Js.Rx("(.{4})(?=.)");

    private static readonly Regex IbanShape = Js.Rx(
        "^(P(K([0-9]([0-9]([A-Z]([A-Z]([A-Z]([A-Z]([A-Z0-9]{0,16})?)?)?)?)?)?)?)?)?\\z");

    private static readonly string[] CountryCodes = ["+92", "0092", "92"];

    /// <summary>
    /// Formats a CNIC as the user types: <c>35202-1234567-1</c>. Keeps up to
    /// 13 digits (Urdu digits are converted) and inserts the dashes as the
    /// groups fill.
    /// </summary>
    /// <param name="value">Current input value.</param>
    /// <returns>Value to show in the input.</returns>
    public static string FormatCnic(string value)
    {
        ArgumentNullException.ThrowIfNull(value);
        var digits = NonDigit.Replace(Normalize.ToAsciiDigits(value), "");
        if (digits.Length > 13) digits = digits[..13];
        if (digits.Length <= 5) return digits;
        return digits.Length <= 12
            ? $"{digits[..5]}-{digits[5..]}"
            : $"{digits[..5]}-{digits[5..12]}-{digits[12..]}";
    }

    /// <summary>Checks a CNIC while the user is typing.</summary>
    /// <param name="value">Current input value.</param>
    /// <returns>The field state, e.g. <see cref="InputState.Incomplete"/> for <c>35202-12</c>.</returns>
    public static InputState CheckCnic(string value)
    {
        var text = Clean(value);
        if (text.Length == 0) return InputState.Empty;
        if (!AllDigits.IsMatch(text) || text.Length > 13) return InputState.Invalid;
        if (text[0] is < '1' or > '8') return InputState.Invalid;
        if (text.Length < 13) return InputState.Incomplete;
        return Cnic.Validate(text) ? InputState.Valid : InputState.Invalid;
    }

    /// <summary>
    /// Formats a mobile number as the user types: <c>0300-1234567</c>, or
    /// <c>+92 300 1234567</c> when the user starts with the country code.
    /// </summary>
    /// <param name="value">Current input value.</param>
    /// <returns>Value to show in the input.</returns>
    public static string FormatPhone(string value)
    {
        var split = SplitPhone(value, out var incomplete);
        if (incomplete) return Clean(value);
        if (split is not var (national, international)) return value;
        var digits = NonDigit.Replace(national, "");
        if (digits.Length > 10) digits = digits[..10];
        if (international)
            return digits.Length <= 3 ? Js.TrimEnd("+92 " + digits) : $"+92 {digits[..3]} {digits[3..]}";
        var local = "0" + digits;
        return local.Length <= 4 ? local : $"{local[..4]}-{local[4..]}";
    }

    /// <summary>
    /// Checks a mobile number while the user is typing. The <c>03XX</c> prefix
    /// is checked as soon as it is complete.
    /// </summary>
    /// <param name="value">Current input value.</param>
    /// <returns>The field state.</returns>
    public static InputState CheckPhone(string value)
    {
        if (Clean(value).Length == 0) return InputState.Empty;
        var split = SplitPhone(value, out var incomplete);
        if (incomplete) return InputState.Incomplete;
        if (split is not var (national, _)) return InputState.Invalid;
        if (national.Length == 0) return InputState.Incomplete;
        if (national[0] != '3') return InputState.Invalid;
        if (national.Length >= 3 && !Phone.IsAllocatedPrefix("0" + national[..3])) return InputState.Invalid;
        if (national.Length < 10) return InputState.Incomplete;
        return national.Length == 10 ? InputState.Valid : InputState.Invalid;
    }

    /// <summary>
    /// Formats an IBAN as the user types: uppercase, in groups of four, up to
    /// 24 characters.
    /// </summary>
    /// <param name="value">Current input value.</param>
    /// <returns>Value to show in the input.</returns>
    public static string FormatIban(string value)
    {
        ArgumentNullException.ThrowIfNull(value);
        var clean = NonIbanChar.Replace(Js.ToUpper(value), "");
        if (clean.Length > 24) clean = clean[..24];
        return FourGroups.Replace(clean, "$1 ");
    }

    /// <summary>Checks a Pakistani IBAN while the user is typing.</summary>
    /// <param name="value">Current input value.</param>
    /// <returns>The field state.</returns>
    public static InputState CheckIban(string value)
    {
        ArgumentNullException.ThrowIfNull(value);
        var clean = IbanSeparators.Replace(Js.ToUpper(value), "");
        if (clean.Length == 0) return InputState.Empty;
        if (clean.Length > 24 || !IbanShape.IsMatch(clean)) return InputState.Invalid;
        if (clean.Length < 24) return InputState.Incomplete;
        return Iban.Validate(clean) ? InputState.Valid : InputState.Invalid;
    }

    private static string Clean(string value)
    {
        ArgumentNullException.ThrowIfNull(value);
        return Separators.Replace(Normalize.ToAsciiDigits(value), "");
    }

    /// <summary>
    /// Splits phone input into the national number (without its leading 0)
    /// and whether a country code was typed. Returns <c>null</c> when the
    /// start cannot be a Pakistani number; sets <paramref name="incomplete"/>
    /// while the country code is still being typed.
    /// </summary>
    private static (string National, bool International)? SplitPhone(string value, out bool incomplete)
    {
        incomplete = false;
        var text = Clean(value);
        if (!PhoneShape.IsMatch(text)) return null;
        foreach (var code in CountryCodes)
        {
            if (code.StartsWith(text, StringComparison.Ordinal) && text.Length < code.Length)
            {
                // "0" and "9" could also be the start of a local or short number.
                if (text == "0") return ("", false);
                incomplete = true;
                return null;
            }
            // Mobile numbers start with 3, so a leading 92 is always the country code.
            if (text.StartsWith(code, StringComparison.Ordinal))
            {
                var rest = text[code.Length..];
                return (rest.StartsWith('0') ? rest[1..] : rest, true);
            }
        }
        if (text.StartsWith('+')) return null;
        return (text.StartsWith('0') ? text[1..] : text, false);
    }
}
