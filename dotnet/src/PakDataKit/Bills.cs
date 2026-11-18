using PakDataKit.Internal;

namespace PakDataKit;

/// <summary>Kind of electricity bill identifier.</summary>
public enum ElectricityRefType
{
    /// <summary>The 14-digit reference number on a DISCO (WAPDA) bill, optionally followed by <c>U</c> (urban) or <c>R</c> (rural).</summary>
    Reference,

    /// <summary>The customer ID on a DISCO bill: 10 digits, or 11 for LESCO.</summary>
    CustomerId,

    /// <summary>A 13-digit K-Electric account number (<c>04000…</c>).</summary>
    KElectric,
}

/// <summary>A gas company whose consumer number format is published.</summary>
public enum GasCompany
{
    /// <summary>Sui Northern Gas Pipelines Limited: 11-digit consumer numbers.</summary>
    Sngpl,

    /// <summary>Sui Southern Gas Company: 10-digit consumer numbers.</summary>
    Ssgc,
}

/// <summary>Result of <see cref="Bills.ParseElectricityRef"/>.</summary>
/// <param name="Type">Reference number, customer ID or K-Electric account number.</param>
/// <param name="Digits">The digits, without separators or the U/R letter.</param>
/// <param name="Formatted">
/// Display form: <c>01 14111 1234567 U</c> for a reference (2, 5 and 7 digits,
/// as on PITC's bill illustration), the digits for the others.
/// </param>
/// <param name="UrbanRural"><c>U</c> or <c>R</c> when given after a reference number, otherwise <c>null</c>.</param>
/// <param name="Disco">
/// The distribution company: <c>K-Electric</c> for a K-Electric account;
/// otherwise always <c>null</c>, because no official source maps reference or
/// customer ID digits to a DISCO.
/// </param>
public sealed record ElectricityRef(
    ElectricityRefType Type,
    string Digits,
    string Formatted,
    string? UrbanRural,
    string? Disco);

/// <summary>Electricity and gas bill identifiers (format checks only; no utility publishes a check digit).</summary>
public static class Bills
{
    /// <summary>Separators people type inside bill numbers.</summary>
    private static readonly SafeRegex Separators = Js.Rx("[" + Js.Ws + @"\-‐‑‒–—./]");
    private static readonly SafeRegex ReferenceWithLetter = Js.Rx("^([0-9]{14})([UR])\\z");
    private static readonly SafeRegex AllDigits = Js.Rx("^[0-9]+\\z");

    /// <summary>
    /// Parses a Pakistani electricity bill identifier: a DISCO reference number,
    /// a DISCO customer ID or a K-Electric account number.
    /// </summary>
    /// <remarks>
    /// Formats are those the utilities' own bill pages ask for (retrieved
    /// 2026-11-18; see DATA.md): PITC's bill pages take a 14-digit reference
    /// number with a separate U/R choice, or a 10-digit customer ID (11 digits
    /// for LESCO); K-Electric asks for a 13-digit account number starting
    /// <c>04000</c>. No check digit is published, so only the format is checked.
    /// Spaces, dashes and dots are ignored, and Urdu digits are accepted.
    /// <code>
    /// Bills.ParseElectricityRef("02-12624-0045901 R");
    /// // Type = Reference, Digits = 02126240045901, Formatted = 02 12624 0045901 R, UrbanRural = R, Disco = null
    /// </code>
    /// </remarks>
    /// <param name="input">The identifier as typed.</param>
    /// <returns>The identifier, or <c>null</c> if it matches none of the formats. Never throws.</returns>
    public static ElectricityRef? ParseElectricityRef(string? input)
    {
        if (input is null) return null;
        var text = Js.ToUpper(Clean(input));
        string? urbanRural = null;
        var letter = ReferenceWithLetter.Match(text);
        if (letter.Success)
        {
            text = letter.Groups[1].Value;
            urbanRural = letter.Groups[2].Value;
        }
        if (!AllDigits.IsMatch(text)) return null;

        if (text.Length == 14)
        {
            var formatted = $"{text[..2]} {text[2..7]} {text[7..]}";
            return new ElectricityRef(
                ElectricityRefType.Reference,
                text,
                urbanRural is null ? formatted : $"{formatted} {urbanRural}",
                urbanRural,
                null);
        }
        if (urbanRural is not null) return null;
        if (text.Length == 13 && text.StartsWith("04000", StringComparison.Ordinal))
        {
            return new ElectricityRef(ElectricityRefType.KElectric, text, text, null, "K-Electric");
        }
        if (text.Length is 10 or 11)
        {
            return new ElectricityRef(ElectricityRefType.CustomerId, text, text, null, null);
        }
        return null;
    }

    /// <summary>Validates a Pakistani electricity bill identifier. See <see cref="ParseElectricityRef"/>.</summary>
    /// <param name="input">The identifier as typed.</param>
    /// <returns><c>true</c> if it matches one of the formats. Never throws.</returns>
    public static bool ValidateElectricityRef(string? input) => ParseElectricityRef(input) is not null;

    /// <summary>
    /// Validates a gas bill consumer number: 11 digits for SNGPL, 10 digits for
    /// SSGC, as their bill pages ask for (retrieved 2026-11-18; see DATA.md).
    /// No check digit is published, so only the format is checked. Spaces,
    /// dashes and dots are ignored, and Urdu digits are accepted.
    /// </summary>
    /// <remarks>
    /// <code>
    /// Bills.ValidateGasConsumerNumber("12345678901", GasCompany.Sngpl); // true
    /// Bills.ValidateGasConsumerNumber("1234567890", GasCompany.Ssgc);   // true
    /// </code>
    /// </remarks>
    /// <param name="input">The consumer number as typed.</param>
    /// <param name="company">The gas company; an undefined enum value returns <c>false</c>.</param>
    /// <returns><c>true</c> if the format is valid. Never throws.</returns>
    public static bool ValidateGasConsumerNumber(string? input, GasCompany company)
    {
        if (input is null) return false;
        var digits = company switch
        {
            GasCompany.Sngpl => 11,
            GasCompany.Ssgc => 10,
            _ => 0,
        };
        if (digits == 0) return false;
        var text = Clean(input);
        return text.Length == digits && AllDigits.IsMatch(text);
    }

    private static string Clean(string input) => Separators.Replace(Normalize.ToAsciiDigits(input), "");
}
