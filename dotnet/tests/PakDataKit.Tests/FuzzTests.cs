using System.Reflection;
using System.Text;
using Xunit;

namespace PakDataKit.Tests;

/// <summary>
/// Feeds random and hostile strings to every public method that takes a
/// string, and checks the no-throw contract: validators return <c>false</c>,
/// parsers and lookups return <c>null</c> (or an empty list), and nothing
/// throws.
/// </summary>
public sealed class FuzzTests
{
    private const int HugeLength = 200_000;

    /// <summary>Inputs that can never be valid for any validator or parser.</summary>
    private static readonly string?[] Hostile =
    [
        null,
        "",
        " ",
        "\t\r\n",
        "\u00a0\u2028\u2029\ufeff",
        "\0",
        "\0\0\0",
        "garbage",
        "!@#$%^&*()",
        "'; DROP TABLE users; --",
        "<script>alert(1)</script>",
        "../../etc/passwd",
        "%00%0a%0d",
        "\ud83d",                       // unpaired high surrogate
        "\udc00",                       // unpaired low surrogate
        "\ud83d🐀\udc00",     // surrogates in the wrong order
        "a\ud800b",
        "\uffff\ufffe",                 // noncharacters
        "\u202e\u202d\u200f\u200e",     // bidi controls
        "\u200b\u200c\u200d\u2060",     // zero-width characters
        "é́́́",    // stacked combining marks
        "١٢٣",           // Arabic-Indic digits alone
        "１２３４５",                      // full-width digits
        "ＰＫ３６",                        // full-width letters
        "ß",
        "İıΣς",
        "🇵🇰",
        "-",
        "--------",
        "+",
        "+92",
        "0",
        "((((((((((((((((((((",
        "))))))))))))))))))))",
        "[[[[\\\\\\\\]]]]",
        "{0}{1}{2}%s%d%n",
        new string('A', HugeLength),
        new string('9', HugeLength),
        new string(' ', HugeLength),
        new string('-', HugeLength),
        new string(',', 20_000),
        new string('\ud83d', 5_000),
        string.Concat(Enumerable.Repeat("12345 ", HugeLength / 6)),
        string.Concat(Enumerable.Repeat("a,", 20_000)),
        string.Concat(Enumerable.Repeat("p. o. box ", 10_000)),
        string.Concat(Enumerable.Repeat("0002", 50_000)),
        // Regex-timeout bait: long runs that almost match, then fail.
        new string('1', 50_000) + "!",
        "PK" + new string('0', 50_000) + "!",
        new string('A', 50_000) + "-" + new string('1', 50_000) + "/",
        "35202" + new string('-', 50_000) + "1234567-1!",
        string.Concat(Enumerable.Repeat("kia ", 20_000)) + "\ud800",
    ];

    public static IEnumerable<object[]> StringMethods() =>
        typeof(Cnic).Assembly.GetExportedTypes()
            .Where(t => t.IsAbstract && t.IsSealed) // static classes
            .SelectMany(t => t.GetMethods(BindingFlags.Public | BindingFlags.Static | BindingFlags.DeclaredOnly))
            .Where(m =>
            {
                var p = m.GetParameters();
                return p.Length > 0 && p[0].ParameterType == typeof(string)
                    && p.Skip(1).All(x => x.IsOptional || x.IsOut || x.ParameterType == typeof(string));
            })
            .Select(m => new object[] { $"{m.DeclaringType!.Name}.{m.Name}", m })
            .OrderBy(row => (string)row[0], StringComparer.Ordinal);

    [Fact]
    public void CoversEveryStringMethod()
    {
        // Guards against the reflection filter silently matching nothing.
        var names = StringMethods().Select(row => (string)row[0]).ToHashSet();
        Assert.True(names.Count >= 45, $"only {names.Count} string methods found");
        foreach (var expected in new[]
        {
            "Cnic.Validate", "Cnic.GetInfo", "Phone.Validate", "Phone.Format", "Phone.Analyze",
            "Networks.GetNetwork", "Numbers.Analyze", "Numbers.ValidateLandline", "Iban.Validate",
            "Iban.GetBank", "Iban.GetBankInfo", "Tax.AnalyzeNtn", "Tax.ValidateNtn", "Tax.ValidateStrn",
            "Passport.Validate", "VehiclePlate.Parse", "VehiclePlate.Validate", "Postal.GetCity", "Postal.Search",
            "Geo.GetProvince", "Geo.SearchCities", "WhatsApp.CreateLink", "WhatsApp.TryCreateLink", "Text.Normalize",
            "Text.NormalizeRomanUrdu", "Address.Parse", "Input.FormatCnic", "Input.CheckIban", "RaastQr.Parse",
            "RaastQr.Validate", "Holidays.IsHoliday", "Holidays.GetHolidaysOn", "Holidays.TryGetHolidaysOn",
        })
        {
            Assert.Contains(expected, names);
        }
    }

    [Theory]
    [MemberData(nameof(StringMethods))]
    public void HostileInput(string name, MethodInfo method)
    {
        foreach (var input in Hostile)
        {
            var result = Invoke(name, method, input);
            var label = $"{name}({Describe(input)})";

            if (method.ReturnType == typeof(bool))
            {
                // Validate*, Is* and Try*: hostile input is never valid.
                Assert.False((bool)result!, label + " returned true");
            }
            else if (Nullable.GetUnderlyingType(method.ReturnType) is not null || IsNullableReference(method))
            {
                // Parse, Get* and Analyze*: nothing to return.
                Assert.True(result is null, label + " returned " + result);
            }
            else
            {
                Assert.True(result is not null, label + " returned null");
            }
        }
    }

