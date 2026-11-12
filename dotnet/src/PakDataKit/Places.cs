using System.Text;
using System.Text.RegularExpressions;
using PakDataKit.Internal;

namespace PakDataKit;

/// <summary>Pakistani postal code lookups.</summary>
public static class Postal
{
    private static readonly Regex WsRun = Js.Rx("[" + Js.Ws + "]+");

    private static readonly Lazy<Dictionary<string, string>> ByCode = new(() =>
    {
        var map = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var e in Data.Postal) map[e.PostalCode] = e.City;
        return map;
    });

    private static readonly Lazy<Dictionary<string, string>> ByCity = new(() =>
    {
        var map = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var e in Data.Postal)
        {
            var key = Normalize.Key(e.City);
            if (!map.ContainsKey(key) || e.Primary) map[key] = e.PostalCode;
        }
        return map;
    });

    /// <summary>Returns the city for a postal code; whitespace is ignored.</summary>
    /// <param name="postalCode">5-digit postal code.</param>
    /// <returns>The city, or <c>null</c> if the code is not in the dataset.</returns>
    public static string? GetCity(string postalCode)
    {
        ArgumentNullException.ThrowIfNull(postalCode);
        var code = WsRun.Replace(Js.Trim(postalCode), "");
        return code.Length == 0 ? null : ByCode.Value.GetValueOrDefault(code);
    }

    /// <summary>Returns the primary (GPO) postal code for a city.</summary>
    /// <param name="city">City name; case and spacing are ignored.</param>
    /// <returns>The postal code, or <c>null</c> if the city is not in the dataset.</returns>
    public static string? GetCode(string city)
    {
        ArgumentNullException.ThrowIfNull(city);
        var key = Normalize.Key(city);
        return key.Length == 0 ? null : ByCity.Value.GetValueOrDefault(key);
    }

    /// <summary>Returns all known postal codes for a city, sorted.</summary>
    /// <param name="city">City name; case and spacing are ignored.</param>
    /// <returns>The codes; empty if the city is not in the dataset.</returns>
    public static IReadOnlyList<string> GetCodes(string city)
    {
        ArgumentNullException.ThrowIfNull(city);
        var key = Normalize.Key(city);
        if (key.Length == 0) return [];
        return Js.LocaleSorted(Data.Postal.Where(e => Normalize.Key(e.City) == key).Select(e => e.PostalCode));
    }

    /// <summary>Returns known area names for a city's postal entries, sorted.</summary>
    /// <param name="city">City name; case and spacing are ignored.</param>
    /// <returns>The areas; empty if none are known.</returns>
    public static IReadOnlyList<string> GetAreas(string city)
    {
        ArgumentNullException.ThrowIfNull(city);
        var key = Normalize.Key(city);
        if (key.Length == 0) return [];
        return Js.LocaleSorted(Data.Postal
            .Where(e => Normalize.Key(e.City) == key && !string.IsNullOrEmpty(e.Area))
            .Select(e => e.Area!));
    }

    /// <summary>Searches postal entries by city name, area, or postal code prefix.</summary>
    /// <param name="query">Text to search for.</param>
    /// <returns>Matching postal codes, sorted and without duplicates.</returns>
    public static IReadOnlyList<string> Search(string query)
    {
        ArgumentNullException.ThrowIfNull(query);
        var normalized = Normalize.Key(query);
        if (normalized.Length == 0) return [];
        var prefix = Js.Trim(query);
        var matches = Data.Postal
            .Where(e => Normalize.Key(e.City).Contains(normalized, StringComparison.Ordinal)
                || (string.IsNullOrEmpty(e.Area) ? "" : Normalize.Key(e.Area))
                    .Contains(normalized, StringComparison.Ordinal)
                || e.PostalCode.StartsWith(prefix, StringComparison.Ordinal))
            .Select(e => e.PostalCode)
            .Distinct(StringComparer.Ordinal);
        return Js.LocaleSorted(matches);
    }
}

