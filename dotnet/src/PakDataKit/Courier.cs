using PakDataKit.Internal;

namespace PakDataKit;

/// <summary>
/// A courier's status in one vocabulary, from order to delivery or return.
/// The npm package's strings are the names in kebab case (<c>picked-up</c>,
/// <c>out-for-delivery</c>, …).
/// </summary>
public enum CourierStatus
{
    /// <summary><c>pending</c>: the order exists but is not booked yet.</summary>
    Pending,

    /// <summary><c>booked</c>: booked with the courier.</summary>
    Booked,

    /// <summary><c>picked-up</c>: picked up from the merchant.</summary>
    PickedUp,

    /// <summary><c>in-transit</c>: at a warehouse or on the way.</summary>
    InTransit,

    /// <summary><c>out-for-delivery</c>: with a rider for delivery.</summary>
    OutForDelivery,

    /// <summary><c>attempted</c>: a delivery attempt failed.</summary>
    Attempted,

    /// <summary><c>under-review</c>: the delivery is under review.</summary>
    UnderReview,

    /// <summary><c>delivered</c>: delivered to the customer.</summary>
    Delivered,

    /// <summary><c>returning</c>: on the way back to the merchant.</summary>
    Returning,

    /// <summary><c>returned</c>: returned to the merchant.</summary>
    Returned,

    /// <summary><c>cancelled</c>: cancelled or expired.</summary>
    Cancelled,
}

/// <summary>
/// Helpers for orders shipped with Pakistani couriers (TCS, Leopards, PostEx,
/// M&amp;P, Trax, BlueEx). There are no API clients: nothing is sent anywhere.
/// </summary>
public static class Courier
{
    /// <summary>
    /// Status values each courier documents publicly, by normalised key (lower
    /// case, single spaces, straight apostrophes). PostEx: "Merchant API
    /// Integration Guide" v4.1.9, order status IDs (§3.15) and tracking history
    /// codes (§3.8). Leopards: "Returned to Shipper", from its e-commerce FAQ.
    /// TCS, M&amp;P, Trax and BlueEx publish no status list.
    /// </summary>
    private static readonly Dictionary<string, Dictionary<string, CourierStatus>> Statuses =
        new(StringComparer.Ordinal)
        {
            ["PostEx"] = new(StringComparer.Ordinal)
            {
                // Order status IDs and names (§3.15).
                ["1"] = CourierStatus.Pending,
                ["unbooked"] = CourierStatus.Pending,
                ["2"] = CourierStatus.Booked,
                ["booked"] = CourierStatus.Booked,
                ["3"] = CourierStatus.InTransit,
                ["postex warehouse"] = CourierStatus.InTransit,
                ["4"] = CourierStatus.OutForDelivery,
                ["out for delivery"] = CourierStatus.OutForDelivery,
                ["5"] = CourierStatus.Delivered,
                ["delivered"] = CourierStatus.Delivered,
                ["6"] = CourierStatus.Returned,
                ["returned"] = CourierStatus.Returned,
                ["7"] = CourierStatus.Cancelled,
                ["un-assigned by me"] = CourierStatus.Cancelled,
                ["8"] = CourierStatus.Cancelled,
                ["expired"] = CourierStatus.Cancelled,
                ["9"] = CourierStatus.UnderReview,
                ["delivery under review"] = CourierStatus.UnderReview,
                ["15"] = CourierStatus.PickedUp,
                ["picked by postex"] = CourierStatus.PickedUp,
                ["16"] = CourierStatus.Returning,
                ["out for return"] = CourierStatus.Returning,
                ["17"] = CourierStatus.Attempted,
                ["attempted"] = CourierStatus.Attempted,
                ["18"] = CourierStatus.InTransit,
                ["en-route to postex warehouse"] = CourierStatus.InTransit,
                // Tracking history codes and messages (§3.8).
                ["0001"] = CourierStatus.Booked,
                ["at merchant's warehouse"] = CourierStatus.Booked,
                ["0002"] = CourierStatus.Returned,
                ["0003"] = CourierStatus.InTransit,
                ["at postex warehouse"] = CourierStatus.InTransit,
                ["0004"] = CourierStatus.InTransit,
                ["package on root"] = CourierStatus.InTransit,
                ["package on route"] = CourierStatus.InTransit,
                ["0005"] = CourierStatus.Delivered,
                ["0006"] = CourierStatus.Returned,
                ["0007"] = CourierStatus.Returned,
                ["0008"] = CourierStatus.UnderReview,
                ["0013"] = CourierStatus.Attempted,
            },
            ["Leopards"] = new(StringComparer.Ordinal)
            {
                ["returned to shipper"] = CourierStatus.Returned,
            },
            ["TCS"] = new(StringComparer.Ordinal),
            ["M&P"] = new(StringComparer.Ordinal),
            ["Trax"] = new(StringComparer.Ordinal),
            ["BlueEx"] = new(StringComparer.Ordinal),
        };

