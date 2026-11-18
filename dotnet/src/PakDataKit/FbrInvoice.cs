using System.Globalization;
using System.Numerics;
using System.Text.Json;
using System.Text.Json.Nodes;
using PakDataKit.Internal;

namespace PakDataKit;

/// <summary><c>invoiceType</c> values in FBR's Digital Invoicing specification.</summary>
public static class FbrInvoiceType
{
    /// <summary><c>Sale Invoice</c>.</summary>
    public const string SaleInvoice = "Sale Invoice";

    /// <summary><c>Debit Note</c>; needs <c>invoiceRefNo</c>.</summary>
    public const string DebitNote = "Debit Note";
}

/// <summary><c>buyerRegistrationType</c> values in FBR's Digital Invoicing specification.</summary>
public static class FbrRegistrationType
{
    /// <summary><c>Registered</c>.</summary>
    public const string Registered = "Registered";

    /// <summary><c>Unregistered</c>; <c>buyerNTNCNIC</c> may then be empty.</summary>
    public const string Unregistered = "Unregistered";
}

/// <summary>One problem found by <see cref="FbrInvoice.Validate(JsonNode?, string?)"/>.</summary>
/// <param name="Code">
/// FBR's error code (spec §7 and the Error Message Guide), or <c>null</c> for
/// a required field the specification gives no code for.
/// </param>
/// <param name="Field">Where: <c>invoiceDate</c>, <c>items[0].rate</c> …</param>
/// <param name="Message">What is wrong, in English.</param>
public sealed record FbrInvoiceError(string? Code, string Field, string Message);

/// <summary>Result of <see cref="FbrInvoice.Validate(JsonNode?, string?)"/>.</summary>
/// <param name="Valid"><c>true</c> when <paramref name="Errors"/> is empty.</param>
/// <param name="Errors">Every problem found, in the order the npm package reports them.</param>
public sealed record FbrInvoiceValidation(bool Valid, IReadOnlyList<FbrInvoiceError> Errors);

/// <summary>Column totals of an invoice, in rupees (quantity in units). Not sent to FBR.</summary>
public sealed record FbrInvoiceTotals(
    double Quantity,
    double ValueSalesExcludingST,
    double SalesTaxApplicable,
    double SalesTaxWithheldAtSource,
    double ExtraTax,
    double FurtherTax,
    double FedPayable,
    double Discount);

/// <summary>Result of <see cref="FbrInvoice.Build"/>.</summary>
public sealed class FbrInvoiceBuild
{
    internal FbrInvoiceBuild(JsonObject invoice, FbrInvoiceTotals totals)
    {
        Invoice = invoice;
        Totals = totals;
    }

    /// <summary>The invoice JSON to post to FBR, with camelCase keys as in the specification.</summary>
    public JsonObject Invoice { get; }

    /// <summary>Column totals, for your own records.</summary>
    public FbrInvoiceTotals Totals { get; }
}

/// <summary>
/// FBR Digital Invoicing (DI): a builder that works out the sales tax on the
/// invoice JSON posted to PRAL's gateway, and an offline validator for the
/// rules that can be checked without FBR's reference APIs.
/// </summary>
/// <remarks>
/// Built from PRAL's "Technical Specification for DI API", version 1.12, and
/// PRAL's "Error Message Guide (Sales)"; see DATA.md. Nothing here talks to
/// FBR: there is no HTTP client and no token handling. Values that only FBR's
/// reference APIs can confirm (provinces, HS codes, units, rates, sale types,
/// SRO numbers) are checked for presence, not against FBR's lists.
/// <para>
/// The invoice is JSON (<see cref="JsonNode"/>), with the specification's
/// camelCase keys, because that is what is posted to FBR and what arrives
/// from untrusted sources. A JSON number is a number however it is written
/// (<c>5</c> or <c>5.0</c>); a number in a string (<c>"5"</c>) is not.
/// </para>
/// </remarks>
public static class FbrInvoice
{
    /// <summary>Version of PRAL's technical specification this module follows (<c>FBR_DI_SPEC_VERSION</c>).</summary>
    public const string SpecVersion = "1.12";

    private static readonly HashSet<string> InvoiceTypes =
        new(StringComparer.Ordinal) { FbrInvoiceType.SaleInvoice, FbrInvoiceType.DebitNote };

