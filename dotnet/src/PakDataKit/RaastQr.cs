using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using PakDataKit.Internal;

namespace PakDataKit;

/// <summary>A parsed EMV field of a QR payload.</summary>
/// <param name="Id">2-digit field ID.</param>
/// <param name="Value">Field value.</param>
/// <param name="Children">Sub-fields, for template fields; otherwise <c>null</c>.</param>
public sealed record EmvField(string Id, string Value, IReadOnlyList<EmvField>? Children = null);

/// <summary>Kind of Pakistani payment QR code.</summary>
public enum RaastQrKind
{
    /// <summary>Person-to-person QR code (SBP format <c>02</c>).</summary>
    P2p,

    /// <summary>EMVCo merchant QR code (format <c>01</c>).</summary>
    Merchant,
}

/// <summary>Reason a Raast QR code cannot be paid.</summary>
public enum RaastQrError
{
    /// <summary>Not a well-formed Pakistani payment QR code.</summary>
    NotARaastQr,

    /// <summary>The CRC checksum does not match.</summary>
    BadChecksum,

    /// <summary>The QR code carries no IBAN.</summary>
    NoIban,

    /// <summary>The IBAN is not a valid Pakistani IBAN.</summary>
    InvalidIban,

    /// <summary>The QR code has expired.</summary>
    Expired,

    /// <summary>A fixed-amount QR code without an expiry.</summary>
    MissingExpiry,
}

/// <summary>Something worth showing the user about a payable Raast QR code.</summary>
public enum RaastQrWarning
{
    /// <summary>A static QR code carries an amount, which apps ignore.</summary>
    AmountIgnored,

    /// <summary>The QR code expires soon.</summary>
    ExpiresSoon,
}

/// <summary>Options for <see cref="RaastQr.CreateP2P"/>.</summary>
public sealed record RaastP2POptions
{
    /// <summary>The payee's Pakistani IBAN.</summary>
    public required string Iban { get; init; }

    /// <summary>Fixed amount in rupees. A QR with an amount is dynamic and needs an expiry.</summary>
    public double? Amount { get; init; }

    /// <summary>Expiry of a dynamic QR, as local time.</summary>
    public DateTime? ExpiresAt { get; init; }

    /// <summary>
    /// Expiry as a duration from <see cref="Now"/>, such as <c>30m</c>,
    /// <c>12h</c> or <c>7d</c>. Use this or <see cref="ExpiresAt"/>, not both.
    /// </summary>
    public string? ExpiresIn { get; init; }

    /// <summary>
    /// Expiry as milliseconds from <see cref="Now"/>. Use this,
    /// <see cref="ExpiresIn"/> or <see cref="ExpiresAt"/>, not more than one.
    /// </summary>
    public double? ExpiresInMilliseconds { get; init; }

    /// <summary>Bank name, at most 25 characters.</summary>
    public string? BankName { get; init; }

    /// <summary>Payment description, at most 30 characters.</summary>
    public string? Particulars { get; init; }

    /// <summary>
    /// Scheme identifier. Defaults to <c>00</c>, which banking apps generate;
    /// the Easypaisa and JazzCash apps reject SBP's listed <c>30</c>.
    /// </summary>
    public string? Scheme { get; init; }

    /// <summary>The time durations are counted from. Defaults to the current local time.</summary>
    public DateTime? Now { get; init; }
}

/// <summary>Account details for a merchant QR, as issued by the merchant's bank.</summary>
/// <param name="Fields">Sub-fields of the template, keyed by 2-digit ID.</param>
/// <param name="Tag">Template tag, 26 to 51. SBP reserves 28–30 for Raast. Defaults to <c>28</c>.</param>
public sealed record MerchantAccountInfo(IReadOnlyDictionary<string, string> Fields, string? Tag = null);

/// <summary>Options for <see cref="RaastQr.CreateMerchant"/>.</summary>
public sealed record MerchantQrOptions
{
    /// <summary>The merchant account template from the merchant's bank.</summary>
    public required MerchantAccountInfo MerchantAccount { get; init; }

