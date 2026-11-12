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
}