    private static readonly HashSet<string> RegistrationTypes =
        new(StringComparer.Ordinal) { FbrRegistrationType.Registered, FbrRegistrationType.Unregistered };

    private static readonly SafeRegex NtnOrCnic = Js.Rx("^(?:[0-9]{7}|[0-9]{13})\\z");

    /// <summary>An FBR invoice number: the seller's NTN (7) or CNIC (13), "DI", 13 digits.</summary>
    private static readonly SafeRegex FbrInvoiceNumber = Js.Rx("^(?:[0-9]{7}|[0-9]{13})DI[0-9]{13}\\z");

    private static readonly SafeRegex Scenario = Js.Rx("^SN0(?:0[1-9]|1[0-9]|2[0-8])\\z");
    private static readonly SafeRegex PercentRate = Js.Rx("^([0-9]+(?:\\.[0-9]+)?)%\\z");
    private static readonly SafeRegex PerUnitRate = Js.Rx("^" + Js.Ci("rs") + "\\.?[" + Js.Ws + "]*([0-9]+(?:\\.[0-9]+)?)\\z");
    private static readonly SafeRegex DatePattern = Js.Rx("^([0-9]{4})-([0-9]{2})-([0-9]{2})\\z");

    private const string ThirdSchedule = "3rd schedule goods";
    private const string ReducedRate = "goods at reduced rate";

    private static readonly string[] NumberFields =
    [
        "quantity", "valueSalesExcludingST", "salesTaxApplicable", "salesTaxWithheldAtSource",
        "extraTax", "furtherTax", "fedPayable", "discount",
    ];

    /// <summary>Required amounts and their error code when missing.</summary>
    private static readonly (string Key, string? Code)[] RequiredNumbers =
    [
        ("quantity", "0098"),
        ("valueSalesExcludingST", "0021"),
        ("salesTaxApplicable", "0023"),
        ("salesTaxWithheldAtSource", "0024"),
        ("totalValues", null),
        ("fixedNotifiedValueOrRetailPrice", null),
    ];

    private static readonly string[] OptionalNumbers = ["extraTax", "furtherTax", "fedPayable", "discount"];

    /// <summary>
    /// The sales tax FBR expects on a line, in rupees, or <c>null</c> when the
    /// rate is not a plain percentage or per-unit amount (spec §7, errors
    /// 0102, 0104, 0105).
    /// </summary>
    /// <remarks>
    /// <c>N%</c> on Third Schedule goods: retail price × rate (0102);
    /// <c>N%</c> otherwise: value excluding sales tax × rate (0104);
    /// <c>Rs.N</c>: quantity × N (0105). Rounded half up to the paisa.
    /// <code>
    /// FbrInvoice.ExpectedSalesTax(JsonNode.Parse("""{"rate":"18%","valueSalesExcludingST":1000}""")); // 180
    /// </code>
    /// </remarks>
    /// <param name="item">One line of an invoice (a JSON object).</param>
    /// <returns>The tax, or <c>null</c>. Never throws.</returns>
    public static double? ExpectedSalesTax(JsonNode? item) =>
        AsObject(item) is { } obj ? Expected(obj) : null;

