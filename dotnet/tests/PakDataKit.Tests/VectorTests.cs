using System.Collections;
using System.Globalization;
using System.Reflection;
using System.Text;
using System.Text.Json;
using Xunit;
using Xunit.Abstractions;

namespace PakDataKit.Tests;

/// <summary>
/// Checks the .NET port against the vectors generated from the TypeScript
/// library (test-vectors/*.json at the repository root), the same files the
/// Python and Dart ports use. Regenerate them with
/// <c>npm run build &amp;&amp; node scripts/generate-test-vectors.mjs</c>.
/// </summary>
public sealed class VectorTests(ITestOutputHelper output)
{
    /// <summary>
    /// Thrown when a vector's input cannot be expressed with the .NET API's
    /// types, e.g. <c>1.5</c> for an <c>int</c> parameter. The type system
    /// rejects such input at compile time; TypeScript rejects it at run time,
    /// so the vector must expect a throw (or <c>null</c>). The exception is an
    /// option TypeScript only validates when it uses it: then the call must
    /// give the expected result without that option.
    /// </summary>
    private sealed class Unrepresentable(string reason, string? option = null) : Exception(reason)
    {
        public string? Option { get; } = option;
    }

    private static readonly string VectorsDir = FindVectorsDir();

    public static IEnumerable<object[]> Modules() =>
        Directory.GetFiles(VectorsDir, "*.json").Select(Path.GetFileNameWithoutExtension).Order()
            .Select(name => new object[] { name! });

    [Fact]
    public void VectorsExist()
    {
        var total = Directory.GetFiles(VectorsDir, "*.json")
            .Sum(file => JsonDocument.Parse(File.ReadAllText(file)).RootElement.GetArrayLength());
        Assert.True(total > 12000, $"expected over 12,000 vectors in {VectorsDir}, found {total}");
    }

    [Theory]
    [MemberData(nameof(Modules))]
    public void Module(string module)
    {
        using var doc = JsonDocument.Parse(File.ReadAllText(Path.Combine(VectorsDir, module + ".json")));
        var failures = new List<string>();
        var rejected = new List<string>();
        var index = 0;
        var total = doc.RootElement.GetArrayLength();
        foreach (var vector in doc.RootElement.EnumerateArray())
        {
            var problem = Check(vector, rejected);
            if (problem is not null)
            {
                failures.Add(
                    $"[{index}] {vector.GetProperty("fn").GetString()} {vector.GetProperty("args").GetRawText()} "
                    + $"{vector.GetProperty("kwargs").GetRawText()}: {problem}");
            }
            index++;
        }

        var summary = $"{module}: {total - failures.Count}/{total} vectors passed; "
            + $"{rejected.Count} rejected by .NET types";
        output.WriteLine(summary);
        foreach (var line in rejected) output.WriteLine("  type-rejected: " + line);
        var summaryDir = Environment.GetEnvironmentVariable("PAKDATAKIT_VECTOR_SUMMARY");
        if (!string.IsNullOrEmpty(summaryDir))
        {
            Directory.CreateDirectory(summaryDir);
            File.WriteAllLines(
                Path.Combine(summaryDir, module + ".txt"),
                new[] { summary }.Concat(rejected.Select(r => "  type-rejected: " + r))
                    .Concat(failures.Select(f => "  FAILED: " + f)));
        }
        Assert.True(
            failures.Count == 0,
            $"{summary}\n{string.Join("\n", failures.Take(25))}");
    }

    // ----------------------------------------------------------- one vector

