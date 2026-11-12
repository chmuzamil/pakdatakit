using System.Text.RegularExpressions;
using PakDataKit.Internal;

namespace PakDataKit;

/// <summary>Parsed components of a Pakistani mailing address.</summary>
public sealed record ParsedAddress
{
    /// <summary>The address with whitespace normalized.</summary>
    public string? Raw { get; init; }

    /// <summary>First remaining segment, usually house and street.</summary>
    public string? Street { get; init; }

    /// <summary>Remaining segments, usually the area or sector.</summary>
    public string? Area { get; init; }

    /// <summary>City, when one was recognised.</summary>
    public string? City { get; init; }

    /// <summary>District, when one was recognised.</summary>
    public string? District { get; init; }

    /// <summary>Province, stated in the address or inferred from the city.</summary>
    public string? Province { get; init; }

    /// <summary>5-digit postal code, when present.</summary>
    public string? PostalCode { get; init; }

    /// <summary>Inconsistencies found while parsing, e.g. a city in a different province.</summary>
    public IReadOnlyList<string> Warnings { get; init; } = [];
}

/// <summary>Free-form Pakistani address parsing and formatting.</summary>
public static class Address
{
    private const string WordChar = "A-Za-z0-9_";

    private static readonly string[] Provinces =
    [
        "Islamabad Capital Territory", "Azad Jammu and Kashmir", "Gilgit-Baltistan", "Khyber Pakhtunkhwa",
        "Balochistan", "Punjab", "Sindh",
    ];

    // Words that mark a following 5-digit number as something other than a postal code.
    private static readonly Regex NonPostalPrefix = Js.Rx(
        ("(?:(?<![" + WordChar + "])(?:"
            + Js.Ci("p") + @"\.?WS*" + Js.Ci("o") + @"\.?WS*" + Js.Ci("box")
            + "|" + Js.Ci("box") + "|" + Js.Ci("house")
            + "|" + Js.Ci("h") + @"\.?WS*" + Js.Ci("no") + @"\.?"
            + "|" + Js.Ci("plot") + "|" + Js.Ci("street") + "|" + Js.Ci("st") + @"\.?"
            + "|" + Js.Ci("flat") + "|" + Js.Ci("shop") + "|" + Js.Ci("office") + "|" + Js.Ci("suite")
            + "|" + Js.Ci("no") + @"\.?)|#)WS*\z").Replace("WS", "[" + Js.Ws + "]"));

    private static readonly Regex PostalCandidate =
        Js.Rx("(?<![" + WordChar + "#/-])([1-9][0-9]{4})(?![" + WordChar + "/-])");

    // Longest names first so "Dera Ghazi Khan" wins over "Ghazi". OrderBy is stable.
    private static readonly Lazy<string[]> CitiesByLength = new(() =>
        Data.Cities.Select(e => e.City).OrderByDescending(n => n.Length).ToArray());

    private static readonly Lazy<string[]> DistrictsByLength = new(() =>
        Data.Districts.Select(e => e.District).OrderByDescending(n => n.Length).ToArray());