    /// <summary>Merchant name, at most 25 characters.</summary>
    public required string MerchantName { get; init; }

    /// <summary>Merchant city, at most 15 characters.</summary>
    public required string City { get; init; }

    /// <summary>4-digit merchant category code. Defaults to <c>0000</c>.</summary>
    public string? Mcc { get; init; }

    /// <summary>Fixed amount in rupees.</summary>
    public double? Amount { get; init; }

    /// <summary>Whether the QR is dynamic. Defaults to <c>true</c> when an amount is given.</summary>
    public bool? Dynamic { get; init; }

    /// <summary>Bill number, at most 25 characters.</summary>
    public string? BillNumber { get; init; }

    /// <summary>Mobile number, at most 15 characters.</summary>
    public string? MobileNumber { get; init; }

    /// <summary>Reference, at most 25 characters.</summary>
    public string? Reference { get; init; }

    /// <summary>Due date of a bill; used together with <see cref="AmountAfterDueDate"/>.</summary>
    public DateOnly? DueDate { get; init; }

    /// <summary>Amount payable after the due date; used together with <see cref="DueDate"/>.</summary>
    public double? AmountAfterDueDate { get; init; }
}

/// <summary>Result of <see cref="RaastQr.Parse"/>.</summary>
public sealed record ParsedRaastQr
{
    /// <summary>Person-to-person or merchant QR code.</summary>
    public required RaastQrKind Kind { get; init; }

    /// <summary>Whether the QR carries a fixed amount (point of initiation 12).</summary>
    public required bool Dynamic { get; init; }

    /// <summary>Whether the CRC checksum matches.</summary>
    public required bool CrcValid { get; init; }

    /// <summary>The payee's IBAN, if present.</summary>
    public string? Iban { get; init; }

    /// <summary>Whether <see cref="Iban"/> is a valid Pakistani IBAN.</summary>
    public required bool IbanValid { get; init; }

    /// <summary>Amount in rupees, if present.</summary>
    public double? Amount { get; init; }

    /// <summary>P2P: expiry of a dynamic QR as local <c>YYYY-MM-DDTHH:mm</c>.</summary>
    public string? ExpiresAt { get; init; }

    /// <summary>P2P: bank name.</summary>
    public string? BankName { get; init; }

    /// <summary>P2P: payment description.</summary>
    public string? Particulars { get; init; }

    /// <summary>Merchant: merchant name.</summary>
    public string? MerchantName { get; init; }

    /// <summary>Merchant: city.</summary>
    public string? City { get; init; }

    /// <summary>Merchant: 4-digit category code.</summary>
    public string? Mcc { get; init; }

    /// <summary>Bill number, if present.</summary>
    public string? BillNumber { get; init; }

    /// <summary>Due date as <c>YYYY-MM-DD</c>, if present.</summary>
    public string? DueDate { get; init; }

    /// <summary>Amount payable after the due date, if present.</summary>
    public double? AmountAfterDueDate { get; init; }

    /// <summary>All top-level fields, with template fields parsed into <see cref="EmvField.Children"/>.</summary>
    public required IReadOnlyList<EmvField> Fields { get; init; }
}

/// <summary>Result of <see cref="RaastQr.Validate"/>.</summary>
/// <param name="Valid"><c>true</c> when there are no errors.</param>
/// <param name="Errors">Reasons the QR cannot be paid.</param>
/// <param name="Warnings">Things worth showing the user.</param>
/// <param name="Qr">The parsed QR, or <c>null</c> if it could not be read.</param>
public sealed record RaastQrValidation(
    bool Valid, IReadOnlyList<RaastQrError> Errors, IReadOnlyList<RaastQrWarning> Warnings, ParsedRaastQr? Qr);