    private static string? Check(JsonElement vector, List<string> rejected)
    {
        var fn = vector.GetProperty("fn").GetString()!;
        var expected = vector.GetProperty("expected");
        if (vector.TryGetProperty("constant", out var constant) && constant.ValueKind == JsonValueKind.True)
        {
            return fn == "dataVersion" && PakData.Version == expected.GetString()
                ? null
                : $"constant {fn} is {PakData.Version}";
        }

        if (!Functions.TryGetValue(fn, out var call)) return "no .NET mapping for " + fn;
        var args = (List<object?>)Decode(vector.GetProperty("args"))!;
        var kwargs = (Dictionary<string, object?>)Decode(vector.GetProperty("kwargs"))!;
        var allowed = AllowedKwargs.GetValueOrDefault(fn) ?? [];
        var unknown = kwargs.Keys.Where(k => !allowed.Contains(k)).ToArray();
        if (unknown.Length > 0) return "unmapped options: " + string.Join(", ", unknown);

        var throws = vector.GetProperty("throws").ValueKind == JsonValueKind.True;
        object? result;
        try
        {
            try
            {
                result = call(args, kwargs);
            }
            catch (Unrepresentable e)
            {
                rejected.Add($"{fn} {vector.GetProperty("args").GetRawText()} "
                    + $"{vector.GetProperty("kwargs").GetRawText()}: {e.Message}");
                if (!throws && e.Option is not null)
                {
                    // TypeScript ignored the option here, so leave it out.
                    var without = new Dictionary<string, object?>(kwargs);
                    without.Remove(e.Option);
                    result = call(args, without);
                }
                else
                {
                    // Rejected by .NET's types; TypeScript must reject it too.
                    return throws || expected.ValueKind == JsonValueKind.Null
                        ? null
                        : $"{e.Message}, but TypeScript accepts it";
                }
            }
        }
        catch (ArgumentException e)
        {
            return throws ? null : "unexpected " + e.GetType().Name + ": " + e.Message;
        }
        catch (Exception e) when (e is not Unrepresentable)
        {
            return "crashed with " + e.GetType().Name + ": " + e.Message;
        }

        if (throws) return "expected an ArgumentException, got " + Describe(Plain(result));
        return Mismatch(Plain(result), Decode(expected, raw: true));
    }

    // ------------------------------------------------------------- encoding

    private static object? Decode(JsonElement value, bool raw = false)
    {
        switch (value.ValueKind)
        {
            case JsonValueKind.Null: return null;
            case JsonValueKind.True: return true;
            case JsonValueKind.False: return false;
            case JsonValueKind.String: return value.GetString();
            case JsonValueKind.Number: return value.GetDouble();
            case JsonValueKind.Array: return value.EnumerateArray().Select(v => Decode(v, raw)).ToList();
            default:
                if (!raw && value.TryGetProperty("$date", out var date))
                {
                    var text = date.GetString()!;
                    var parts = text.Split('T');
                    var ymd = parts[0].Split('-').Select(p => int.Parse(p, CultureInfo.InvariantCulture)).ToArray();
                    var hms = parts.Length > 1
                        ? parts[1].Split(':').Select(p => int.Parse(p, CultureInfo.InvariantCulture)).ToArray()
                        : [0, 0];
                    return new DateTime(ymd[0], ymd[1], ymd[2], hms[0], hms[1], hms.Length > 2 ? hms[2] : 0);
                }
                if (value.TryGetProperty("$num", out var num))
                {
                    return num.GetString() switch
                    {
                        "NaN" => double.NaN,
                        "Infinity" => double.PositiveInfinity,
                        "-Infinity" => double.NegativeInfinity,
                        var other => throw new InvalidOperationException("Unknown $num " + other),
                    };
                }
                var map = new Dictionary<string, object?>(StringComparer.Ordinal);
                foreach (var property in value.EnumerateObject()) map[property.Name] = Decode(property.Value, raw);
                return map;
        }
    }

    /// <summary>Converts a .NET result into the vector encoding.</summary>
    private static object? Plain(object? value)
    {
        switch (value)
        {
            case null or bool or string: return value;
            case double d when double.IsNaN(d): return new Dictionary<string, object?> { ["$num"] = "NaN" };
            case double d when double.IsInfinity(d):
                return new Dictionary<string, object?> { ["$num"] = d > 0 ? "Infinity" : "-Infinity" };
            case double d: return d;
            case int or long or float or decimal: return Convert.ToDouble(value, CultureInfo.InvariantCulture);
            case Enum e: return Kebab(e.ToString());
            case DateOnly date:
                return new Dictionary<string, object?>
                {
                    ["$date"] = date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                };
            case IDictionary dictionary:
                var mapped = new Dictionary<string, object?>(StringComparer.Ordinal);
                foreach (DictionaryEntry entry in dictionary) mapped[(string)entry.Key] = Plain(entry.Value);
                return mapped;
            case IEnumerable list: return list.Cast<object?>().Select(Plain).ToList();
        }