    /// <summary>Accepted spellings of each courier's name.</summary>
    private static readonly Dictionary<string, string> CourierNames = new(StringComparer.Ordinal)
    {
        ["tcs"] = "TCS",
        ["leopards"] = "Leopards",
        ["leopards courier"] = "Leopards",
        ["lcs"] = "Leopards",
        ["postex"] = "PostEx",
        ["m&p"] = "M&P",
        ["mnp"] = "M&P",
        ["m and p"] = "M&P",
        ["muller & phipps"] = "M&P",
        ["muller and phipps"] = "M&P",
        ["trax"] = "Trax",
        ["blueex"] = "BlueEx",
        ["blue ex"] = "BlueEx",
        ["blue-ex"] = "BlueEx",
    };

    /// <summary>
    /// Short forms and old names of cities, as people and courier forms write
    /// them: airport and dialling-style codes, Roman Urdu spellings, the former
    /// name Lyallpur, and Urdu script.
    /// </summary>
    private static readonly Dictionary<string, string> CityAliases = new(StringComparer.Ordinal)
    {
        ["lhr"] = "Lahore",
        ["lhe"] = "Lahore",
        ["lahor"] = "Lahore",
        ["لاہور"] = "Lahore",
        ["khi"] = "Karachi",
        ["krachi"] = "Karachi",
        ["کراچی"] = "Karachi",
        ["pindi"] = "Rawalpindi",
        ["rwp"] = "Rawalpindi",
        ["rawal pindi"] = "Rawalpindi",
        ["راولپنڈی"] = "Rawalpindi",
        ["isb"] = "Islamabad",
        ["isl"] = "Islamabad",
        ["اسلام آباد"] = "Islamabad",
        ["lyallpur"] = "Faisalabad",
        ["lyp"] = "Faisalabad",
        ["fsd"] = "Faisalabad",
        ["faisal abad"] = "Faisalabad",
        ["فیصل آباد"] = "Faisalabad",
        ["mux"] = "Multan",
        ["mtn"] = "Multan",
        ["ملتان"] = "Multan",
        ["pew"] = "Peshawar",
        ["psh"] = "Peshawar",
        ["پشاور"] = "Peshawar",
        ["uet"] = "Quetta",
        ["qta"] = "Quetta",
        ["کوئٹہ"] = "Quetta",
        ["hyd"] = "Hyderabad",
        ["حیدرآباد"] = "Hyderabad",
        ["حیدر آباد"] = "Hyderabad",
        ["skt"] = "Sialkot",
        ["سیالکوٹ"] = "Sialkot",
        ["grw"] = "Gujranwala",
        ["گوجرانوالہ"] = "Gujranwala",
        ["dgk"] = "Dera Ghazi Khan",
        ["dg khan"] = "Dera Ghazi Khan",
        ["d g khan"] = "Dera Ghazi Khan",
        ["dik"] = "Dera Ismail Khan",
        ["di khan"] = "Dera Ismail Khan",
        ["d i khan"] = "Dera Ismail Khan",
        ["ryk"] = "Rahim Yar Khan",
        ["bwp"] = "Bahawalpur",
        ["sgd"] = "Sargodha",
        ["mzd"] = "Muzaffarabad",
    };