/// <summary>
/// Raast QR codes: SBP person-to-person and EMVCo merchant QR payloads, per
/// SBP's "Standard for Interoperable QR Code for Person-to-Person and
/// Merchant Payments" v1.0. Encode the returned string with any QR library.
/// </summary>
public static class RaastQr
{
    private const string DefaultP2PScheme = "00";

    private static readonly Regex PkIban = Js.Rx("^PK[0-9]{2}[A-Z]{4}[A-Z0-9]{16}\\z");
    private static readonly Regex PlainAmount = Js.Rx("^[0-9]+(?:\\.[0-9]+)?\\z");
    private static readonly Regex MerchantAmount = Js.Rx("^[0-9]+\\.[0-9]{2}\\z");
    private static readonly Regex Expiry = Js.Rx("^([0-9]{2})([0-9]{2})([0-9]{4})([0-9]{2})([0-9]{2})\\z");
    private static readonly Regex Duration = Js.Rx("^([0-9]+(?:\\.[0-9]+)?)([mhd])\\z");
    private static readonly Regex Tag = Js.Rx("^(?:2[6-9]|[34][0-9]|5[01])\\z");
    private static readonly Regex FourDigits = Js.Rx("^[0-9]{4}\\z");
    private static readonly Regex TwoDigits = Js.Rx("^[0-9]{2}\\z");
    private static readonly Regex EightDigits = Js.Rx("^[0-9]{8}\\z");

    /// <summary>
    /// Creates a Raast person-to-person QR payload (SBP P2P format <c>02</c>).
    /// It matches the QR codes banking apps generate, so Easypaisa, JazzCash
    /// and other apps can scan it. A QR with an amount is dynamic and needs
    /// an expiry.
    /// </summary>
    /// <param name="options">IBAN, and optionally amount, expiry and labels.</param>
    /// <returns>The QR payload.</returns>
    /// <exception cref="ArgumentException">
    /// The IBAN is invalid, a field is too long, or an amount is given without an expiry.
    /// </exception>
    public static string CreateP2P(RaastP2POptions options)
    {
        ArgumentNullException.ThrowIfNull(options);
        var (expiry, expiryInvalid) = ResolveExpiry(options);
        var iban = NormalizeIban(options.Iban);

        var payload = new StringBuilder()
            .Append(EncodeField("00", "02"))
            .Append(EncodeField("01", options.Amount is null ? "11" : "12"))
            .Append(EncodeField("02", options.Scheme ?? DefaultP2PScheme));
        if (!string.IsNullOrEmpty(options.BankName))
            payload.Append(EncodeField("03", CheckLength(options.BankName, 25, "BankName")));
        payload.Append(EncodeField("04", iban));
        if (options.Amount is { } amount) payload.Append(EncodeField("05", FormatP2PAmount(amount)));
        if (!string.IsNullOrEmpty(options.Particulars))
            payload.Append(EncodeField("06", CheckLength(options.Particulars, 30, "Particulars")));
        if (options.Amount is not null)
        {
            if (expiryInvalid) throw new ArgumentException("ExpiresAt is invalid");
            if (expiry is not { } at)
                throw new ArgumentException("A QR with an amount needs ExpiresAt or ExpiresIn");
            payload.Append(EncodeField("07", string.Create(
                CultureInfo.InvariantCulture, $"{at.Day:D2}{at.Month:D2}{at.Year:D4}{at.Hour:D2}{at.Minute:D2}")));
        }

        var data = payload.Append("1004").ToString();
        return data + Crc16(data);
    }