        // Result records: public properties become camelCase keys.
        var result = new Dictionary<string, object?>(StringComparer.Ordinal);
        foreach (var property in value.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            if (property.GetIndexParameters().Length > 0) continue;
            result[char.ToLowerInvariant(property.Name[0]) + property.Name[1..]] = Plain(property.GetValue(value));
        }
        return result;
    }

    private static string Kebab(string name)
    {
        var sb = new StringBuilder();
        foreach (var c in name)
        {
            if (char.IsUpper(c) && sb.Length > 0) sb.Append('-');
            sb.Append(char.ToLowerInvariant(c));
        }
        return sb.ToString();
    }

    /// <summary>
    /// Describes the first difference, or returns <c>null</c> if equal. Keys
    /// the TypeScript result leaves out (<c>undefined</c>) must be absent or <c>null</c>.
    /// </summary>
    private static string? Mismatch(object? actual, object? expected, string path = "$")
    {
        if (expected is double e && actual is double a)
        {
            return a.Equals(e) || a == e ? null : $"{path}: {Describe(a)} != {Describe(e)}";
        }
        if (expected is Dictionary<string, object?> expectedMap)
        {
            if (actual is not Dictionary<string, object?> actualMap) return $"{path}: {Describe(actual)} is not an object";
            foreach (var key in expectedMap.Keys.Union(actualMap.Keys))
            {
                if (!expectedMap.TryGetValue(key, out var expectedValue))
                {
                    if (actualMap[key] is not null) return $"{path}.{key}: unexpected {Describe(actualMap[key])}";
                }
                else if (!actualMap.TryGetValue(key, out var actualValue)) return $"{path}.{key}: missing";
                else if (Mismatch(actualValue, expectedValue, $"{path}.{key}") is { } found) return found;
            }
            return null;
        }
        if (expected is List<object?> expectedList)
        {
            if (actual is not List<object?> actualList || actualList.Count != expectedList.Count)
                return $"{path}: {Describe(actual)} != {Describe(expected)}";
            for (var i = 0; i < expectedList.Count; i++)
            {
                if (Mismatch(actualList[i], expectedList[i], $"{path}[{i}]") is { } found) return found;
            }
            return null;
        }
        return Equals(actual, expected) ? null : $"{path}: {Describe(actual)} != {Describe(expected)}";
    }

    private static string Describe(object? value)
    {
        var text = JsonSerializer.Serialize(value, new JsonSerializerOptions
        {
            NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowNamedFloatingPointLiterals,
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        });
        return text.Length > 300 ? text[..300] + "…" : text;
    }

    // ----------------------------------------------------- argument mapping

    private static string Str(object? value) =>
        value as string ?? throw new Unrepresentable($"{Describe(value)} is not a string");

    private static string? OptStr(object? value) => value is null ? null : Str(value);

    private static double Number(object? value) =>
        value is double d ? d : throw new Unrepresentable($"{Describe(value)} is not a number");

    private static double? OptNumber(object? value) => value is null ? null : Number(value);

    private static int Integer(object? value)
    {
        var n = Number(value);
        if (double.IsFinite(n) && Math.Truncate(n) == n && Math.Abs(n) <= int.MaxValue) return (int)n;
        throw new Unrepresentable($"{Describe(n)} is not an int");
    }

    /// <summary>An <c>int</c> option, or <paramref name="fallback"/> if absent.</summary>
    private static int IntOption(Dictionary<string, object?> kwargs, string key, int fallback)
    {
        try
        {
            return kwargs.GetValueOrDefault(key) is { } value ? Integer(value) : fallback;
        }
        catch (Unrepresentable e)
        {
            throw new Unrepresentable(e.Message, key);
        }
    }

