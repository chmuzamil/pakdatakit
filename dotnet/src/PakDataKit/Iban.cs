using System.Text;
using System.Text.RegularExpressions;
using PakDataKit.Internal;

namespace PakDataKit;

/// <summary>Kind of institution that issues Pakistani IBANs.</summary>
public enum BankType
{
    /// <summary>Commercial bank.</summary>
    Commercial,

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

/// <summary>A bank (or other institution) that issues Pakistani IBANs.</summary>
/// <param name="Code">4-letter IBAN bank code (characters 5–8 of the IBAN).</param>
/// <param name="Name">Current name of the institution.</param>
/// <param name="Type">Kind of institution.</param>
/// <param name="Active"><c>false</c> for banks that merged into another and no longer exist.</param>
/// <param name="MergedInto">Code of the bank this one merged into, if it no longer exists.</param>
/// <param name="AliasOf">Main code of the same bank, when this is an older code still in use.</param>
public sealed record BankInfo(
    string Code, string Name, BankType Type, bool Active, string? MergedInto, string? AliasOf);

/// <summary>Pakistani IBAN validation and bank lookup.</summary>
public static class Iban
{
    private static readonly SafeRegex Pattern = Js.Rx("^PK[0-9]{2}[A-Z]{4}[A-Z0-9]{16}\\z");
    private static readonly SafeRegex BankCode = Js.Rx("^[A-Z]{4}\\z");

    private static readonly Lazy<IReadOnlyList<BankInfo>> BankList = new(() =>
        Data.Banks.Select(e => new BankInfo(
            e.Code, e.Name, Enum.Parse<BankType>(e.Type, ignoreCase: true),
            e.MergedInto is null, e.MergedInto, e.AliasOf)).ToArray());

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
