using System.Text.RegularExpressions;
using PakDataKit.Internal;

namespace PakDataKit;

/// <summary>Kind of Pakistani telephone number.</summary>
public enum NumberType
{
    /// <summary>Mobile number (<c>03XX</c>).</summary>
    Mobile,

    /// <summary>Fixed-line number with an area code.</summary>
    Landline,

    /// <summary>Universal Access Number (<c>111</c>).</summary>
    Uan,

    /// <summary>Toll-free number (<c>0800</c>).</summary>
    TollFree,

    /// <summary>Premium-rate number (<c>0900</c>).</summary>
    Premium,

    /// <summary>Personal number (<c>0122</c>).</summary>
    Personal,
}

/// <summary>Result of <see cref="Numbers.Analyze"/>.</summary>
/// <param name="Type">Kind of number.</param>
/// <param name="Formatted">National format with trunk prefix and separators, e.g. <c>021-111-825-888</c>.</param>
/// <param name="E164">E.164 format; <c>null</c> for a UAN dialled without an area code.</param>
/// <param name="AreaCode">Area code with trunk prefix (e.g. <c>021</c>) for landlines and UANs.</param>
/// <param name="Cities">Cities served by the area code, when known.</param>
public sealed record NumberInfo(
    NumberType Type, string Formatted, string? E164, string? AreaCode, IReadOnlyList<string> Cities);

/// <summary>Landline, UAN, toll-free, premium and personal numbers.</summary>
public static class Numbers
{
    // Number patterns from Google libphonenumber's PK metadata (v9.0.41). They
    // apply to the national significant number, without the trunk prefix 0.
    private static readonly Regex FixedLine = Js.Rx(
        "^(?:(?:(?:21|42)[2-9]|58[126])[0-9]{7}|(?:2[25]|4[0146-9]|5[1-35-7]|6[1-8]|7[14]|8[16]|91)[2-9][0-9]{6,7}|(?:2(?:3[2358]|4[2-4]|9[2-8])|45[3479]|54[2-467]|60[468]|72[236]|8(?:2[2-689]|3[23578]|4[3478]|5[2356])|9(?:2[2-8]|3[27-9]|4[2-6]|6[3569]|9[25-8]))[2-9][0-9]{5,6})\\z");

    private static readonly Regex Uan = Js.Rx(
        "^((?:2(?:[125]|3[2358]|4[2-4]|9[2-8])|4(?:[0-246-9]|5[3479])|5(?:[1-35-7]|4[2-467])|6(?:0[468]|[1-8])|7(?:[14]|2[236])|8(?:[16]|2[2-689]|3[23578]|4[3478]|5[2356])|9(?:1|22|3[27-9]|4[2-6]|6[3569]|9[2-7])))111([0-9]{6})\\z");

    private static readonly Regex UanWithoutAreaCode = Js.Rx("^111([0-9]{6})\\z");
    private static readonly Regex TollFree = Js.Rx("^800([0-9]{5}(?:[0-9]{3})?)\\z");
    private static readonly Regex Premium = Js.Rx("^900([0-9]{5})\\z");
    private static readonly Regex Personal = Js.Rx("^122([0-9]{6})\\z");
    private static readonly Regex National = Js.Rx("^[0-9]{8,12}\\z");
    private static readonly Regex Groups = Js.Rx("[0-9]{1,3}");

    private static readonly Lazy<Dictionary<string, IReadOnlyList<string>>> AreaMap = new(() =>
    {
        var map = new Dictionary<string, IReadOnlyList<string>>(StringComparer.Ordinal);
        foreach (var entry in Data.AreaCodes) map[entry.Code] = entry.Cities;
        return map;
    });