    private static bool? OptBool(object? value) => value is null ? null : (bool)value;

    private static DateTime? OptDate(object? value) => value is null ? null : (DateTime)value;

    private static DateOnly Date(object? value) => DateOnly.FromDateTime((DateTime)value!);

    private static WordsLanguage Language(object? value) => value switch
    {
        null or "en" => WordsLanguage.En,
        "ur" => WordsLanguage.Ur,
        _ => throw new Unrepresentable($"{Describe(value)} is not a WordsLanguage"),
    };

    private static readonly Dictionary<string, HolidayId> HolidayIds =
        Enum.GetValues<HolidayId>().ToDictionary(id => Kebab(id.ToString()), id => id);

    private static HolidayOptions HolidayOptionsFrom(Dictionary<string, object?> k)
    {
        Dictionary<HolidayId, IReadOnlyList<string>>? announced = null;
        if (k.GetValueOrDefault("announced") is Dictionary<string, object?> map)
        {
            announced = [];
            foreach (var (key, value) in map)
            {
                // TypeScript only reads the Islamic holiday keys; others are ignored.
                if (!HolidayIds.TryGetValue(key, out var id)) continue;
                announced[id] = ((List<object?>)value!).Select(v => v as string ?? Describe(v)).ToArray();
            }
        }
        return new HolidayOptions
        {
            IncludeChristianHolidays = OptBool(k.GetValueOrDefault("includeChristianHolidays")) ?? false,
            Announced = announced,
            HijriOffset = IntOption(k, "hijriOffset", 0),
        };
    }

    private delegate object? Call(List<object?> a, Dictionary<string, object?> k);

    private static Call One(Func<string, object?> fn) => (a, _) => fn(Str(a[0]));

    private static Call HolidayCall(
        Func<DateOnly, HolidayOptions, object?> byDate, Func<string, HolidayOptions, object?> byText) =>
        (a, k) => a[0] is string text
            ? byText(text, HolidayOptionsFrom(k))
            : byDate(Date(a[0]), HolidayOptionsFrom(k));

    /// <summary>The kwargs each function accepts; anything else fails the test.</summary>
    private static readonly Dictionary<string, HashSet<string>> AllowedKwargs = new()
    {
        ["toHijri"] = ["offset"],
        ["fromHijri"] = ["offset"],
        ["formatHijri"] = ["offset"],
        ["isRamadan"] = ["offset"],
        ["getPakistanHolidays"] = ["includeChristianHolidays", "announced", "hijriOffset"],
        ["getHolidaysOn"] = ["includeChristianHolidays", "announced", "hijriOffset"],
        ["isPakistanHoliday"] = ["includeChristianHolidays", "announced", "hijriOffset"],
        ["numberToWords"] = ["language"],
        ["amountInWords"] = ["language", "cheque"],
        ["validateRaastQr"] = ["now", "expiresSoonMs"],
        ["createRaastP2PQr"] =
            ["iban", "scheme", "amount", "expiresAt", "expiresIn", "bankName", "particulars", "now"],
        ["createMerchantQr"] =
        [
            "merchantAccount", "merchantName", "city", "mcc", "amount", "dynamic", "billNumber",
            "mobileNumber", "reference", "dueDate", "amountAfterDueDate",
        ],
        // ParsedAddress fields; formatAddress ignores `warnings`, as in TypeScript.
        ["formatAddress"] = ["raw", "street", "area", "city", "district", "province", "postalCode", "warnings"],
    };

