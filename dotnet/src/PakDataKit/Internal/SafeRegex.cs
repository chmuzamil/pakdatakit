using System.Text.RegularExpressions;

namespace PakDataKit.Internal;

/// <summary>
/// A culture-invariant regex with a match timeout that never throws: if a
/// match times out, the input is treated as not matching. So a validator
/// returns <c>false</c> and a parser returns <c>null</c> for hostile input,
/// instead of raising <see cref="RegexMatchTimeoutException"/>.
/// </summary>
internal sealed class SafeRegex(string pattern)
{
    private readonly Regex _regex = new(pattern, RegexOptions.CultureInvariant, TimeSpan.FromSeconds(1));

    internal bool IsMatch(string input)
    {
        try
        {
            return _regex.IsMatch(input);
        }
        catch (RegexMatchTimeoutException)
        {
            return false;
        }
    }

    internal Match Match(string input)
    {
        try
        {
            return _regex.Match(input);
        }
        catch (RegexMatchTimeoutException)
        {
            return System.Text.RegularExpressions.Match.Empty;
        }
    }

    internal IReadOnlyList<Match> Matches(string input)
    {
        try
        {
            return _regex.Matches(input).ToArray();
        }
        catch (RegexMatchTimeoutException)
        {
            return [];
        }
    }

    internal string Replace(string input, string replacement)
    {
        try
        {
            return _regex.Replace(input, replacement);
        }
        catch (RegexMatchTimeoutException)
        {
            return input;
        }
    }

    internal string Replace(string input, MatchEvaluator evaluator)
    {
        try
        {
            return _regex.Replace(input, evaluator);
        }
        catch (RegexMatchTimeoutException)
        {
            return input;
        }
    }
}
