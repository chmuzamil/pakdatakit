using System.Text;
using System.Text.RegularExpressions;
using PakDataKit.Internal;

namespace PakDataKit;

/// <summary>Pakistani postal code lookups.</summary>
public static class Postal
{
    private static readonly SafeRegex WsRun = Js.Rx("[" + Js.Ws + "]+");

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
    public static string? GetCity(string? postalCode)
    {
        postalCode ??= "";
        var code = WsRun.Replace(Js.Trim(postalCode), "");
        return code.Length == 0 ? null : ByCode.Value.GetValueOrDefault(code);
    }

    /// <summary>Returns the primary (GPO) postal code for a city.</summary>
    /// <param name="city">City name; case and spacing are ignored.</param>
    /// <returns>The postal code, or <c>null</c> if the city is not in the dataset.</returns>
    public static string? GetCode(string? city)
    {
        city ??= "";
        var key = Normalize.Key(city);
        return key.Length == 0 ? null : ByCity.Value.GetValueOrDefault(key);
    }

    /// <summary>Returns all known postal codes for a city, sorted.</summary>
    /// <param name="city">City name; case and spacing are ignored.</param>
    /// <returns>The codes; empty if the city is not in the dataset.</returns>
    public static IReadOnlyList<string> GetCodes(string? city)
    {
        city ??= "";
        var key = Normalize.Key(city);
        if (key.Length == 0) return [];
        return Js.LocaleSorted(Data.Postal.Where(e => Normalize.Key(e.City) == key).Select(e => e.PostalCode));
    }

    /// <summary>Returns known area names for a city's postal entries, sorted.</summary>
    /// <param name="city">City name; case and spacing are ignored.</param>
    /// <returns>The areas; empty if none are known.</returns>
    public static IReadOnlyList<string> GetAreas(string? city)
    {
        city ??= "";
        var key = Normalize.Key(city);
        if (key.Length == 0) return [];
        return Js.LocaleSorted(Data.Postal
            .Where(e => Normalize.Key(e.City) == key && !string.IsNullOrEmpty(e.Area))
            .Select(e => e.Area!));
    }

    /// <summary>Searches postal entries by city name, area, or postal code prefix.</summary>
    /// <param name="query">Text to search for.</param>
    /// <returns>Matching postal codes, sorted and without duplicates.</returns>
    public static IReadOnlyList<string> Search(string? query)
    {
        query ??= "";
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

/// <summary>Cities, tehsils, districts, divisions and provinces.</summary>
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

    private static readonly Lazy<Dictionary<string, string>> DivisionOfDistrict = new(() =>
    {
        var map = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var e in Data.Divisions)
        {
            foreach (var district in e.Districts) map[Normalize.Key(district)] = e.Division;
        }
        return map;
    });

    private static readonly Lazy<HashSet<string>> CensusDistrictKeys = new(() =>
        Data.Tehsils.Select(e => Normalize.Key(e.CensusDistrict)).ToHashSet(StringComparer.Ordinal));

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
    public static string? GetProvince(string? city)
    {
        city ??= "";
        var key = Normalize.Key(city);
        return key.Length == 0 ? null : CityMap.Value.GetValueOrDefault(key);
    }