    /// <summary>
    /// Builds an FBR digital invoice from your own fields, working out
    /// <c>salesTaxApplicable</c> on each line where you leave it out (see
    /// <see cref="ExpectedSalesTax"/>; uses <see cref="SalesTax.Calculate"/>).
    /// </summary>
    /// <remarks>
    /// Lines with a rate that is neither <c>N%</c> nor <c>Rs.N</c>
    /// (<c>Exempt</c>, combined rates) get 0 unless you give the tax.
    /// <c>salesTaxWithheldAtSource</c>, <c>totalValues</c> and
    /// <c>fixedNotifiedValueOrRetailPrice</c> default to 0, and
    /// <c>invoiceRefNo</c> and <c>buyerNTNCNIC</c> to <c>""</c>, as in FBR's
    /// samples. Nothing else is filled in or changed (other keys are kept);
    /// check the result with <see cref="Validate(JsonNode?, string?)"/>. The
    /// input is not modified: the invoice is a new copy.
    /// </remarks>
    /// <param name="input">The invoice JSON, with an <c>items</c> array of objects.</param>
    /// <returns>
    /// The invoice and column totals, or <c>null</c> if <paramref name="input"/>
    /// is not an object with an <c>items</c> array of objects. Never throws.
    /// </returns>
    public static FbrInvoiceBuild? Build(JsonNode? input)
    {
        if (AsObject(input) is not { } source || AsArray(Get(source, "items")) is not { } rawItems) return null;
        var items = new List<JsonObject>();
        foreach (var raw in rawItems)
        {
            if (AsObject(Unwrap(raw)) is not { } line) return null;
            var item = Copy(line);
            foreach (var key in new[] { "totalValues", "fixedNotifiedValueOrRetailPrice", "salesTaxWithheldAtSource" })
            {
                if (Get(item, key) is null) item[key] = JsonValue.Create(0d);
            }
            if (Get(item, "salesTaxApplicable") is null)
            {
                item["salesTaxApplicable"] = JsonValue.Create(Expected(item) ?? 0d);
            }
            items.Add(item);
        }

        var invoice = Copy(source, skip: "items");
        if (Get(invoice, "buyerNTNCNIC") is null) invoice["buyerNTNCNIC"] = JsonValue.Create("");
        if (Get(invoice, "invoiceRefNo") is null) invoice["invoiceRefNo"] = JsonValue.Create("");
        invoice["items"] = new JsonArray(items.Select(i => (JsonNode?)i).ToArray());

        var totals = NumberFields.Select(key => ColumnTotal(items, key)).ToArray();
        return new FbrInvoiceBuild(
            invoice,
            new FbrInvoiceTotals(totals[0], totals[1], totals[2], totals[3], totals[4], totals[5], totals[6], totals[7]));
    }