    [Theory]
    [MemberData(nameof(StringMethods))]
    public void RandomInput(string name, MethodInfo method)
    {
        // Seeded, so a failure is reproducible.
        var random = new Random(StableSeed(name));
        for (var i = 0; i < 400; i++) Invoke(name, method, RandomString(random));
    }

    [Fact]
    public void TryOverloadsNeverThrow()
    {
        Assert.False(WhatsApp.TryCreateLink("0300 1234567", "hi \ud800", out var link));
        Assert.Null(link);
        Assert.True(WhatsApp.TryCreateLink("0300 1234567", "hi", out link));
        Assert.Equal("https://wa.me/923001234567?text=hi", link);

        Assert.False(Holidays.TryGetHolidaysOn("14-08-2026", out var holidays));
        Assert.Empty(holidays);
        Assert.False(Holidays.TryGetHolidaysOn("1900-01-01", out _));
        Assert.True(Holidays.TryGetHolidaysOn("2026-08-14", out holidays));
        Assert.Single(holidays);
        Assert.False(Holidays.IsHoliday("not a date"));
        Assert.Empty(Holidays.GetHolidaysOn("0000-00-00"));

        Assert.False(Hijri.TryFromHijri(new HijriDate(1447, 13, 1), out _));
        Assert.False(Hijri.TryFromHijri(null, out _));
        Assert.True(Hijri.TryFromHijri(new HijriDate(1447, 9, 1), out var date));
        Assert.Equal(2026, date.Year);

        Assert.False(RaastQr.TryCreateP2P(new RaastP2POptions { Iban = "garbage" }, out var payload));
        Assert.Null(payload);
        Assert.False(RaastQr.TryCreateP2P(null, out _));
        Assert.False(RaastQr.TryCreateP2P(
            new RaastP2POptions { Iban = "PK36SCBL0000001123456702", Amount = 10 }, out _)); // no expiry
        Assert.True(RaastQr.TryCreateP2P(new RaastP2POptions { Iban = "PK36SCBL0000001123456702" }, out payload));
        Assert.True(RaastQr.Validate(payload).Valid);
        Assert.False(RaastQr.TryCreateMerchant(null, out _));
        Assert.False(RaastQr.TryCreateMerchant(
            new MerchantQrOptions
            {
                MerchantAccount = new MerchantAccountInfo(new Dictionary<string, string>()),
                MerchantName = "Shop",
                City = "Lahore",
            },
            out _));
    }

    [Fact]
    public void AddressParseHandlesHostileInput()
    {
        foreach (var input in Hostile)
        {
            var parsed = Address.Parse(input);
            Assert.NotNull(parsed);
            Assert.NotNull(Address.Format(parsed));
        }
    }

    private static object? Invoke(string name, MethodInfo method, string? input)
    {
        var parameters = method.GetParameters();
        var args = new object?[parameters.Length];
        args[0] = input;
        for (var i = 1; i < parameters.Length; i++)
            args[i] = parameters[i].IsOptional ? parameters[i].DefaultValue : null;
        try
        {
            return method.Invoke(null, args);
        }
        catch (TargetInvocationException e)
        {
            Assert.Fail($"{name}({Describe(input)}) threw {e.InnerException!.GetType().Name}: {e.InnerException.Message}");
            return null;
        }
    }

    private static bool IsNullableReference(MethodInfo method) =>
        !method.ReturnType.IsValueType
        && new NullabilityInfoContext().Create(method.ReturnParameter).ReadState == NullabilityState.Nullable;

    private static string Describe(string? input)
    {
        if (input is null) return "null";
        var text = input.Length > 24 ? input[..24] + $"… ({input.Length} chars)" : input;
        var sb = new StringBuilder("\"");
        foreach (var c in text) sb.Append(c is < ' ' or > '~' ? $"\\u{(int)c:x4}" : c.ToString());
        return sb.Append('"').ToString();
    }

    private static int StableSeed(string name)
    {
        var seed = 17;
        foreach (var c in name) seed = unchecked(seed * 31 + c);
        return seed;
    }

    private static readonly string[] Fragments =
    [
        "35202", "1234567", "-", " ", "+92", "0092", "0300", "03", "PK36", "SCBL", "0000001123456702", "AB", "LEA",
        "0002", "0102", "6304", "1004", "Lahore", "Punjab", ",", ".", "/", "(", ")", "۱", "٣", "ß", "İ",
        "😀", "\ud800", "\udfff", "\u00a0", "\u200b", "\0", "\n", "#", "house", "p.o. box", "54000", "kia",
        "2026-08-14", "290200001200", "A", "z", "9",
    ];

    private static string RandomString(Random random)
    {
        var sb = new StringBuilder();
        var parts = random.Next(0, 12);
        for (var i = 0; i < parts; i++)
        {
            if (random.Next(4) == 0) sb.Append((char)random.Next(0, 0x10000));
            else sb.Append(Fragments[random.Next(Fragments.Length)]);
        }
        return sb.ToString();
    }
}
