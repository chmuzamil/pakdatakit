using System.Text.RegularExpressions;
using PakDataKit.Internal;

namespace PakDataKit;

/// <summary>Kind of taxpayer an NTN belongs to.</summary>
public enum NtnType
{
    /// <summary>An individual, whose NTN is their 13-digit CNIC.</summary>
    Individual,

    /// <summary>A company or association of persons, with a 7-digit NTN.</summary>
    Business,
}

/// <summary>Result of <see cref="Tax.AnalyzeNtn"/>.</summary>
/// <param name="Type">Individual (a CNIC) or business (7-digit NTN).</param>
/// <param name="Digits">Digits without separators (7, 8 or 13 digits).</param>
/// <param name="Formatted"><c>1234567-8</c> for business NTNs with a check digit, <c>#####-#######-#</c> for CNICs.</param>
public sealed record NtnInfo(NtnType Type, string Digits, string Formatted);

/// <summary>National Tax Number (NTN) and Sales Tax Registration Number (STRN) checks.</summary>
public static class Tax
{
    private static readonly Regex BusinessNtn = Js.Rx("^([0-9]{7})(?:[-‐‑‒–— ]?([0-9]))?\\z");
    private static readonly Regex Strn = Js.Rx("^[0-9]{13}\\z");

    /// <summary>
    /// Analyzes a National Tax Number: a 13-digit CNIC for individuals, or 7
    /// digits (optionally followed by a check digit) for businesses. FBR does
    /// not publish a check-digit algorithm, so this checks the format only.
    /// </summary>
    /// <param name="ntn">NTN in any common format.</param>
    /// <returns>The details, or <c>null</c> if the format is invalid.</returns>
    public static NtnInfo? AnalyzeNtn(string ntn)
    {
        ArgumentNullException.ThrowIfNull(ntn);
        var trimmed = Normalize.ToAsciiDigits(Js.Trim(ntn));
        if (Cnic.Validate(trimmed))
        {
            var digits = Normalize.StripSeparators(trimmed);
            return new NtnInfo(NtnType.Individual, digits, $"{digits[..5]}-{digits[5..12]}-{digits[12]}");
        }

        var match = BusinessNtn.Match(trimmed);
        if (!match.Success) return null;
        var baseDigits = match.Groups[1].Value;
        var check = match.Groups[2].Success ? match.Groups[2].Value : null;
        return new NtnInfo(
            NtnType.Business, baseDigits + (check ?? ""), check is null ? baseDigits : $"{baseDigits}-{check}");
    }

    /// <summary>Validates the format of an NTN. See <see cref="AnalyzeNtn"/>.</summary>
    /// <param name="ntn">NTN to validate.</param>
    /// <returns><c>true</c> if the format is valid.</returns>
    public static bool ValidateNtn(string ntn) => AnalyzeNtn(ntn) is not null;

    /// <summary>
    /// Validates the format of a Sales Tax Registration Number: 13 digits, with
    /// optional spaces or dashes. Format only; FBR publishes no check-digit algorithm.
    /// </summary>
    /// <param name="strn">STRN to validate.</param>
    /// <returns><c>true</c> if the format is valid.</returns>
    public static bool ValidateStrn(string strn)
    {
        ArgumentNullException.ThrowIfNull(strn);
        return Strn.IsMatch(Normalize.StripSeparators(Normalize.ToAsciiDigits(strn)));
    }
}

/// <summary>Pakistani passport number checks.</summary>
public static class Passport
{
    private static readonly Regex Separators = Js.Rx("[-‐‑‒–— ]");
    private static readonly Regex Pattern = Js.Rx("^[A-Z]{2}[0-9]{7}\\z");

    /// <summary>
    /// Validates the format of a Pakistani passport number: two letters
    /// followed by seven digits, e.g. <c>AB1234567</c>. Case, surrounding
    /// spaces and spaces or dashes between the letters and digits are ignored.
    /// DGIP does not publish the format, so this checks the common shape only;
    /// other passport types may differ. See DATA.md in the repository.
    /// </summary>
    /// <param name="passport">Passport number to validate.</param>
    /// <returns><c>true</c> if the format is valid.</returns>
    public static bool Validate(string passport)
    {
        ArgumentNullException.ThrowIfNull(passport);
        var compact = Separators.Replace(Js.ToUpper(Normalize.ToAsciiDigits(Js.Trim(passport))), "");
        return Pattern.IsMatch(compact);
    }
}

/// <summary>Result of <see cref="VehiclePlate.Parse"/>.</summary>
/// <param name="Series">Letters before the number, e.g. <c>LEA</c>.</param>
/// <param name="Number">Digits of the registration number, e.g. <c>1234</c>.</param>
/// <param name="Year">Two-digit year printed on some older Punjab plates, e.g. <c>19</c>; otherwise <c>null</c>.</param>
/// <param name="Formatted">Series and number joined with a dash, e.g. <c>LEA-1234</c> (without the year).</param>
public sealed record VehiclePlateInfo(string Series, string Number, string? Year, string Formatted);

/// <summary>Pakistani vehicle registration number checks.</summary>
public static class VehiclePlate
{
    private static readonly Regex Pattern =
        Js.Rx("^([A-Z]{1,4})[-‐‑‒–— ]?([0-9]{1,4})(?:[-‐‑‒–— /]{1,3}([0-9]{2}))?\\z");

    /// <summary>
    /// Splits a vehicle registration number into its series letters, number
    /// and optional year, e.g. <c>LEA-1234</c> or <c>ABC 123</c>. There is no
    /// single national format, so this accepts the common shape: 1–4 letters,
    /// then 1–4 digits, optionally followed by a two-digit year after a
    /// separator (<c>LEA-1234-19</c>). Series letters are not checked.
    /// </summary>
    /// <param name="plate">Registration number as written on the plate.</param>
    /// <returns>The parts, or <c>null</c> if it does not have the common shape.</returns>
    public static VehiclePlateInfo? Parse(string plate)
    {
        ArgumentNullException.ThrowIfNull(plate);
        var match = Pattern.Match(Js.ToUpper(Normalize.ToAsciiDigits(Js.Trim(plate))));
        if (!match.Success) return null;
        var series = match.Groups[1].Value;
        var number = match.Groups[2].Value;
        return new VehiclePlateInfo(
            series, number, match.Groups[3].Success ? match.Groups[3].Value : null, $"{series}-{number}");
    }

    /// <summary>Validates the format of a vehicle registration number. See <see cref="Parse"/>.</summary>
    /// <param name="plate">Registration number to validate.</param>
    /// <returns><c>true</c> if the format is valid.</returns>
    public static bool Validate(string plate) => Parse(plate) is not null;
}