    /// <summary>
    /// Checks an FBR digital invoice against the rules of PRAL's specification
    /// (v1.12) and Error Message Guide that need no call to FBR, and returns
    /// every problem with FBR's error code.
    /// </summary>
    /// <remarks>
    /// Checked: invoice type (0003, 0011), date format (0005, 0042, 0113) and,
    /// with <paramref name="today"/>, a future date (0043); seller and buyer
    /// NTN/CNIC (0401, 0402, 0009), self-invoicing (0058), names, provinces
    /// (0073, 0074), addresses, buyer registration type (0012), the reference
    /// number of a debit note (0026), the sandbox scenario, and on each line:
    /// HS code (0044), rate (0020), unit, sale type (0013), required and valid
    /// amounts (0021, 0023, 0024, 0098, 0300, 0302), SRO schedule and serial
    /// (0077, 0078), Third Schedule retail price (0090), extra tax on
    /// reduced-rate goods (0091) and the sales tax arithmetic (0102, 0104,
    /// 0105, to within one paisa).
    /// <para>
    /// Not checked, because they need FBR's data: registration status, whether
    /// a province, HS code, unit, rate, sale type or SRO is in FBR's lists or
    /// fits the others, and the original invoice of a debit note.
    /// </para>
    /// </remarks>
    /// <param name="invoice">The invoice JSON; any JSON is accepted.</param>
    /// <param name="today">Today as <c>YYYY-MM-DD</c>, to reject invoices dated later (0043). Not checked when <c>null</c> or invalid.</param>
    /// <returns><c>Valid</c> and the errors. Never throws.</returns>
    public static FbrInvoiceValidation Validate(JsonNode? invoice, string? today = null)
    {
        var errors = new List<FbrInvoiceError>();
        void Add(string? code, string field, string message) => errors.Add(new FbrInvoiceError(code, field, message));

        if (AsObject(invoice) is not { } inv)
        {
            Add(null, "invoice", "The invoice must be an object");
            return new FbrInvoiceValidation(false, errors);
        }

        // Invoice type
        var invoiceType = Text(Get(inv, "invoiceType"));
        if (!Filled(invoiceType)) Add("0011", "invoiceType", "Invoice type is empty");
        else if (!InvoiceTypes.Contains(invoiceType!))
        {
            Add("0003", "invoiceType", "Invoice type must be \"Sale Invoice\" or \"Debit Note\"");
        }

        // Date
        var invoiceDate = Text(Get(inv, "invoiceDate"));
        if (!Filled(invoiceDate)) Add("0042", "invoiceDate", "Invoice date is empty");
        else if (!DatePattern.IsMatch(invoiceDate!)) Add("0005", "invoiceDate", "Invoice date must be in YYYY-MM-DD format");
        else if (!ValidDate(invoiceDate!)) Add("0113", "invoiceDate", "Invoice date is not a valid date");
        else if (today is not null && ValidDate(today) && string.CompareOrdinal(invoiceDate, today) > 0)
        {
            Add("0043", "invoiceDate", "Invoice date is later than today");
        }

        // Seller
        var seller = Text(Get(inv, "sellerNTNCNIC"));
        if (seller is null || !NtnOrCnic.IsMatch(seller))
        {
            Add("0401", "sellerNTNCNIC", "Seller NTN or CNIC must be 7 or 13 digits");
        }
        if (!Filled(Text(Get(inv, "sellerBusinessName"))))
            Add(null, "sellerBusinessName", "Seller business name is required");
        if (!Filled(Text(Get(inv, "sellerProvince")))) Add("0073", "sellerProvince", "Seller province is empty");
        if (!Filled(Text(Get(inv, "sellerAddress")))) Add(null, "sellerAddress", "Seller address is required");

        // Buyer
        var registration = Text(Get(inv, "buyerRegistrationType"));
        if (registration is null || !RegistrationTypes.Contains(registration))
        {
            Add("0012", "buyerRegistrationType", "Buyer registration type must be \"Registered\" or \"Unregistered\"");
        }
        var buyerId = Text(Get(inv, "buyerNTNCNIC"));
        if (!Filled(buyerId))
        {
            if (registration != FbrRegistrationType.Unregistered)
                Add("0009", "buyerNTNCNIC", "Buyer NTN or CNIC is empty");
        }
        else if (!NtnOrCnic.IsMatch(buyerId!)) Add("0402", "buyerNTNCNIC", "Buyer NTN or CNIC must be 7 or 13 digits");
        else if (buyerId == seller)
        {
            Add("0058", "buyerNTNCNIC", "Buyer and seller must be different (self-invoicing is not allowed)");
        }
        if (!Filled(Text(Get(inv, "buyerBusinessName")))) Add("0010", "buyerBusinessName", "Buyer business name is empty");
        if (!Filled(Text(Get(inv, "buyerProvince")))) Add("0074", "buyerProvince", "Buyer province is empty");
        if (!Filled(Text(Get(inv, "buyerAddress")))) Add(null, "buyerAddress", "Buyer address is required");

        // Reference number and scenario
        var refNo = Text(Get(inv, "invoiceRefNo"));
        if (Filled(refNo))
        {
            if (!FbrInvoiceNumber.IsMatch(Js.Trim(refNo!)))
            {
                Add(null, "invoiceRefNo",
                    "Invoice reference number must be an FBR invoice number (NTN or CNIC, \"DI\", 13 digits)");
            }
        }
        else if (invoiceType == FbrInvoiceType.DebitNote)
        {
            Add("0026", "invoiceRefNo", "Invoice reference number is required for a debit note");
        }
        var scenario = Get(inv, "scenarioId");
        if (Present(scenario) && (Text(scenario) is not { } scenarioText || !Scenario.IsMatch(scenarioText)))
        {
            Add(null, "scenarioId", "Scenario ID must be SN001 to SN028");
        }

        // Items
        if (AsArray(Get(inv, "items")) is not { Count: > 0 } items)
        {
            Add(null, "items", "The invoice needs at least one item");
            return new FbrInvoiceValidation(errors.Count == 0, errors);
        }
        for (var index = 0; index < items.Count; index++)
        {
            if (AsObject(Unwrap(items[index])) is not { } item)
            {
                Add(null, $"items[{index}]", "Each item must be an object");
                continue;
            }
            ValidateItem(item, index, Add);
        }

        return new FbrInvoiceValidation(errors.Count == 0, errors);
    }

    /// <summary>
    /// Checks an FBR digital invoice given as a <see cref="JsonElement"/>; see
    /// <see cref="Validate(JsonNode?, string?)"/>. A key that appears twice
    /// counts once, with its last value, as in JavaScript's <c>JSON.parse</c>.
    /// </summary>
    /// <param name="invoice">The invoice JSON.</param>
    /// <param name="today">Today as <c>YYYY-MM-DD</c>, to reject invoices dated later (0043).</param>
    /// <returns><c>Valid</c> and the errors. Never throws.</returns>
    public static FbrInvoiceValidation Validate(JsonElement invoice, string? today = null) =>
        Validate(FromElement(invoice), today);