    /// <summary>Searches cities by partial, case-insensitive name.</summary>
    /// <param name="query">Text to search for.</param>
    /// <returns>Matching city names, sorted.</returns>
    public static IReadOnlyList<string> SearchCities(string? query)
    {
        query ??= "";
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
    public static string? GetDistrictProvince(string? district)
    {
        district ??= "";
        var key = Normalize.Key(district);
        if (key.Length == 0) return null;
        return DistrictMap.Value.GetValueOrDefault(key) ?? FormerDistricts.GetValueOrDefault(key);
    }

    /// <summary>Searches districts by partial, case-insensitive name.</summary>
    /// <param name="query">Text to search for.</param>
    /// <returns>Matching district names, sorted.</returns>
    public static IReadOnlyList<string> SearchDistricts(string? query)
    {
        query ??= "";
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
    public static IReadOnlyList<string> GetDistrictsByProvince(string? province)
    {
        province ??= "";
        var key = Normalize.Key(province);
        if (key.Length == 0) return [];
        return Js.LocaleSorted(Data.Districts
            .Where(e => Normalize.Key(e.Province) == key)
            .Select(e => e.District));
    }

    /// <summary>
    /// Returns the administrative divisions of Pakistan, sorted.
    /// <para>
    /// The list is the 30 divisions of the 2023 census: Punjab 9, Sindh 6,
    /// Khyber Pakhtunkhwa 7 and Balochistan 8. Islamabad has no division, and
    /// the census tables do not cover Azad Jammu and Kashmir or
    /// Gilgit-Baltistan. Divisions created since the census (such as Gujrat
    /// in Punjab) are not included.
    /// </para>
    /// </summary>
    /// <returns>The division names.</returns>
    public static IReadOnlyList<string> GetDivisions() =>
        Js.LocaleSorted(Data.Divisions.Select(e => e.Division));

    /// <summary>
    /// Returns the administrative divisions of one province, sorted. See
    /// <see cref="GetDivisions()"/> for what the list covers.
    /// </summary>
    /// <param name="province">Province name; case and spacing are ignored.</param>
    /// <returns>
    /// The division names; empty if the province is not known or has no
    /// divisions in the data. <c>null</c> also gives an empty list: call
    /// <see cref="GetDivisions()"/> for every division.
    /// </returns>
    public static IReadOnlyList<string> GetDivisions(string? province)
    {
        province ??= "";
        var key = Normalize.Key(province);
        if (key.Length == 0) return [];
        return Js.LocaleSorted(Data.Divisions
            .Where(e => Normalize.Key(e.Province) == key)
            .Select(e => e.Division));
    }

    /// <summary>
    /// Returns the division a district belonged to in the 2023 census.
    /// <para>
    /// Census-district caveat: only the 136 districts of the 2023 census have
    /// a division here, under the name they had then (so <c>Quetta</c>,
    /// <c>Dera Bugti</c> and <c>South Waziristan</c> work, and their
    /// successors do not). Districts created after the census, and those of
    /// Azad Jammu and Kashmir, Gilgit-Baltistan and Islamabad, return <c>null</c>.
    /// </para>
    /// </summary>
    /// <param name="district">District name; case and spacing are ignored.</param>
    /// <returns>The division, or <c>null</c> if it is not known.</returns>
    public static string? GetDivisionOfDistrict(string? district)
    {
        district ??= "";
        var key = Normalize.Key(district);
        return key.Length == 0 ? null : DivisionOfDistrict.Value.GetValueOrDefault(key);
    }

    /// <summary>
    /// Returns the tehsils (talukas, sub-divisions) of a district, sorted.
    /// <para>
    /// Census-district caveat: the data is the 591 tehsil-level units of the
    /// 2023 census, each recorded under the district it was in then. For a
    /// district of the 2023 census this returns its census tehsils, even if
    /// some have since moved to a new district (so <c>Rawalpindi</c> still
    /// lists Murree). For a district created after the census it returns only
    /// the tehsils an official source places in it, which can be an empty
    /// list. Azad Jammu and Kashmir and Gilgit-Baltistan are not covered.
    /// </para>
    /// </summary>
    /// <param name="district">
    /// District name; case and spacing are ignored. Former names such as
    /// <c>Quetta</c> and <c>South Waziristan</c> work.
    /// </param>
    /// <returns>The tehsil names; empty if none are known.</returns>
    public static IReadOnlyList<string> GetTehsils(string? district)
    {
        district ??= "";
        var key = Normalize.Key(district);
        if (key.Length == 0) return [];
        var inCensus = CensusDistrictKeys.Value.Contains(key);
        return Js.LocaleSorted(Data.Tehsils
            .Where(e => inCensus
                ? Normalize.Key(e.CensusDistrict) == key
                : e.CurrentDistrict is not null && Normalize.Key(e.CurrentDistrict) == key)
            .Select(e => e.Tehsil));
    }

    /// <summary>
    /// Returns the district a tehsil was in at the 2023 census.
    /// <para>
    /// Census-district caveat: the result is the census district, which may
    /// have been split since (a tehsil of <c>Quetta</c> is now in Quetta East
    /// or Quetta West). A few names are shared by tehsils in different
    /// districts (<c>Saddar</c>, <c>Sahiwal</c>, <c>Khanpur</c>); pass the
    /// province to tell them apart.
    /// </para>
    /// </summary>
    /// <param name="tehsil">Tehsil, taluka or sub-division name; case and spacing are ignored.</param>
    /// <param name="province">Optional province to narrow the search; <c>null</c> searches every province.</param>
    /// <returns>
    /// The district, or <c>null</c> when the name is unknown or still matches
    /// more than one district.
    /// </returns>
    public static string? GetTehsilDistrict(string? tehsil, string? province = null)
    {
        tehsil ??= "";
        var key = Normalize.Key(tehsil);
        if (key.Length == 0) return null;
        var provinceKey = province is null ? null : Normalize.Key(province);
        var matches = Data.Tehsils
            .Where(e => Normalize.Key(e.Tehsil) == key
                && (provinceKey is null || Normalize.Key(e.Province) == provinceKey))
            .Select(e => e.CensusDistrict)
            .Distinct(StringComparer.Ordinal)
            .Take(2)
            .ToArray();
        return matches.Length == 1 ? matches[0] : null;
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
    public static string? CreateLink(string? phone, string? message = null)
    {
        phone ??= "";
        var digits = Phone.NormalizeDigits(phone);
        if (digits is null) return null;
        var baseUrl = "https://wa.me/" + digits;
        return string.IsNullOrEmpty(message) ? baseUrl : $"{baseUrl}?text={EncodeUriComponent(message)}";
    }

    /// <summary>
    /// Creates a <c>wa.me</c> link without throwing: returns <c>false</c> for
    /// an invalid number, or a message with an unpaired surrogate.
    /// </summary>
    /// <param name="phone">Mobile number in any accepted format.</param>
    /// <param name="message">Optional message to pre-fill.</param>
    /// <param name="link">The link, when one could be created.</param>
    /// <returns><c>true</c> if a link was created.</returns>
    public static bool TryCreateLink(string? phone, string? message, out string? link)
    {
        try
        {
            link = CreateLink(phone, message);
        }
        catch (ArgumentException)
        {
            link = null;
        }
        return link is not null;
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