    private static readonly Lazy<Dictionary<string, string>> CityByKey = new(() =>
    {
        var map = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var e in Data.Cities) map[Normalize.Key(e.City)] = e.City;
        return map;
    });

    private const string AttemptMade = "attempt made";
    private const string CitySuffix = " city";

    private static string StatusKey(string text) =>
        Normalize.Key(text.Replace('‘', '\'').Replace('’', '\'').Replace('`', '\''));

    private static string CityKey(string text) => Normalize.Key(text.Replace('.', ' ').Replace(',', ' '));

    /// <summary>
    /// Maps a courier's own status name or code, as the courier documents it,
    /// to a <see cref="CourierStatus"/>. Matching ignores case and extra
    /// spaces; PostEx's "Attempt Made: &lt;reason&gt;" history messages map to
    /// <see cref="CourierStatus.Attempted"/>.
    /// </summary>
    /// <remarks>
    /// Only statuses the courier documents publicly are mapped: PostEx's API
    /// guide and one Leopards status. TCS, M&amp;P, Trax and BlueEx publish no
    /// list, so they always return <c>null</c>, as does any status not in the
    /// list. No API is called.
    /// </remarks>
    /// <param name="courier">
    /// <c>TCS</c>, <c>Leopards</c>, <c>PostEx</c>, <c>M&amp;P</c>, <c>Trax</c> or
    /// <c>BlueEx</c> (case-insensitive; <c>LCS</c>, <c>MnP</c> and <c>Blue Ex</c>
    /// are accepted).
    /// </param>
    /// <param name="raw">The status as the courier returned it.</param>
    /// <returns>The status, or <c>null</c>. Never throws.</returns>
    public static CourierStatus? MapStatus(string? courier, string? raw)
    {
        if (raw is null) return null;
        var name = CourierName(courier);
        return name is null ? null : Lookup(name, StatusKey(raw));
    }

    /// <summary>
    /// Maps a courier's numeric status ID (e.g. PostEx's <c>5</c>) to a
    /// <see cref="CourierStatus"/>. The number must be a non-negative whole
    /// number (<c>5</c> and <c>5.0</c> are the same; <c>1.5</c>, <c>-1</c> and
    /// NaN return <c>null</c>); it is looked up as its decimal string, so
    /// <c>5</c> matches <c>"5"</c> but not <c>"0005"</c>.
    /// </summary>
    /// <param name="courier">The courier, as for <see cref="MapStatus(string?, string?)"/>.</param>
    /// <param name="raw">The status ID as the courier returned it.</param>
    /// <returns>The status, or <c>null</c>. Never throws.</returns>
    public static CourierStatus? MapStatus(string? courier, double raw)
    {
        if (!double.IsFinite(raw) || Math.Floor(raw) != raw || raw < 0) return null;
        var name = CourierName(courier);
        return name is null ? null : Lookup(name, Js.NumberToString(raw));
    }

    /// <summary>
    /// Maps the way a customer or a courier writes a city to the city's name in
    /// the city list, so orders can be matched against a courier's service
    /// list. Accepts the exact name in any case, short forms (<c>LHR</c>,
    /// <c>Khi</c>, <c>Pindi</c>, <c>Isb</c>, <c>FSD</c>), the old name
    /// Lyallpur, a trailing "city", and the main cities in Urdu script.
    /// </summary>
    /// <example>
    /// <code>
    /// Courier.NormalizeCity("LHR");          // "Lahore"
    /// Courier.NormalizeCity("lyallpur");     // "Faisalabad"
    /// Courier.NormalizeCity("Karachi City"); // "Karachi"
    /// Courier.NormalizeCity("Atlantis");     // null
    /// </code>
    /// </example>
    /// <param name="input">The city as written.</param>
    /// <returns>A city from the city list, or <c>null</c>. Never throws.</returns>
    public static string? NormalizeCity(string? input)
    {
        if (input is null) return null;
        var key = CityKey(input);
        if (key.Length == 0) return null;
        for (var pass = 0; pass < 2; pass++)
        {
            if (CityByKey.Value.TryGetValue(key, out var city) || CityAliases.TryGetValue(key, out city))
                return city;
            if (!key.EndsWith(CitySuffix, StringComparison.Ordinal)) break;
            key = Js.Trim(key[..^CitySuffix.Length]);
        }
        return null;
    }

    private static string? CourierName(string? courier) =>
        courier is not null && CourierNames.TryGetValue(StatusKey(courier), out var name) ? name : null;

    private static CourierStatus? Lookup(string courier, string key)
    {
        if (Statuses[courier].TryGetValue(key, out var status)) return status;
        // JavaScript's /^attempt made\b/ (ASCII word boundary).
        if (courier == "PostEx" && key.StartsWith(AttemptMade, StringComparison.Ordinal)
            && (key.Length == AttemptMade.Length || !IsWordChar(key[AttemptMade.Length])))
        {
            return CourierStatus.Attempted;
        }
        return null;
    }

    private static bool IsWordChar(char c) => c is (>= 'a' and <= 'z') or (>= 'A' and <= 'Z') or (>= '0' and <= '9') or '_';
}