    private static void ValidateItem(JsonObject item, int index, Action<string?, string, string> add)
    {
        string At(string key) => $"items[{index}].{key}";

        if (!Filled(Text(Get(item, "hsCode")))) add("0044", At("hsCode"), "HS code is empty");
        if (Text(Get(item, "productDescription")) is null)
            add(null, At("productDescription"), "Product description is required");
        var rawRate = Text(Get(item, "rate"));
        if (!Filled(rawRate)) add("0020", At("rate"), "Rate is empty");
        if (!Filled(Text(Get(item, "uoM")))) add(null, At("uoM"), "Unit of measure is required");
        var rawSaleType = Text(Get(item, "saleType"));
        if (!Filled(rawSaleType)) add("0013", At("saleType"), "Sale type is empty");

        var numbersOk = new HashSet<string>(StringComparer.Ordinal);
        var keys = RequiredNumbers.Select(r => (r.Key, r.Code, Required: true))
            .Concat(OptionalNumbers.Select(k => (Key: k, Code: (string?)null, Required: false)));
        foreach (var (key, code, required) in keys)
        {
            var value = Get(item, key);
            if (value is null || (!required && Text(value) == ""))
            {
                if (required) add(code, At(key), $"{key} is required");
                continue;
            }
            if (!TryNumber(value, out var number) || !double.IsFinite(number) || number < 0)
            {
                add("0300", At(key), $"{key} must be a number, not negative");
                continue;
            }
            var limit = key == "quantity" ? 4 : 2;
            if (DecimalPlaces(number) > limit)
            {
                add("0302", At(key), $"{key} has more than {limit} decimal places");
                continue;
            }
            numbersOk.Add(key);
        }

        var rate = rawRate is null ? "" : Js.Trim(rawRate);
        if (Filled(rawRate) && rate != "18%" && !Filled(Text(Get(item, "sroScheduleNo"))))
        {
            add("0077", At("sroScheduleNo"), "SRO/schedule number is required when the rate is not 18%");
        }
        if (Filled(Text(Get(item, "sroScheduleNo"))) && !Filled(Text(Get(item, "sroItemSerialNo"))))
        {
            add("0078", At("sroItemSerialNo"), "Item serial number is required when an SRO/schedule number is given");
        }
        var saleType = rawSaleType is null ? "" : Normalize.Key(rawSaleType);
        if (saleType == ThirdSchedule
            && numbersOk.Contains("fixedNotifiedValueOrRetailPrice")
            && TryNumber(Get(item, "fixedNotifiedValueOrRetailPrice"), out var retail) && retail == 0)
        {
            add("0090", At("fixedNotifiedValueOrRetailPrice"), "Retail price is required for Third Schedule goods");
        }
        if (saleType == ReducedRate && Present(Get(item, "extraTax")))
        {
            add("0091", At("extraTax"), "Extra tax must be empty for goods at a reduced rate");
        }

        // Sales tax arithmetic
        if (!numbersOk.Contains("salesTaxApplicable")) return;
        var percent = PercentRate.IsMatch(rate);
        var perUnit = PerUnitRate.IsMatch(rate);
        var baseKey = perUnit
            ? "quantity"
            : saleType == ThirdSchedule ? "fixedNotifiedValueOrRetailPrice" : "valueSalesExcludingST";
        if (!(percent || perUnit) || !numbersOk.Contains(baseKey)) return;
        if (Expected(item) is not { } expected) return;
        TryNumber(Get(item, "salesTaxApplicable"), out var declared);
        var actual = Money.ToUnits(declared, 2);
        var wanted = Money.ToUnits(expected, 2);
        if (actual is { } a && wanted is { } w && Math.Abs(a - w) > 1)
        {
            var code = perUnit ? "0105" : saleType == ThirdSchedule ? "0102" : "0104";
            add(code, At("salesTaxApplicable"), $"Sales tax should be {Js.ToFixed(expected, 2)} for this rate");
        }
    }