    /// <summary>
    /// Identifies and formats any Pakistani telephone number: mobile, landline,
    /// UAN (<c>111</c>), toll-free (<c>0800</c>), premium-rate (<c>0900</c>) and
    /// personal (<c>0122</c>) numbers.
    /// </summary>
    /// <param name="phone">Number in any common format.</param>
    /// <returns>The details, or <c>null</c> if the number is invalid.</returns>
    public static NumberInfo? Analyze(string phone)
    {
        var mobile = Phone.NormalizeDigits(phone);
        if (mobile is not null)
        {
            var mobileNational = mobile[2..];
            return new NumberInfo(
                NumberType.Mobile, $"0{mobileNational[..3]}-{mobileNational[3..]}", "+" + mobile, null, []);
        }

        var bareUan = UanWithoutAreaCode.Match(Normalize.StripSeparators(Normalize.ToAsciiDigits(phone)));
        if (bareUan.Success)
            return new NumberInfo(NumberType.Uan, "111-" + GroupDigits(bareUan.Groups[1].Value), null, null, []);

        var national = ToNationalNumber(phone);
        if (national is null) return null;

        NumberInfo Service(NumberType type, string prefix, string rest) =>
            new(type, $"0{prefix}-{rest}", "+92" + national, null, []);

        var match = TollFree.Match(national);
        if (match.Success) return Service(NumberType.TollFree, "800", match.Groups[1].Value);
        match = Premium.Match(national);
        if (match.Success) return Service(NumberType.Premium, "900", match.Groups[1].Value);
        match = Personal.Match(national);
        if (match.Success) return Service(NumberType.Personal, "122", match.Groups[1].Value);

        match = Uan.Match(national);
        if (match.Success)
        {
            var code = match.Groups[1].Value;
            return new NumberInfo(
                NumberType.Uan,
                $"0{code}-111-{GroupDigits(match.Groups[2].Value)}",
                "+92" + national,
                "0" + code,
                AreaMap.Value.TryGetValue(code, out var cities) ? cities : []);
        }

        if (FixedLine.IsMatch(national))
        {
            var code = FindAreaCode(national);
            return new NumberInfo(
                NumberType.Landline,
                code is null ? "0" + national : $"0{code}-{national[code.Length..]}",
                "+92" + national,
                code is null ? null : "0" + code,
                code is not null && AreaMap.Value.TryGetValue(code, out var cities) ? cities : []);
        }

        return null;
    }

    /// <summary>Returns the kind of a Pakistani telephone number.</summary>
    /// <param name="phone">Number in any common format.</param>
    /// <returns>The kind, or <c>null</c> if the number is invalid.</returns>
    public static NumberType? GetNumberType(string phone) => Analyze(phone)?.Type;

    /// <summary>Validates a landline (fixed-line) number such as <c>042-35761234</c>.</summary>
    /// <param name="phone">Number to validate.</param>
    /// <returns><c>true</c> if it is a valid landline number.</returns>
    public static bool ValidateLandline(string phone) => GetNumberType(phone) == NumberType.Landline;

    /// <summary>Returns the landline area code for a city, with trunk prefix (e.g. <c>042</c>).</summary>
    /// <param name="city">City name; case and spacing are ignored.</param>
    /// <returns>The area code, or <c>null</c> if the city is not known.</returns>
    public static string? GetAreaCode(string city)
    {
        ArgumentNullException.ThrowIfNull(city);
        var key = Normalize.Key(city);
        foreach (var entry in Data.AreaCodes)
        {
            if (entry.Cities.Any(name => Normalize.Key(name) == key)) return "0" + entry.Code;
        }
        return null;
    }

    private static string? ToNationalNumber(string value)
    {
        var digits = Normalize.StripSeparators(Normalize.ToAsciiDigits(value));
        if (digits.StartsWith('+'))
        {
            digits = digits[1..];
            if (!digits.StartsWith("92", StringComparison.Ordinal)) return null;
            digits = digits[2..];
        }
        else if (digits.StartsWith("0092", StringComparison.Ordinal)) digits = digits[4..];
        else if (digits.StartsWith("92", StringComparison.Ordinal) && digits.Length >= 11) digits = digits[2..];
        if (digits.StartsWith('0')) digits = digits[1..];
        return National.IsMatch(digits) ? digits : null;
    }

    private static string? FindAreaCode(string national)
    {
        for (var length = 4; length >= 2; length--)
        {
            if (national.Length < length) continue;
            var prefix = national[..length];
            if (AreaMap.Value.ContainsKey(prefix)) return prefix;
        }
        return null;
    }

    private static string GroupDigits(string digits)
    {
        var groups = Groups.Matches(digits).Select(m => m.Value).ToArray();
        return groups.Length > 0 ? string.Join("-", groups) : digits;
    }
}