    private static readonly Dictionary<string, Call> Functions = new()
    {
        ["validateCNIC"] = One(v => Cnic.Validate(v)),
        ["getCNICInfo"] = One(Cnic.GetInfo),
        ["validatePhone"] = One(v => Phone.Validate(v)),
        ["formatPhone"] = One(Phone.Format),
        ["analyzePhone"] = One(Phone.Analyze),
        ["getNetwork"] = One(Networks.GetNetwork),
        ["createWhatsAppLink"] = (a, _) =>
            a.Count > 1 ? WhatsApp.CreateLink(Str(a[0]), OptStr(a[1])) : WhatsApp.CreateLink(Str(a[0])),
        ["getProvince"] = One(Geo.GetProvince),
        ["searchCities"] = One(Geo.SearchCities),
        ["getDistrictProvince"] = One(Geo.GetDistrictProvince),
        ["searchDistricts"] = One(Geo.SearchDistricts),
        ["getDistrictsByProvince"] = One(Geo.GetDistrictsByProvince),
        ["formatPKR"] = (a, _) => Currency.FormatPkr(Number(a[0])),
        ["formatLakh"] = (a, _) => Currency.FormatLakh(Number(a[0])),
        ["validateIBAN"] = One(v => Iban.Validate(v)),
        ["getBankFromIBAN"] = One(Iban.GetBank),
        ["getBankInfo"] = One(Iban.GetBankInfo),
        ["getBanks"] = (_, _) => Iban.GetBanks(),
        ["getCityByPostalCode"] = One(Postal.GetCity),
        ["getPostalCode"] = One(Postal.GetCode),
        ["getPostalCodes"] = One(Postal.GetCodes),
        ["getPostalAreas"] = One(Postal.GetAreas),
        ["searchPostalCodes"] = One(Postal.Search),
        ["parseAddress"] = One(Address.Parse),
        ["formatAddress"] = (_, k) => Address.Format(new ParsedAddress
        {
            Raw = OptStr(k.GetValueOrDefault("raw")),
            Street = OptStr(k.GetValueOrDefault("street")),
            Area = OptStr(k.GetValueOrDefault("area")),
            City = OptStr(k.GetValueOrDefault("city")),
            District = OptStr(k.GetValueOrDefault("district")),
            Province = OptStr(k.GetValueOrDefault("province")),
            PostalCode = OptStr(k.GetValueOrDefault("postalCode")),
        }),
        ["normalizeText"] = One(Text.Normalize),
        ["normalizeRomanUrdu"] = One(Text.NormalizeRomanUrdu),
        ["toUrduDigits"] = One(Text.ToUrduDigits),
        ["toEnglishDigits"] = One(Text.ToEnglishDigits),
        ["toHijri"] = (a, k) => Hijri.ToHijri(Date(a[0]), IntOption(k, "offset", 0)),
        ["fromHijri"] = (a, k) =>
        {
            var h = (Dictionary<string, object?>)a[0]!;
            return Hijri.FromHijri(
                new HijriDate(
                    Integer(h.GetValueOrDefault("year")), Integer(h.GetValueOrDefault("month")),
                    Integer(h.GetValueOrDefault("day"))),
                IntOption(k, "offset", 0));
        },
        ["formatHijri"] = (a, k) => Hijri.Format(Date(a[0]), IntOption(k, "offset", 0)),
        ["isRamadan"] = (a, k) => Hijri.IsRamadan(Date(a[0]), IntOption(k, "offset", 0)),
        ["getHijriMonthName"] = (a, _) => Hijri.GetMonthName(Integer(a[0])),
        ["getPakistanHolidays"] = (a, k) => Holidays.GetHolidays(Integer(a[0]), HolidayOptionsFrom(k)),
        ["getHolidaysOn"] = HolidayCall(Holidays.GetHolidaysOn, Holidays.GetHolidaysOn),
        ["isPakistanHoliday"] = HolidayCall((d, o) => Holidays.IsHoliday(d, o), (t, o) => Holidays.IsHoliday(t, o)),
        ["numberToWords"] = (a, k) => Words.NumberToWords(Number(a[0]), Language(k.GetValueOrDefault("language"))),
        ["amountInWords"] = (a, k) => Words.AmountInWords(
            Number(a[0]), Language(k.GetValueOrDefault("language")), OptBool(k.GetValueOrDefault("cheque")) ?? false),
        ["analyzeNTN"] = One(Tax.AnalyzeNtn),
        ["validateNTN"] = One(v => Tax.ValidateNtn(v)),
        ["validateSTRN"] = One(v => Tax.ValidateStrn(v)),
        ["validatePassport"] = One(v => Passport.Validate(v)),
        ["validateVehiclePlate"] = One(v => VehiclePlate.Validate(v)),
        ["parseVehiclePlate"] = One(VehiclePlate.Parse),
        ["analyzeNumber"] = One(Numbers.Analyze),
        ["getNumberType"] = One(v => Numbers.GetNumberType(v)),
        ["validateLandline"] = One(v => Numbers.ValidateLandline(v)),
        ["getAreaCode"] = One(Numbers.GetAreaCode),
        ["createRaastP2PQr"] = (_, k) =>
        {
            var expiresIn = k.GetValueOrDefault("expiresIn");
            if (expiresIn is not (null or string or double))
                throw new Unrepresentable($"{Describe(expiresIn)} is not a duration");
            return RaastQr.CreateP2P(new RaastP2POptions
            {
                Iban = Str(k.GetValueOrDefault("iban")),
                Scheme = OptStr(k.GetValueOrDefault("scheme")),
                Amount = OptNumber(k.GetValueOrDefault("amount")),
                ExpiresAt = OptDate(k.GetValueOrDefault("expiresAt")),
                ExpiresIn = expiresIn as string,
                ExpiresInMilliseconds = expiresIn as double?,
                BankName = OptStr(k.GetValueOrDefault("bankName")),
                Particulars = OptStr(k.GetValueOrDefault("particulars")),
                Now = OptDate(k.GetValueOrDefault("now")),
            });
        },
        ["createMerchantQr"] = (_, k) =>
        {
            var account = (Dictionary<string, object?>)k["merchantAccount"]!;
            var fields = ((Dictionary<string, object?>)account["fields"]!)
                .ToDictionary(f => f.Key, f => Str(f.Value));
            var dueDate = OptDate(k.GetValueOrDefault("dueDate"));
            return RaastQr.CreateMerchant(new MerchantQrOptions
            {
                MerchantAccount = new MerchantAccountInfo(fields, OptStr(account.GetValueOrDefault("tag"))),
                MerchantName = Str(k.GetValueOrDefault("merchantName")),
                City = Str(k.GetValueOrDefault("city")),
                Mcc = OptStr(k.GetValueOrDefault("mcc")),
                Amount = OptNumber(k.GetValueOrDefault("amount")),
                Dynamic = OptBool(k.GetValueOrDefault("dynamic")),
                BillNumber = OptStr(k.GetValueOrDefault("billNumber")),
                MobileNumber = OptStr(k.GetValueOrDefault("mobileNumber")),
                Reference = OptStr(k.GetValueOrDefault("reference")),
                DueDate = dueDate is null ? null : DateOnly.FromDateTime(dueDate.Value),
                AmountAfterDueDate = OptNumber(k.GetValueOrDefault("amountAfterDueDate")),
            });
        },
        ["parseRaastQr"] = One(RaastQr.Parse),
        ["validateRaastQr"] = (a, k) => RaastQr.Validate(
            Str(a[0]), OptDate(k.GetValueOrDefault("now")), OptNumber(k.GetValueOrDefault("expiresSoonMs")) ?? 3_600_000),
        ["formatCNICInput"] = One(Input.FormatCnic),
        ["checkCNICInput"] = One(v => Input.CheckCnic(v)),
        ["formatPhoneInput"] = One(Input.FormatPhone),
        ["checkPhoneInput"] = One(v => Input.CheckPhone(v)),
        ["formatIBANInput"] = One(Input.FormatIban),
        ["checkIBANInput"] = One(v => Input.CheckIban(v)),
    };

    private static string FindVectorsDir()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            var candidate = Path.Combine(dir.FullName, "test-vectors");
            if (Directory.Exists(candidate) && File.Exists(Path.Combine(candidate, "cnic.json"))) return candidate;
            dir = dir.Parent;
        }
        throw new DirectoryNotFoundException("test-vectors/ not found above " + AppContext.BaseDirectory);
    }
}