    /// <summary>Creates an EMVCo merchant-presented QR payload per SBP's Pakistan QR standard.</summary>
    /// <param name="options">Merchant account, name, city and optional bill details.</param>
    /// <returns>The QR payload.</returns>
    /// <exception cref="ArgumentException">A field is missing, too long, or out of range.</exception>
    public static string CreateMerchant(MerchantQrOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);
        ArgumentNullException.ThrowIfNull(options.MerchantAccount);
        var tag = options.MerchantAccount.Tag ?? "28";
        if (!Tag.IsMatch(tag)) throw new ArgumentException("MerchantAccount.Tag must be between 26 and 51");
        var accountFields = (options.MerchantAccount.Fields ?? new Dictionary<string, string>()).ToList();
        if (accountFields.Count == 0) throw new ArgumentException("MerchantAccount.Fields must not be empty");
        var mcc = options.Mcc ?? "0000";
        if (!FourDigits.IsMatch(mcc)) throw new ArgumentException("Mcc must be 4 digits");
        if ((options.DueDate is null) != (options.AmountAfterDueDate is null))
            throw new ArgumentException("DueDate and AmountAfterDueDate must be used together");
        var isDynamic = options.Dynamic ?? options.Amount is not null;

        foreach (var (id, _) in accountFields)
        {
            if (id is null || !TwoDigits.IsMatch(id))
                throw new ArgumentException($"Invalid merchant account sub-field ID: {id}");
        }

        // Sub-fields are written in ID order (00, 01, ... 10 ...).
        var account = string.Concat(accountFields
            .OrderBy(f => int.Parse(f.Key, NumberStyles.None, CultureInfo.InvariantCulture))
            .Select(f => EncodeField(f.Key, f.Value ?? throw new ArgumentException("Sub-field value is null"))));

        var payload = new StringBuilder()
            .Append(EncodeField("00", "01"))
            .Append(EncodeField("01", isDynamic ? "12" : "11"))
            .Append(EncodeField(tag, account))
            .Append(EncodeField("52", mcc))
            .Append(EncodeField("53", "586"));
        if (options.Amount is { } amount) payload.Append(EncodeField("54", FormatAmount(amount, 13, "Amount")));
        payload
            .Append(EncodeField("58", "PK"))
            .Append(EncodeField("59", CheckLength(RequireText(options.MerchantName, "MerchantName"), 25, "MerchantName")))
            .Append(EncodeField("60", CheckLength(RequireText(options.City, "City"), 15, "City")));

        var additional = new StringBuilder();
        if (!string.IsNullOrEmpty(options.BillNumber))
            additional.Append(EncodeField("01", CheckLength(options.BillNumber, 25, "BillNumber")));
        if (!string.IsNullOrEmpty(options.MobileNumber))
            additional.Append(EncodeField("02", CheckLength(options.MobileNumber, 15, "MobileNumber")));
        if (!string.IsNullOrEmpty(options.Reference))
            additional.Append(EncodeField("05", CheckLength(options.Reference, 25, "Reference")));
        if (options.DueDate is { } due && options.AmountAfterDueDate is { } after)
        {
            additional
                .Append(EncodeField("50", string.Create(
                    CultureInfo.InvariantCulture, $"{due.Day:D2}{due.Month:D2}{due.Year:D4}")))
                .Append(EncodeField("51", FormatAmount(after, 13, "AmountAfterDueDate")));
        }
        if (additional.Length > 0) payload.Append(EncodeField("62", additional.ToString()));

