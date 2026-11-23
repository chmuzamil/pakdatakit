namespace PakDataKit;

/// <summary>
/// Where a dataset comes from and which period it covers: one entry of
/// <c>data/manifest.json</c>. See <see cref="PakData.GetDataInfo"/>.
/// </summary>
/// <param name="Id">The dataset's id, e.g. <c>income-tax-slabs</c>.</param>
/// <param name="File">Its file in <c>data/</c>, e.g. <c>income-tax-slabs.json</c>.</param>
/// <param name="Title">What the dataset is, e.g. <c>Banks and IBAN bank codes</c>.</param>
/// <param name="Issuer">The body that publishes the source, e.g. <c>Federal Board of Revenue (FBR)</c>.</param>
/// <param name="SourceUrl">The official document or page the data is taken from.</param>
/// <param name="SourceReference">Its number or title: an SRO, circular, notification or table.</param>
/// <param name="SourceDate">When the source was issued (<c>YYYY</c>, <c>YYYY-MM</c> or <c>YYYY-MM-DD</c>), or <c>null</c> if it is undated.</param>
/// <param name="RetrievedAt">When the source was last downloaded (<c>YYYY-MM-DD</c>).</param>
/// <param name="CheckedAt">When the data was last checked against the source (<c>YYYY-MM-DD</c>).</param>
/// <param name="EffectiveFrom">First date the data applies to (<c>YYYY</c>, <c>YYYY-MM</c> or <c>YYYY-MM-DD</c>).</param>
/// <param name="EffectiveTo">Last date it applies to, or <c>null</c> while it is current.</param>
/// <param name="Coverage">What it covers, e.g. <c>Tax years 2020-2027</c>.</param>
/// <param name="RecordCount">Number of records in the file.</param>
/// <param name="NextExpectedUpdate">When the source is next expected to change (<c>YYYY-MM-DD</c>).</param>
/// <param name="UpdateCadence">What triggers an update, e.g. <c>After the Finance Act each July</c>.</param>
/// <param name="Notes">Anything else about the source or how the data was made.</param>
public sealed record DataInfo(
    string Id,
    string File,
    string Title,
    string Issuer,
    string SourceUrl,
    string SourceReference,
    string? SourceDate,
    string RetrievedAt,
    string CheckedAt,
    string EffectiveFrom,
    string? EffectiveTo,
    string Coverage,
    int RecordCount,
    string NextExpectedUpdate,
    string UpdateCadence,
    string Notes);

/// <summary>
/// The source of the dated record a result was calculated from: which
/// dataset, the period that record applies to, and the law or notification
/// behind it.
/// </summary>
/// <param name="Id">The dataset's id, as in <see cref="PakData.GetDataInfo"/>.</param>
/// <param name="EffectiveFrom">First date the record applies to (<c>YYYY-MM-DD</c>).</param>
/// <param name="EffectiveTo">Last date it applies to, or <c>null</c> while it is current.</param>
/// <param name="SourceReference">The law, SRO, circular or notification, as written in the source.</param>
/// <param name="SourceUrl">The official document.</param>
public sealed record DataSource(
    string Id, string EffectiveFrom, string? EffectiveTo, string SourceReference, string SourceUrl);