    private static double? Expected(JsonObject item)
    {
        if (Text(Get(item, "rate")) is not { } rawRate) return null;
        var rate = Js.Trim(rawRate);
        var percent = PercentRate.Match(rate);
        if (percent.Success)
        {
            var saleType = Text(Get(item, "saleType")) is { } s ? Normalize.Key(s) : "";
            var baseKey = saleType == ThirdSchedule ? "fixedNotifiedValueOrRetailPrice" : "valueSalesExcludingST";
            if (!TryNumber(Get(item, baseKey), out var amount)) return null;
            return SalesTax.Calculate(amount, new SalesTaxOptions { Rate = ParseNumber(percent.Groups[1].Value) })?.Tax;
        }
        var perUnit = PerUnitRate.Match(rate);
        if (perUnit.Success)
        {
            if (!TryNumber(Get(item, "quantity"), out var quantity)) return null;
            var units = Money.ToUnits(quantity, 4);
            var price = Money.ToUnits(ParseNumber(perUnit.Groups[1].Value), 2);
            if (units is not { } q || price is not { } p) return null;
            // quantity (1e-4) × price (paisa) / 1e4, exactly; the product can exceed a long.
            var product = new BigInteger(q) * p;
            var quotient = BigInteger.DivRem(product, 10_000, out var remainder);
            if (remainder * 2 >= 10_000) quotient += 1;
            return (double)quotient / 100;
        }
        return null;
    }

    /// <summary>Adds up a column in paisa (quantity in ten-thousandths), as the npm package does.</summary>
    private static double ColumnTotal(List<JsonObject> items, string key)
    {
        var scale = key == "quantity" ? 4 : 2;
        double sum = 0;
        foreach (var item in items)
        {
            if (!TryNumber(Get(item, key), out var value)) continue;
            if (Money.ToUnits(value, scale) is { } units) sum += units;
        }
        return sum / (scale == 4 ? 10000 : 100);
    }

    /// <summary>Decimal places in a number's shortest round-trip form (finite, non-negative input).</summary>
    private static int DecimalPlaces(double value)
    {
        if (value == 0) return 0;
        var (digits, point) = Js.ShortestDigits(Math.Abs(value));
        return Math.Max(digits.Length - point, 0);
    }

