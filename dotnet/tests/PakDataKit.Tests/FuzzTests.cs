using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
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
        string.Concat(Enumerable.Repeat("35202 \r\n ", 20_000)) + "!",
        "35202" + string.Concat(Enumerable.Repeat(" \n", 20_000)) + "1234567\n1!",
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
            "Postal.GetPostOffice", "Postal.SearchPostOffices",
            "Geo.GetProvince", "Geo.SearchCities", "Geo.GetDivisions", "Geo.GetDivisionOfDistrict", "Geo.GetTehsils",
            "Geo.GetTehsilDistrict", "WhatsApp.CreateLink", "WhatsApp.TryCreateLink", "Text.Normalize",
            "Text.NormalizeRomanUrdu", "Address.Parse", "Input.FormatCnic", "Input.CheckIban", "RaastQr.Parse",
            "RaastQr.Validate", "Holidays.IsHoliday", "Holidays.GetHolidaysOn", "Holidays.TryGetHolidaysOn",
            "Quality.ScoreAddress", "Quality.PhoneRiskSignals", "Bills.ParseElectricityRef",
            "Bills.ValidateElectricityRef", "Courier.MapStatus", "Courier.NormalizeCity",
            "Text.Slugify", "Text.CompareUrdu", "Text.IsRtl", "Text.WrapBidi", "IncomeTax.GetTaxYear",
            "Cnic.FindAll", "Cnic.Mask", "Text.RomanUrduKey",
            "PakData.GetDataInfo", "Population.GetDistrict", "Population.GetTehsil",
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

            // "0" and Arabic-Indic digits are real amounts: Rs. 0 and Rs. 123.
            if (name is "Currency.ParseAmount" or "Currency.FormatAmountInput" && input is "0" or "١٢٣")
            {
                Assert.True(result is not null, label + " returned null");
                continue;
            }

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
    public void TextScannersHandleHostileInput()
    {
        foreach (var input in Hostile)
        {
            var found = Cnic.FindAll(input);
            var masked = Cnic.Mask(input, "*");
            Assert.Equal(found.Count, masked.Count);
            Assert.Equal(input?.Length ?? 0, masked.Text.Length);
            var foundAcross = Cnic.FindAll(input, acrossLines: true);
            var maskedAcross = Cnic.Mask(input, acrossLines: true, mask: "*");
            Assert.Equal(foundAcross.Count, maskedAcross.Count);
            Assert.Equal(input?.Length ?? 0, maskedAcross.Text.Length);
            Assert.False(Numbers.ValidateLandline(input, services: true));
            var key = Text.RomanUrduKey(input);
            Assert.Matches("^(?:[a-z]+(?: [a-z]+)*)?$", key);
        }
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

    [Fact]
    public void QualityHandlesHostileInput()
    {
        foreach (var input in Hostile)
        {
            var score = Quality.ScoreAddress(input);
            Assert.InRange(score.Score, 0, 100);
            Assert.NotNull(score.Parsed);
            Assert.NotEmpty(Quality.PhoneRiskSignals(input));
        }
        Assert.Equal(0, Quality.ScoreAddress(null).Score);
        Assert.Equal([PhoneRiskFlag.Invalid], Quality.PhoneRiskSignals(null));
    }

    [Fact]
    public void SalesTaxHandlesHostileInput()
    {
        double[] numbers =
        [
            double.NaN, double.PositiveInfinity, double.NegativeInfinity, -0.0, -1, -1e-300, double.Epsilon,
            1e-7, 0.005, 0.0049999999999999, 1.005, 99.99, 100, 100.0000001, 101, 1e12, 1e12 + 0.01,
            1e15, double.MaxValue, double.MinValue, 18.005, 18.5, 33.33,
        ];
        foreach (var a in numbers)
        {
            foreach (var r in numbers)
            {
                SalesTax.SplitInclusive(a, r);
                SalesTax.Calculate(a, new SalesTaxOptions { Rate = r });
                SalesTax.Calculate(a, new SalesTaxOptions { Rate = r, Inclusive = true });
            }
            Assert.Null(SalesTax.Calculate(a, null));
            Assert.Null(SalesTax.Calculate(a, new SalesTaxOptions()));
        }
        Assert.Null(SalesTax.SplitInclusive(1e12 + 0.01, 18));
        Assert.Null(SalesTax.SplitInclusive(100, 18.005));
        Assert.Equal(new SalesTaxAmounts(1e12, 1.8e11, 1.18e12, 18), SalesTax.Calculate(1e12, new SalesTaxOptions { Rate = 18 }));
        Assert.Equal(new SalesTaxAmounts(1e12, 1e12, 2e12, 100), SalesTax.Calculate(1e12, new SalesTaxOptions { Rate = 100 }));

        Assert.Null(SalesTax.GetRate(null));
        Assert.Null(SalesTax.GetRate(new SalesTaxRateQuery { Kind = (SalesTaxKind)7, Date = "2026-01-01" }));
        Assert.Null(SalesTax.GetRate(new SalesTaxRateQuery
        {
            Kind = SalesTaxKind.Goods, Date = "2026-01-01", OnDate = new DateOnly(2026, 1, 1),
        }));
        Assert.Equal(18, SalesTax.GetRate(new SalesTaxRateQuery
        {
            Kind = SalesTaxKind.Goods, OnDate = new DateOnly(2026, 1, 1),
        })?.Rate);
        Assert.NotNull(SalesTax.GetRate(new SalesTaxRateQuery { Kind = SalesTaxKind.Services, Province = " kpk " }));
        foreach (var input in Hostile)
        {
            foreach (var kind in new[] { SalesTaxKind.Goods, SalesTaxKind.Services })
            {
                Assert.Null(SalesTax.GetRate(new SalesTaxRateQuery { Kind = kind, Date = input ?? "" }));
                Assert.Null(SalesTax.GetRate(new SalesTaxRateQuery { Kind = kind, Province = input ?? "", Date = "2026-01-01" }));
                Assert.Null(SalesTax.Calculate(100, new SalesTaxOptions { Kind = kind, Province = input ?? "" }));
                Assert.Null(SalesTax.Calculate(100, new SalesTaxOptions { Kind = kind, Date = input ?? "", Inclusive = true }));
            }
        }
    }

    [Fact]
    public void UrduTextHandlesHostileInput()
    {
        var random = new Random(StableSeed("Text.CompareUrdu"));
        var inputs = Hostile.Concat(Enumerable.Range(0, 200).Select(_ => RandomString(random))).ToList();
        foreach (var input in inputs)
        {
            foreach (var script in new[] { SlugScript.Any, SlugScript.Latin, SlugScript.Urdu, (SlugScript)42 })
            {
                var slug = Text.Slugify(input, new SlugifyOptions { Script = script });
                Assert.False(slug.StartsWith('-') || slug.EndsWith('-') || slug.Contains("--"), slug);
            }
            foreach (var direction in new[] { BidiDirection.Auto, BidiDirection.Rtl, BidiDirection.Ltr, (BidiDirection)42 })
                Assert.NotNull(Text.WrapBidi(input, direction));
            Text.IsRtl(input);
        }
        // Antisymmetric, and 0 only for identical strings.
        for (var i = 0; i < 2000; i++)
        {
            var a = inputs[random.Next(inputs.Count)];
            var b = inputs[random.Next(inputs.Count)];
            var ab = Text.CompareUrdu(a, b);
            Assert.InRange(ab, -1, 1);
            Assert.Equal(-ab, Text.CompareUrdu(b, a));
            Assert.Equal(ab == 0, (a ?? "") == (b ?? ""));
        }

        Assert.Equal("", Text.Slugify(null));
        Assert.Equal("a-b", Text.Slugify("a b", null));
        Assert.Equal("", Text.WrapBidi(null, BidiDirection.Rtl));
        Assert.False(Text.IsRtl(null));
        Assert.Equal(0, Text.CompareUrdu(null, ""));
    }

    [Fact]
    public void IncomeTaxHandlesHostileInput()
    {
        double[] numbers =
        [
            double.NaN, double.PositiveInfinity, double.NegativeInfinity, -0.0, -1, -1e-300, double.Epsilon,
            1e-7, 0.005, 0.0049999999999999, 1.005, 600_000.5, 1e12, 1e12 + 0.01, 1e15, double.MaxValue,
            double.MinValue,
        ];
        int?[] years = [null, int.MinValue, -1, 0, 2019, 2020, 2026, 2027, 2028, int.MaxValue];
        foreach (var amount in numbers)
        {
            foreach (var year in years)
            {
                var options = new SalaryTaxOptions { TaxYear = year };
                IncomeTax.CalculateSalaryTax(amount, options);
                IncomeTax.CalculateMonthlySalaryTax(amount, options);
            }
            IncomeTax.CalculateSalaryTax(amount);
            IncomeTax.CalculateMonthlySalaryTax(amount, null);
            foreach (var input in Hostile)
            {
                Assert.Null(IncomeTax.CalculateSalaryTax(amount, new SalaryTaxOptions { Date = input ?? "" }));
                Assert.Null(IncomeTax.CalculateMonthlySalaryTax(amount, new SalaryTaxOptions { Date = input ?? "" }));
            }
        }
        foreach (var year in years) IncomeTax.GetSalaryTaxSlabs(year);
        IncomeTax.GetTaxYear(DateOnly.MinValue);
        IncomeTax.GetTaxYear(DateOnly.MaxValue);

        // The largest monthly salary: 1.2e15 paisa a year at the top rate.
        var top = IncomeTax.CalculateMonthlySalaryTax(1e12, new SalaryTaxOptions { TaxYear = 2027 })!;
        Assert.True(top.Tax > 0 && top.EffectiveRate < 100);
        Assert.Null(IncomeTax.CalculateSalaryTax(100, new SalaryTaxOptions
        {
            Date = "2026-01-01", OnDate = new DateOnly(2026, 1, 1),
        }));
        Assert.Equal(2026, IncomeTax.CalculateSalaryTax(1, new SalaryTaxOptions { OnDate = new DateOnly(2025, 7, 1) })?.TaxYear);
    }

    [Fact]
    public void GasConsumerNumberHandlesHostileInput()
    {
        GasCompany[] companies = [GasCompany.Sngpl, GasCompany.Ssgc, (GasCompany)(-1), (GasCompany)99];
        var random = new Random(StableSeed("Bills.ValidateGasConsumerNumber"));
        foreach (var company in companies)
        {
            foreach (var input in Hostile) Assert.False(Bills.ValidateGasConsumerNumber(input, company));
            for (var i = 0; i < 400; i++) Bills.ValidateGasConsumerNumber(RandomString(random), company);
        }
        Assert.True(Bills.ValidateGasConsumerNumber("123-4567-8901", GasCompany.Sngpl));
        Assert.True(Bills.ValidateGasConsumerNumber("۱۲۳۴۵۶۷۸۹۰", GasCompany.Ssgc));
        Assert.False(Bills.ValidateGasConsumerNumber("12345678901", (GasCompany)99));
    }

    [Fact]
    public void CourierHandlesHostileInput()
    {
        // The reflection test passes hostile couriers; this one passes hostile statuses.
        var random = new Random(StableSeed("Courier.MapStatus"));
        foreach (var courier in new[] { "PostEx", "Leopards", "TCS", null, "constructor", "__proto__" })
        {
            foreach (var input in Hostile) Assert.Null(Courier.MapStatus(courier, input));
            for (var i = 0; i < 400; i++) Courier.MapStatus(courier, RandomString(random));
            foreach (var n in new[]
            {
                double.NaN, double.PositiveInfinity, double.NegativeInfinity, -1, -0.0, 1.5, 1e21, 1e300,
                double.MaxValue, double.Epsilon, 9007199254740993d,
            })
            {
                Courier.MapStatus(courier, n);
            }
        }
        Assert.Equal(CourierStatus.Delivered, Courier.MapStatus("PostEx", 5.0));
        Assert.Null(Courier.MapStatus("PostEx", 5.5));
        Assert.Null(Courier.MapStatus("PostEx", "hasOwnProperty"));
        Assert.Equal(CourierStatus.Attempted, Courier.MapStatus("postex", "Attempt Made: no answer"));
        Assert.Null(Courier.MapStatus("PostEx", "attempt mades"));
        Assert.Null(Courier.NormalizeCity("constructor"));
        Assert.Null(Courier.NormalizeCity(" city"));
        Assert.Equal("Karachi", Courier.NormalizeCity("Karachi City"));
    }

    private static readonly JsonSerializerOptions NamedFloats = new()
    {
        NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowNamedFloatingPointLiterals,
    };

    private const string SampleInvoice = """
        {"invoiceType":"Sale Invoice","invoiceDate":"2025-04-21","sellerNTNCNIC":"1234567",
         "sellerBusinessName":"Example Traders","sellerProvince":"Sindh","sellerAddress":"Karachi",
         "buyerNTNCNIC":"7654321","buyerBusinessName":"Example Buyer","buyerProvince":"Punjab",
         "buyerAddress":"Lahore","buyerRegistrationType":"Registered",
         "items":[{"hsCode":"0101.2100","productDescription":"Horses","rate":"18%",
                   "uoM":"Numbers, pieces, units","quantity":2,"valueSalesExcludingST":1234,
                   "saleType":"Goods at standard rate (default)"}]}
        """;

    [Fact]
    public void FbrInvoiceHandlesHostileInput()
    {
        var built = FbrInvoice.Build(JsonNode.Parse(SampleInvoice))!;
        Assert.Equal(222.12, built.Totals.SalesTaxApplicable);
        Assert.Equal(222.12, (double)built.Invoice["items"]![0]!["salesTaxApplicable"]!);
        Assert.Equal(
            ["invoiceType", "invoiceDate", "sellerNTNCNIC", "sellerBusinessName", "sellerProvince", "sellerAddress",
             "buyerNTNCNIC", "buyerBusinessName", "buyerProvince", "buyerAddress", "buyerRegistrationType", "items",
             "invoiceRefNo"],
            built.Invoice.Select(p => p.Key));
        Assert.True(FbrInvoice.Validate(built.Invoice).Valid);
        Assert.True(FbrInvoice.Validate(JsonDocument.Parse(built.Invoice.ToJsonString()).RootElement, "2025-04-21").Valid);
        Assert.Equal("0043", FbrInvoice.Validate(built.Invoice, "2025-04-20").Errors.Single().Code);
        Assert.Equal("1.12", FbrInvoice.SpecVersion);

        // 5.0 is a number; "5" and true are not. A repeated key keeps its last value.
        var doc = JsonDocument.Parse(built.Invoice.ToJsonString().Replace("\"quantity\":2", "\"quantity\":2.0,\"quantity\":\"2\""));
        Assert.Equal("0300", FbrInvoice.Validate(doc.RootElement).Errors.Single().Code);
        Assert.Equal("items[0].quantity", FbrInvoice.Validate(doc.RootElement).Errors.Single().Field);
        Assert.Equal(180, FbrInvoice.ExpectedSalesTax(JsonNode.Parse("""{"rate":"18%","valueSalesExcludingST":1000.0}""")));
        Assert.Null(FbrInvoice.ExpectedSalesTax(JsonNode.Parse("""{"rate":"18%","valueSalesExcludingST":"1000"}""")));
        Assert.Equal(180, FbrInvoice.ExpectedSalesTax(new JsonObject { ["rate"] = "18%", ["valueSalesExcludingST"] = 1000 }));
        Assert.Equal(180, FbrInvoice.ExpectedSalesTax(new JsonObject { ["rate"] = "18%", ["valueSalesExcludingST"] = 1000m }));
        Assert.Null(FbrInvoice.ExpectedSalesTax(new JsonObject { ["rate"] = "18%", ["valueSalesExcludingST"] = true }));
        // Per-unit tax on the largest quantity and price overflows a long; it must not throw.
        Assert.Equal(1e22, FbrInvoice.ExpectedSalesTax(new JsonObject { ["rate"] = "Rs.1000000000000", ["quantity"] = 1e10 }));
        // A JsonObject parsed with a repeated key throws when read; here it is just not an object.
        Assert.False(FbrInvoice.Validate(JsonNode.Parse("""{"a":1,"a":2}""")).Valid);
        Assert.Null(FbrInvoice.Build(JsonNode.Parse("""{"items":[],"items":[]}""")));

        JsonNode?[] hostileValues =
        [
            null, true, false, 0, -1, -0.0, 1.005, 0.12345, double.NaN, double.PositiveInfinity, double.NegativeInfinity,
            double.MaxValue, double.Epsilon, 1e21, 1e-7, long.MaxValue, decimal.MaxValue, 'x', new JsonArray(),
            new JsonObject(), new JsonArray(1, "a", null), JsonValue.Create(JsonDocument.Parse("\"x\"").RootElement),
            JsonValue.Create(JsonDocument.Parse("1e400").RootElement), JsonValue.Create(JsonDocument.Parse("null").RootElement),
        ];
        var hostile = hostileValues.Concat(Hostile.Select(s => (JsonNode?)s)).ToList();
        var invoiceKeys = JsonNode.Parse(SampleInvoice)!.AsObject().Select(p => p.Key)
            .Concat(["invoiceRefNo", "scenarioId"]).ToArray();
        var itemKeys = new[]
        {
            "hsCode", "productDescription", "rate", "uoM", "quantity", "valueSalesExcludingST", "saleType",
            "salesTaxApplicable", "salesTaxWithheldAtSource", "totalValues", "fixedNotifiedValueOrRetailPrice",
            "extraTax", "furtherTax", "fedPayable", "discount", "sroScheduleNo", "sroItemSerialNo",
        };
        foreach (var value in hostile)
        {
            Check(value?.DeepClone());
            foreach (var key in invoiceKeys)
            {
                var invoice = JsonNode.Parse(SampleInvoice)!.AsObject();
                invoice[key] = value?.DeepClone();
                Check(invoice);
            }
            foreach (var key in itemKeys)
            {
                var invoice = JsonNode.Parse(SampleInvoice)!.AsObject();
                invoice["items"]![0]![key] = value?.DeepClone();
                Check(invoice);
                FbrInvoice.ExpectedSalesTax(invoice["items"]![0]);
            }
            var withItem = JsonNode.Parse(SampleInvoice)!.AsObject();
            withItem["items"]!.AsArray().Add(value?.DeepClone());
            Check(withItem);
        }
        foreach (var rate in new[] { "Rs", "rs.", "RS 1.5", "Rs. 3", "Rs.٣", "18.5%", "1e2%", "0%", "100.00%", "Rs.99999999999999999999" })
        {
            var invoice = JsonNode.Parse(SampleInvoice)!.AsObject();
            invoice["items"]![0]!["rate"] = rate;
            invoice["items"]![0]!["quantity"] = 1e12;
            Check(invoice);
        }

        static void Check(JsonNode? invoice)
        {
            var before = invoice?.ToJsonString(NamedFloats);
            var result = FbrInvoice.Validate(invoice, "2025-04-21");
            Assert.Equal(result.Errors.Count == 0, result.Valid);
            FbrInvoice.Validate(invoice, "garbage");
            var build = FbrInvoice.Build(invoice);
            if (build is not null) FbrInvoice.Validate(build.Invoice);
            Assert.Equal(before, invoice?.ToJsonString(NamedFloats)); // the input is not changed
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