        var data = payload.Append("6304").ToString();
        var result = data + Crc16(data);
        if (Js.CodePointCount(result) > 512) throw new ArgumentException("QR payload exceeds 512 characters");
        return result;
    }

    /// <summary>
    /// Parses a Raast QR payload (P2P format <c>02</c> or EMVCo merchant
    /// format <c>01</c>) and verifies its CRC.
    /// </summary>
    /// <param name="payload">Text decoded from the QR code.</param>
    /// <returns>The parsed QR, or <c>null</c> if it is not a well-formed Pakistani QR code.</returns>
    public static ParsedRaastQr? Parse(string payload)
    {
        ArgumentNullException.ThrowIfNull(payload);
        var text = Js.Trim(payload);
        var fields = ParseFields(text, nested: true);
        if (fields is null) return null;

        var format = FieldValue(fields, "00");
        RaastQrKind kind;
        if (format == "02") kind = RaastQrKind.P2p;
        else if (format == "01") kind = RaastQrKind.Merchant;
        else return null;
        var p2p = kind == RaastQrKind.P2p;

        var crcId = p2p ? "10" : "63";
        var last = fields.Count > 0 ? fields[^1] : null;
        var crcValid = last is not null && last.Id == crcId && last.Value.Length == 4
            && Crc16(text[..Math.Max(0, text.Length - 4)]) == Js.ToUpper(last.Value);

        string? iban = null;
        if (p2p) iban = FieldValue(fields, "04");
        else
        {
            foreach (var field in fields)
            {
                var id = int.Parse(field.Id, NumberStyles.None, CultureInfo.InvariantCulture);
                if (id is < 26 or > 51) continue;
                var match = field.Children?.FirstOrDefault(c => PkIban.IsMatch(c.Value));
                if (match is null) continue;
                iban = match.Value;
                break;
            }
        }

        var additional = fields.FirstOrDefault(f => f.Id == "62")?.Children ?? [];
        var due = FieldValue(additional, "50");

        return new ParsedRaastQr
        {
            Kind = kind,
            Dynamic = FieldValue(fields, "01") == "12",
            CrcValid = crcValid,
            Iban = iban,
            IbanValid = iban is not null && Iban.Validate(iban),
            Amount = ToAmount(FieldValue(fields, p2p ? "05" : "54")),
            ExpiresAt = ParseExpiry(p2p ? FieldValue(fields, "07") : null),
            BankName = p2p ? FieldValue(fields, "03") : null,
            Particulars = p2p ? FieldValue(fields, "06") : null,
            MerchantName = p2p ? null : FieldValue(fields, "59"),
            City = p2p ? null : FieldValue(fields, "60"),
            Mcc = p2p ? null : FieldValue(fields, "52"),
            BillNumber = FieldValue(additional, "01"),
            DueDate = !string.IsNullOrEmpty(due) && EightDigits.IsMatch(due)
                ? $"{due[4..]}-{due[2..4]}-{due[..2]}"
                : null,
            AmountAfterDueDate = ToAmount(FieldValue(additional, "51")),
            Fields = fields,
        };
    }

    /// <summary>
    /// Checks whether a Raast QR code can be paid. Errors: not a Pakistani
    /// payment QR, checksum mismatch, no IBAN or an invalid IBAN, expired, or
    /// a fixed-amount QR without an expiry. Warnings: an amount in a static
    /// QR (apps ignore it), or a QR that expires soon.
    /// </summary>
    /// <param name="payload">Text decoded from the QR code.</param>
    /// <param name="now">The time to check the expiry against. Defaults to the current local time.</param>
    /// <param name="expiresSoonMs">How close to expiry counts as "soon", in milliseconds. Defaults to one hour.</param>
    /// <returns>Whether the QR is valid, with its errors, warnings and parsed form.</returns>
    public static RaastQrValidation Validate(string payload, DateTime? now = null, double expiresSoonMs = 3_600_000)
    {
        var qr = Parse(payload);
        if (qr is null) return new RaastQrValidation(false, [RaastQrError.NotARaastQr], [], null);

        var errors = new List<RaastQrError>();
        var warnings = new List<RaastQrWarning>();
        var current = now ?? DateTime.Now;

        if (!qr.CrcValid) errors.Add(RaastQrError.BadChecksum);
        if (qr.Iban is null) errors.Add(RaastQrError.NoIban);
        else if (!qr.IbanValid) errors.Add(RaastQrError.InvalidIban);

        if (qr.Kind == RaastQrKind.P2p)
        {
            if (qr.Dynamic && qr.ExpiresAt is null) errors.Add(RaastQrError.MissingExpiry);
            if (!qr.Dynamic && qr.Amount is not null) warnings.Add(RaastQrWarning.AmountIgnored);
            if (qr.ExpiresAt is not null)
            {
                var expiry = LocalDateTime(qr.ExpiresAt);
                var remaining = expiry is { } at ? (at - current).TotalMilliseconds : double.PositiveInfinity;
                if (remaining <= 0) errors.Add(RaastQrError.Expired);
                else if (remaining <= expiresSoonMs) warnings.Add(RaastQrWarning.ExpiresSoon);
            }
        }

        return new RaastQrValidation(errors.Count == 0, errors, warnings, qr);
    }

    // ------------------------------------------------------------------ EMV

    private static bool IsTemplateId(string id)
    {
        var n = int.Parse(id, NumberStyles.None, CultureInfo.InvariantCulture);
        return n is (>= 26 and <= 51) or 62 or 64 or (>= 80 and <= 99);
    }

    /// <summary>CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), as 4 uppercase hex digits.</summary>
    private static string Crc16(string text)
    {
        var crc = 0xFFFF;
        foreach (var b in Js.Utf8Bytes(text))
        {
            crc ^= b << 8;
            for (var i = 0; i < 8; i++)
                crc = (crc & 0x8000) != 0 ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
        }
        return crc.ToString("X4", CultureInfo.InvariantCulture);
    }

    /// <summary>Encodes one field. Length counts characters, as the EMV spec requires.</summary>
    private static string EncodeField(string id, string value)
    {
        var length = Js.CodePointCount(value);
        if (length > 99) throw new ArgumentException($"EMV field {id} is longer than 99 characters");
        return string.Create(CultureInfo.InvariantCulture, $"{id}{length:D2}{value}");
    }

    /// <summary>Parses EMV fields, or returns <c>null</c> if the data is malformed.</summary>
    private static List<EmvField>? ParseFields(string data, bool nested)
    {
        var chars = Js.CodePoints(data);
        var fields = new List<EmvField>();
        var i = 0;
        while (i < chars.Count)
        {
            if (i + 4 > chars.Count) return null;
            var header = string.Concat(chars.GetRange(i, 4));
            if (header.Length != 4 || !FourDigits.IsMatch(header)) return null;
            var id = header[..2];
            var length = int.Parse(header.AsSpan(2), NumberStyles.None, CultureInfo.InvariantCulture);
            if (i + 4 + length > chars.Count) return null;
            var value = string.Concat(chars.GetRange(i + 4, length));
            List<EmvField>? children = null;
            if (nested && IsTemplateId(id))
            {
                children = ParseFields(value, nested: false);
                if (children is null) return null;
            }
            fields.Add(new EmvField(id, value, children));
            i += 4 + length;
        }
        return fields;
    }

    // ------------------------------------------------------------- helpers

    private static (DateTime? Expiry, bool Invalid) ResolveExpiry(RaastP2POptions options)
    {
        var hasDuration = options.ExpiresIn is not null || options.ExpiresInMilliseconds is not null;
        if (options.ExpiresAt is not null && hasDuration)
            throw new ArgumentException("Use either ExpiresAt or ExpiresIn, not both");
        if (options.ExpiresIn is not null && options.ExpiresInMilliseconds is not null)
            throw new ArgumentException("Use either ExpiresIn or ExpiresInMilliseconds, not both");
        if (!hasDuration) return (options.ExpiresAt, false);

        double ms;
        if (options.ExpiresIn is { } text)
        {
            var match = Duration.Match(text);
            if (!match.Success)
                throw new ArgumentException(
                    $"ExpiresIn must be like '30m', '12h' or '7d', received {text}");
            var unit = match.Groups[2].Value switch { "m" => 60_000d, "h" => 3_600_000d, _ => 86_400_000d };
            ms = double.Parse(match.Groups[1].Value, NumberStyles.Float, CultureInfo.InvariantCulture) * unit;
        }
        else ms = options.ExpiresInMilliseconds!.Value;

        if (!double.IsFinite(ms) || ms <= 0) throw new ArgumentException("ExpiresIn must be a positive duration");
        var start = options.Now ?? DateTime.Now;
        try
        {
            // JavaScript Dates have millisecond precision.
            return (start.AddMilliseconds(Math.Truncate(ms)), false);
        }
        catch (ArgumentOutOfRangeException)
        {
            return (null, true);
        }
    }

    private static string FormatAmount(double amount, int maxLength, string label)
    {
        if (!double.IsFinite(amount) || amount <= 0) throw new ArgumentException($"{label} must be a positive number");
        var text = Js.ToFixed(amount, 2);
        if (text.Length > maxLength || !MerchantAmount.IsMatch(text))
            throw new ArgumentException($"{label} is too large for a Raast QR code");
        return text;
    }

    /// <summary>Whole rupees as <c>1500</c> (as banking apps write them), otherwise <c>1500.50</c>.</summary>
    private static string FormatP2PAmount(double amount)
    {
        if (!double.IsFinite(amount) || amount <= 0) throw new ArgumentException("Amount must be a positive number");
        var text = Math.Floor(amount) == amount ? Js.NumberToString(amount) : Js.ToFixed(amount, 2);
        // Very large numbers stringify in exponent form ("1e+21"), so check the shape too.
        if (text.Length > 10 || !PlainAmount.IsMatch(text))
            throw new ArgumentException("Amount is too large for a Raast QR code");
        return text;
    }

    private static string RequireText(string? value, string label) =>
        value ?? throw new ArgumentException($"{label} is required");

    private static string CheckLength(string value, int maximum, string label)
    {
        if (Js.CodePointCount(value) > maximum)
            throw new ArgumentException($"{label} must be at most {maximum} characters");
        return value;
    }

    private static string NormalizeIban(string? iban)
    {
        if (iban is null) throw new ArgumentException("Iban is required");
        var normalized = Iban.NormalizeIban(iban);
        if (!Iban.Validate(normalized)) throw new ArgumentException($"Invalid Pakistani IBAN: {iban}");
        return normalized;
    }

    private static string? FieldValue(IReadOnlyList<EmvField> fields, string id) =>
        fields.FirstOrDefault(f => f.Id == id)?.Value;

    /// <summary>Reads an amount field: plain digits with optional decimals, else <c>null</c>.</summary>
    private static double? ToAmount(string? value) =>
        value is not null && PlainAmount.IsMatch(value)
            ? double.Parse(value, NumberStyles.Float, CultureInfo.InvariantCulture)
            : null;

    /// <summary>
    /// Reads <c>DDMMYYYYhhmm</c> as <c>YYYY-MM-DDTHH:mm</c>, or <c>null</c>
    /// unless it is a real date and time.
    /// </summary>
    private static string? ParseExpiry(string? value)
    {
        if (string.IsNullOrEmpty(value)) return null;
        var match = Expiry.Match(value);
        if (!match.Success) return null;
        var g = match.Groups;
        int Num(int i) => int.Parse(g[i].Value, NumberStyles.None, CultureInfo.InvariantCulture);
        int day = Num(1), month = Num(2), year = Num(3), hour = Num(4), minute = Num(5);
        if (month is < 1 or > 12 || hour > 23 || minute > 59) return null;
        var leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
        int[] daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (day < 1 || day > daysInMonth[month - 1]) return null;
        return $"{g[3].Value}-{g[2].Value}-{g[1].Value}T{g[4].Value}:{g[5].Value}";
    }

    /// <summary><c>new Date(year, month - 1, day, hour, minute)</c>, where years 0–99 mean 1900–1999.</summary>
    private static DateTime? LocalDateTime(string value)
    {
        int Num(int start, int length) =>
            int.Parse(value.AsSpan(start, length), NumberStyles.None, CultureInfo.InvariantCulture);
        var year = Num(0, 4);
        if (year is >= 0 and <= 99) year += 1900;
        try
        {
            // A day past the end of the month rolls into the next, as in JavaScript.
            return new DateTime(year, Num(5, 2), 1, 0, 0, 0, DateTimeKind.Unspecified)
                .AddDays(Num(8, 2) - 1).AddHours(Num(11, 2)).AddMinutes(Num(14, 2));
        }
        catch (ArgumentOutOfRangeException)
        {
            return null;
        }
    }
}
