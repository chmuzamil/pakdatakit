using PakDataKit.Internal;

namespace PakDataKit;

/// <summary>Information about the bundled datasets.</summary>
public static class PakData
{
    /// <summary>
    /// Date (<c>YYYY-MM-DD</c>) the bundled datasets were last checked against
    /// their sources. Same value as <c>dataVersion</c> in the npm package; see
    /// DATA.md in the repository.
    /// </summary>
    public static string Version => Data.Version;

    /// <summary>
    /// Where a bundled dataset comes from: the issuer, the official source and
    /// its reference and date, when it was checked, the period it covers, its
    /// record count and when it is next expected to change.
    /// </summary>
    /// <remarks>
    /// <code>
    /// PakData.GetDataInfo("income-tax-slabs")?.Coverage;            // "Tax years 2020-2027"
    /// PakData.GetDataInfo("income-tax-slabs")?.NextExpectedUpdate;  // "2027-07-15"
    /// </code>
    /// </remarks>
    /// <param name="id">
    /// A dataset id, such as <c>banks</c>, <c>income-tax-slabs</c> or
    /// <c>sales-tax-rates</c> (see <see cref="ListDataInfo"/>). Case matters.
    /// </param>
    /// <returns>The manifest entry, or <c>null</c> for an unknown id (also for <c>null</c>). Never throws.</returns>
    public static DataInfo? GetDataInfo(string? id) =>
        id is null ? null : Data.Manifest.FirstOrDefault(e => e.Id == id);

    /// <summary>
    /// Every bundled dataset's manifest entry, as <see cref="GetDataInfo"/>
    /// returns them, in id order (ordinal).
    /// </summary>
    /// <remarks>
    /// <code>PakData.ListDataInfo().Select(d => d.Id);  // ["area-codes", "banks", …]</code>
    /// </remarks>
    /// <returns>The entries.</returns>
    public static IReadOnlyList<DataInfo> ListDataInfo() =>
        Data.Manifest.OrderBy(e => e.Id, StringComparer.Ordinal).ToArray();
}