/// <summary>Cities, districts and provinces.</summary>
public static class Geo
{
    private static readonly Lazy<Dictionary<string, string>> CityMap = new(() =>
    {
        var map = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var e in Data.Cities) map[Normalize.Key(e.City)] = e.Province;
        return map;
    });

    private static readonly Lazy<Dictionary<string, string>> DistrictMap = new(() =>
    {
        var map = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var e in Data.Districts) map[Normalize.Key(e.District)] = e.Province;
        return map;
    });

    // Districts that were split or renamed, so names stored before the change
    // still resolve. They are not listed by SearchDistricts or GetDistrictsByProvince.
    private static readonly Dictionary<string, string> FormerDistricts = new(StringComparer.Ordinal)
    {
        ["south waziristan"] = "Khyber Pakhtunkhwa",
        ["quetta"] = "Balochistan",
        ["dera bugti"] = "Balochistan",
        ["upper dera bugti"] = "Balochistan",
        ["upper swat"] = "Khyber Pakhtunkhwa",
    };

    /// <summary>Returns the province for a city name.</summary>
    /// <param name="city">City name; case and spacing are ignored.</param>
    /// <returns>The province, or <c>null</c> if the city is not in the dataset.</returns>
    public static string? GetProvince(string city)
    {
        ArgumentNullException.ThrowIfNull(city);
        var key = Normalize.Key(city);
        return key.Length == 0 ? null : CityMap.Value.GetValueOrDefault(key);
    }

    /// <summary>Searches cities by partial, case-insensitive name.</summary>
    /// <param name="query">Text to search for.</param>
    /// <returns>Matching city names, sorted.</returns>
    public static IReadOnlyList<string> SearchCities(string query)
    {
        ArgumentNullException.ThrowIfNull(query);
        var q = Normalize.Key(query);
        if (q.Length == 0) return [];
        return Js.LocaleSorted(Data.Cities
            .Where(e => Normalize.Key(e.City).Contains(q, StringComparison.Ordinal))
            .Select(e => e.City)
            .Distinct(StringComparer.Ordinal));
    }

    /// <summary>
    /// Returns the province for a district name. Former names of districts
    /// that were split or renamed still resolve.
    /// </summary>
    /// <param name="district">District name; case and spacing are ignored.</param>
    /// <returns>The province, or <c>null</c> if the district is not known.</returns>
    public static string? GetDistrictProvince(string district)
    {
        ArgumentNullException.ThrowIfNull(district);
        var key = Normalize.Key(district);
        if (key.Length == 0) return null;
        return DistrictMap.Value.GetValueOrDefault(key) ?? FormerDistricts.GetValueOrDefault(key);
    }

    /// <summary>Searches districts by partial, case-insensitive name.</summary>
    /// <param name="query">Text to search for.</param>
    /// <returns>Matching district names, sorted.</returns>
    public static IReadOnlyList<string> SearchDistricts(string query)
    {
        ArgumentNullException.ThrowIfNull(query);
        var q = Normalize.Key(query);
        if (q.Length == 0) return [];
        return Js.LocaleSorted(Data.Districts
            .Where(e => Normalize.Key(e.District).Contains(q, StringComparison.Ordinal))
            .Select(e => e.District)
            .Distinct(StringComparer.Ordinal));
    }

    /// <summary>Returns all districts in a province, sorted.</summary>
    /// <param name="province">Province name; case and spacing are ignored.</param>
    /// <returns>The district names; empty if the province is not known.</returns>
    public static IReadOnlyList<string> GetDistrictsByProvince(string province)
    {
        ArgumentNullException.ThrowIfNull(province);
        var key = Normalize.Key(province);
        if (key.Length == 0) return [];
        return Js.LocaleSorted(Data.Districts
            .Where(e => Normalize.Key(e.Province) == key)
            .Select(e => e.District));
    }
}

/// <summary>WhatsApp click-to-chat links.</summary>
public static class WhatsApp
{
    // Characters JavaScript's encodeURIComponent leaves unescaped.
    private const string Unescaped = "-_.!~*'()";

    /// <summary>Creates a <c>wa.me</c> link for a Pakistani mobile number.</summary>
    /// <param name="phone">Mobile number in any accepted format.</param>
    /// <param name="message">Optional message to pre-fill.</param>
    /// <returns>The link, or <c>null</c> if the number is invalid.</returns>
    /// <exception cref="ArgumentException">The message contains an unpaired surrogate.</exception>
    public static string? CreateLink(string phone, string? message = null)
    {
        var digits = Phone.NormalizeDigits(phone);
        if (digits is null) return null;
        var baseUrl = "https://wa.me/" + digits;
        return string.IsNullOrEmpty(message) ? baseUrl : $"{baseUrl}?text={EncodeUriComponent(message)}";
    }

    private static string EncodeUriComponent(string text)
    {
        var sb = new StringBuilder();
        foreach (var rune in Js.CodePoints(text))
        {
            if (rune.Length == 1)
            {
                var c = rune[0];
                if (char.IsSurrogate(c)) throw new ArgumentException("Message contains an unpaired surrogate", nameof(text));
                if (c is (>= 'A' and <= 'Z') or (>= 'a' and <= 'z') or (>= '0' and <= '9') || Unescaped.Contains(c))
                {
                    sb.Append(c);
                    continue;
                }
            }
            foreach (var b in Encoding.UTF8.GetBytes(rune)) sb.Append('%').Append(b.ToString("X2"));
        }
        return sb.ToString();
    }
}
