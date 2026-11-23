using System.Text;
using System.Text.RegularExpressions;
using PakDataKit.Internal;

namespace PakDataKit;

/// <summary>
/// Kind of institution that issues Pakistani IBANs, following the State Bank
/// of Pakistan's grouping.
/// </summary>
public enum BankType
{
    /// <summary>Private commercial bank.</summary>
    Commercial,

    /// <summary>Public sector commercial bank, such as National Bank of Pakistan (<c>public-sector</c>).</summary>
    PublicSector,

    /// <summary>Islamic bank.</summary>
    Islamic,

    /// <summary>Microfinance bank.</summary>
    Microfinance,

    /// <summary>Digital bank.</summary>
    Digital,

    /// <summary>Electronic money institution, such as a wallet.</summary>
    Emi,

    /// <summary>Foreign bank.</summary>
    Foreign,

    /// <summary>Specialized bank.</summary>
    Specialized,

    /// <summary>The State Bank of Pakistan.</summary>
    Central,
}

/// <summary>Whether a bank still exists.</summary>
public enum BankStatus
{
    /// <summary>The bank operates.</summary>
    Active,

    /// <summary>It merged into another bank (see <see cref="BankInfo.MergedInto"/>).</summary>
    Merged,

    /// <summary>It was liquidated.</summary>
    Liquidated,
}

/// <summary>Who prints a bank's SWIFT/BIC code.</summary>
public enum BankBicSource
{
    /// <summary>The State Bank of Pakistan (<c>sbp</c>).</summary>
    Sbp,

    /// <summary>The institution's own domain (<c>bank-site</c>).</summary>
    BankSite,

    /// <summary>
    /// A SWIFT code directory such as Wise (<c>directory</c>); not confirmed by SBP or the
    /// bank, so confirm with the bank before sending money.
    /// </summary>
    Directory,
}

/// <summary>Where a bank's SWIFT/BIC code is printed.</summary>
/// <param name="BicSource">SBP, the institution's own domain, or a SWIFT code directory.</param>
/// <param name="Printed">The code as printed, e.g. <c>HABBPKKAXXX</c> or <c>MEZN PK KA</c>.</param>
/// <param name="SourceUrl">The page or PDF that prints it.</param>
/// <param name="Page">The PDF page, or <c>null</c> for a web page.</param>
/// <param name="CheckedAt">When the source was checked (<c>YYYY-MM-DD</c>).</param>
public sealed record BankSwiftSource(BankBicSource BicSource, string Printed, string SourceUrl, int? Page, string CheckedAt);

/// <summary>A bank (or other institution) that issues Pakistani IBANs.</summary>
/// <param name="Code">4-letter IBAN bank code (characters 5–8 of the IBAN).</param>
/// <param name="Name">Current name of the institution.</param>
/// <param name="Type">Kind of institution.</param>
/// <param name="Active"><c>false</c> for banks that merged into another or have closed.</param>
/// <param name="MergedInto">Code of the bank this one merged into, if it no longer exists.</param>
/// <param name="AliasOf">Main code of the same bank, when this is an older code still in use.</param>
public sealed record BankInfo(
    string Code, string Name, BankType Type, bool Active, string? MergedInto, string? AliasOf)
{
    /// <summary><see cref="BankStatus.Active"/>, <see cref="BankStatus.Merged"/> (see <see cref="MergedInto"/>) or <see cref="BankStatus.Liquidated"/>.</summary>
    public BankStatus Status { get; init; }

    /// <summary>
    /// The institution's official website (from SBP's lists of regulated
    /// institutions, or its own site where SBP lists none or an old domain),
    /// or <c>null</c> for a bank that no longer exists.
    /// </summary>
    public string? Website { get; init; }

    /// <summary>What SBP's list gives, where it differs from <see cref="Website"/> (an older domain); otherwise <c>null</c>.</summary>
    public string? WebsiteSbpListed { get; init; }

    /// <summary>
    /// The 8-character SWIFT/BIC code, only where SBP or the institution's
    /// own website prints it; otherwise <c>null</c> (see <see cref="SwiftReason"/>).
    /// </summary>
    public string? Swift { get; init; }

    /// <summary>Where <see cref="Swift"/> is printed, and when it was checked; <c>null</c> when it is not set.</summary>
    public BankSwiftSource? SwiftSource { get; init; }

    /// <summary>Why <see cref="Swift"/> is <c>null</c>, or <c>null</c> when it is set.</summary>
    public string? SwiftReason { get; init; }
}