    /// <summary>
    /// Parses a free-form Pakistani address into structured components. It
    /// extracts the postal code, matches known cities, districts and
    /// provinces, and assigns the remaining segments to street and area.
    /// </summary>
    /// <param name="address">Address as written.</param>
    /// <returns>The parsed components; unknown parts are <c>null</c>.</returns>
    public static ParsedAddress Parse(string address)
    {
        ArgumentNullException.ThrowIfNull(address);
        var raw = Normalize.Whitespace(address);
        if (raw.Length == 0) return new ParsedAddress { Raw = raw };

        var warnings = new List<string>();
        var working = raw;
        string? postalCode = null;
        var postal = FindPostalCode(working);
        if (postal is var (code, index))
        {
            postalCode = code;
            working = working[..index] + " " + working[(index + code.Length)..];
        }

        var segments = working.Split(',').Select(Normalize.Whitespace).Where(p => p.Length > 0).ToArray();
        string? province = null, city = null, district = null;

        // Match whole segments first, from the end of the address.
        for (var i = segments.Length - 1; i >= 0; i--)
        {
            var segment = segments[i];
            var matchedProvince = province is null ? MatchExact(segment, Provinces) : null;
            if (matchedProvince is not null)
            {
                province = matchedProvince;
                segments[i] = "";
                continue;
            }
            var matchedCity = city is null ? MatchExact(segment, CitiesByLength.Value) : null;
            if (matchedCity is not null)
            {
                city = matchedCity;
                segments[i] = "";
                continue;
            }
            var matchedDistrict = district is null ? MatchExact(segment, DistrictsByLength.Value) : null;
            if (matchedDistrict is not null)
            {
                district = matchedDistrict;
                segments[i] = "";
            }
        }

        // Then look for names at the end of a segment ("12 Model Town Lahore").
        for (var i = segments.Length - 1; i >= 0; i--)
        {
            if (province is null && MatchTrailing(segments[i], Provinces) is var (p, restP))
            {
                province = p;
                segments[i] = restP;
            }
            if (city is null && MatchTrailing(segments[i], CitiesByLength.Value) is var (c, restC))
            {
                city = c;
                segments[i] = restC;
            }
        }

        if (city is null && district is not null) city = district;
        if (postalCode is not null && city is null) city = Postal.GetCity(postalCode);

        string? inferred;
        if (city is not null) inferred = Geo.GetProvince(city) ?? Geo.GetDistrictProvince(city);
        else if (district is not null) inferred = Geo.GetDistrictProvince(district);
        else inferred = null;

        if (province is null) province = inferred;
        else if (inferred is not null && inferred != province)
            warnings.Add($"{city ?? district} is in {inferred}, but the address says {province}");

        var remaining = segments.Where(p => p.Length > 0).ToArray();
        return new ParsedAddress
        {
            Raw = raw,
            Street = remaining.Length > 0 ? remaining[0] : null,
            Area = remaining.Length > 1 ? string.Join(", ", remaining.Skip(1)) : null,
            City = city,
            District = district,
            Province = province,
            PostalCode = postalCode,
            Warnings = warnings,
        };
    }

    /// <summary>
    /// Formats address components into a single mailing line. Only the
    /// components that are set are included; if none are,
    /// <see cref="ParsedAddress.Raw"/> is returned.
    /// </summary>
    /// <param name="parts">Address components.</param>
    /// <returns>The formatted address.</returns>
    public static string Format(ParsedAddress parts)
    {
        ArgumentNullException.ThrowIfNull(parts);
        var segments = new[] { parts.Street, parts.Area, parts.City ?? parts.District, parts.Province }
            .Where(p => !string.IsNullOrEmpty(p));
        var formatted = string.Join(", ", segments);
        if (!string.IsNullOrEmpty(parts.PostalCode))
            formatted = formatted.Length > 0 ? $"{formatted} {parts.PostalCode}" : parts.PostalCode;
        return formatted.Length > 0 ? formatted : parts.Raw ?? "";
    }

    private static (string Code, int Index)? FindPostalCode(string text)
    {
        (string, int)? result = null;
        foreach (Match match in PostalCandidate.Matches(text))
        {
            if (!NonPostalPrefix.IsMatch(text[..match.Index])) result = (match.Groups[1].Value, match.Index);
        }
        return result;
    }

    private static string? MatchExact(string segment, string[] options)
    {
        var key = Normalize.Key(segment);
        if (key.Length == 0) return null;
        return options.FirstOrDefault(option => Normalize.Key(option) == key);
    }

    private static (string Option, string Remainder)? MatchTrailing(string segment, string[] options)
    {
        var key = Normalize.Key(segment);
        foreach (var option in options)
        {
            if (key.EndsWith(" " + Normalize.Key(option), StringComparison.Ordinal))
                return (option, Normalize.Whitespace(segment[..Math.Max(0, segment.Length - option.Length)]));
        }
        return null;
    }
}