    private static bool ValidDate(string text)
    {
        var match = DatePattern.Match(text);
        if (!match.Success) return false;
        var y = int.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture);
        var m = int.Parse(match.Groups[2].Value, CultureInfo.InvariantCulture);
        var d = int.Parse(match.Groups[3].Value, CultureInfo.InvariantCulture);
        var leap = (y % 4 == 0 && y % 100 != 0) || y % 400 == 0;
        int[] days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        return m >= 1 && m <= 12 && d >= 1 && d <= days[m - 1];
    }

    /// <summary><c>Number(text)</c> for ASCII digits with an optional fraction.</summary>
    private static double ParseNumber(string digits) =>
        double.Parse(digits, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture);

    // ------------------------------------------------------- JSON reading

    /// <summary>A string with something other than whitespace in it (JavaScript's <c>trim</c>).</summary>
    private static bool Filled(string? text) => text is not null && Js.Trim(text).Length > 0;

    /// <summary>Not <c>undefined</c>, <c>null</c> or <c>''</c>.</summary>
    private static bool Present(JsonNode? node) => node is not null && Text(node) != "";

    /// <summary>The property's value; <c>null</c> when missing or JSON <c>null</c>.</summary>
    private static JsonNode? Get(JsonObject obj, string key) =>
        obj.TryGetPropertyValue(key, out var value) ? Unwrap(value) : null;

    /// <summary>Treats a <see cref="JsonValue"/> that wraps a JSON <c>null</c> element as <c>null</c>.</summary>
    private static JsonNode? Unwrap(JsonNode? node) =>
        node is JsonValue value && value.TryGetValue(out JsonElement element)
            && element.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined
            ? null
            : node;

    /// <summary>
    /// The node as a readable object. A <see cref="JsonObject"/> parsed from
    /// JSON with a repeated key throws when first read; it is not an object here.
    /// </summary>
    private static JsonObject? AsObject(JsonNode? node)
    {
        if (Unwrap(node) is not JsonObject obj) return null;
        try
        {
            _ = obj.Count;
            return obj;
        }
        catch (ArgumentException)
        {
            return null;
        }
    }

    private static JsonArray? AsArray(JsonNode? node)
    {
        if (Unwrap(node) is not JsonArray array) return null;
        try
        {
            _ = array.Count;
            return array;
        }
        catch (ArgumentException)
        {
            return null;
        }
    }

    /// <summary>A copy that does not depend on the element's document; a repeated key keeps its last value.</summary>
    private static JsonNode? FromElement(JsonElement element)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                var obj = new JsonObject();
                foreach (var property in element.EnumerateObject()) obj[property.Name] = FromElement(property.Value);
                return obj;
            case JsonValueKind.Array:
                var array = new JsonArray();
                foreach (var entry in element.EnumerateArray()) array.Add(FromElement(entry));
                return array;
            case JsonValueKind.String:
                return JsonValue.Create(element.GetString());
            case JsonValueKind.True:
                return JsonValue.Create(true);
            case JsonValueKind.False:
                return JsonValue.Create(false);
            case JsonValueKind.Number:
                return JsonValue.Create(ElementNumber(element));
            default:
                return null;
        }
    }

    /// <summary>A JSON number as JavaScript reads it: <c>1e400</c> is infinity.</summary>
    private static double ElementNumber(JsonElement element) =>
        element.TryGetDouble(out var value)
            ? value
            : double.Parse(element.GetRawText(), NumberStyles.Float, CultureInfo.InvariantCulture);

    /// <summary>The node's string value, or <c>null</c> if it is not a string.</summary>
    private static string? Text(JsonNode? node)
    {
        if (node is not JsonValue value) return null;
        if (value.TryGetValue(out JsonElement element))
            return element.ValueKind == JsonValueKind.String ? element.GetString() : null;
        if (value.TryGetValue(out string? text)) return text;
        return value.TryGetValue(out char c) ? c.ToString() : null;
    }

    /// <summary>
    /// <c>typeof value === 'number'</c>: true for any JSON or .NET number,
    /// including NaN and infinities; false for strings and booleans.
    /// </summary>
    private static bool TryNumber(JsonNode? node, out double number)
    {
        number = 0;
        if (node is not JsonValue value) return false;
        if (value.TryGetValue(out JsonElement element))
        {
            if (element.ValueKind != JsonValueKind.Number) return false;
            number = ElementNumber(element);
            return true;
        }
        if (value.TryGetValue(out double d)) number = d;
        else if (value.TryGetValue(out float f)) number = f;
        else if (value.TryGetValue(out decimal m)) number = (double)m;
        else if (value.TryGetValue(out long l)) number = l;
        else if (value.TryGetValue(out int i)) number = i;
        else if (value.TryGetValue(out short s)) number = s;
        else if (value.TryGetValue(out sbyte sb)) number = sb;
        else if (value.TryGetValue(out ulong ul)) number = ul;
        else if (value.TryGetValue(out uint ui)) number = ui;
        else if (value.TryGetValue(out ushort us)) number = us;
        else if (value.TryGetValue(out byte b)) number = b;
        else if (value.TryGetValue(out Half h)) number = (double)h;
        else return false;
        return true;
    }

    /// <summary>A shallow copy with each value deep-cloned (so the input keeps its nodes).</summary>
    private static JsonObject Copy(JsonObject source, string? skip = null)
    {
        var copy = new JsonObject();
        foreach (var (key, value) in source)
        {
            copy[key] = key == skip ? null : Clone(value);
        }
        return copy;
    }

    private static JsonNode? Clone(JsonNode? node)
    {
        var unwrapped = Unwrap(node);
        if (unwrapped is JsonObject obj) return AsObject(obj) is { } readable ? Copy(readable) : null;
        if (unwrapped is JsonArray array)
        {
            var copy = new JsonArray();
            foreach (var entry in array) copy.Add(Clone(entry));
            return copy;
        }
        if (unwrapped is null) return null;
        if (TryNumber(unwrapped, out var number)) return JsonValue.Create(number);
        if (Text(unwrapped) is { } text) return JsonValue.Create(text);
        if (unwrapped is JsonValue value && value.TryGetValue(out bool flag)) return JsonValue.Create(flag);
        try
        {
            return unwrapped.DeepClone();
        }
        catch (Exception e) when (e is InvalidOperationException or NotSupportedException or JsonException)
        {
            return null;
        }
    }
}