/// <summary>Pakistani IBAN validation and bank lookup.</summary>
public static class Iban
{
    private static readonly SafeRegex Pattern = Js.Rx("^PK[0-9]{2}[A-Z]{4}[A-Z0-9]{16}\\z");
    private static readonly SafeRegex BankCode = Js.Rx("^[A-Z]{4}\\z");

    private static readonly Lazy<IReadOnlyList<BankInfo>> BankList = new(() =>
        Data.Banks.Select(e => new BankInfo(
            e.Code, e.Name, Enum.Parse<BankType>(e.Type.Replace("-", ""), ignoreCase: true),
            e.MergedInto is null && e.Active, e.MergedInto, e.AliasOf)
        {
            Status = e.Status switch
            {
                "merged" => BankStatus.Merged,
                "liquidated" => BankStatus.Liquidated,
                _ => BankStatus.Active,
            },
            Website = e.Website,
            WebsiteSbpListed = e.WebsiteSbpListed,
            Swift = e.Swift,
            SwiftSource = e.SwiftSource,
            SwiftReason = e.SwiftReason,
        }).ToArray());

    private static readonly Lazy<Dictionary<string, BankInfo>> BankMap = new(() =>
    {
        var map = new Dictionary<string, BankInfo>(StringComparer.Ordinal);
        foreach (var bank in BankList.Value) map[bank.Code] = bank;
        return map;
    });

    /// <summary>
    /// Validates a 24-character <c>PK</c> IBAN: format and ISO 13616 mod-97
    /// checksum. Spaces and dashes are ignored; lowercase is accepted.
    /// </summary>
    /// <param name="iban">IBAN to validate.</param>
    /// <returns><c>true</c> if valid.</returns>
    public static bool Validate(string? iban)
    {
        iban ??= "";
        var normalized = NormalizeIban(iban);
        if (!Pattern.IsMatch(normalized)) return false;
        var rearranged = normalized[4..] + normalized[..4];
        var remainder = 0;
        foreach (var c in rearranged)
        {
            if (c is >= 'A' and <= 'Z')
            {
                var value = c - 55;
                remainder = (remainder * 10 + value / 10) % 97;
                remainder = (remainder * 10 + value % 10) % 97;
            }
            else remainder = (remainder * 10 + (c - '0')) % 97;
        }
        return remainder == 1;
    }

    /// <summary>Returns the bank name for a valid IBAN.</summary>
    /// <param name="iban">IBAN in any accepted format.</param>
    /// <returns>The bank name, or <c>null</c> if the IBAN is invalid or the bank unknown.</returns>
    public static string? GetBank(string iban)
    {
        if (!Validate(iban)) return null;
        return BankMap.Value.TryGetValue(NormalizeIban(iban).Substring(4, 4), out var bank) ? bank.Name : null;
    }

    /// <summary>
    /// Returns details of the bank that issued an IBAN: name, type and whether
    /// it still exists. Also accepts a 4-letter bank code such as <c>MEZN</c>.
    /// </summary>
    /// <param name="ibanOrCode">An IBAN or a 4-letter bank code.</param>
    /// <returns>The bank, or <c>null</c> if the IBAN is invalid or the code unknown.</returns>
    public static BankInfo? GetBankInfo(string? ibanOrCode)
    {
        ibanOrCode ??= "";
        var value = NormalizeIban(ibanOrCode);
        if (BankCode.IsMatch(value)) return BankMap.Value.GetValueOrDefault(value);
        return Validate(value) ? BankMap.Value.GetValueOrDefault(value.Substring(4, 4)) : null;
    }

    /// <summary>
    /// Lists every bank code in the dataset, including merged banks and older
    /// alias codes. For a bank picker, keep those that are
    /// <see cref="BankInfo.Active"/> and have no <see cref="BankInfo.AliasOf"/>.
    /// </summary>
    /// <returns>All banks, in dataset order.</returns>
    public static IReadOnlyList<BankInfo> GetBanks() => BankList.Value;

    internal static string NormalizeIban(string iban) => Js.ToUpper(Normalize.StripSeparators(iban));
}
