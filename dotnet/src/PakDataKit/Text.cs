using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using PakDataKit.Internal;

namespace PakDataKit;

/// <summary>Which letters <see cref="Text.Slugify"/> keeps.</summary>
public enum SlugScript
{
    /// <summary>Latin and Urdu letters (the default).</summary>
    Any,

    /// <summary>Only <c>a-z</c> (accented Latin-1 letters are folded to them).</summary>
    Latin,

    /// <summary>Only Urdu (Arabic-script) letters.</summary>
    Urdu,
}

/// <summary>Options for <see cref="Text.Slugify"/>.</summary>
public sealed record SlugifyOptions
{
    /// <summary>
    /// <see cref="SlugScript.Any"/> (default) keeps Latin and Urdu letters,
    /// <see cref="SlugScript.Latin"/> keeps only <c>a-z</c>,
    /// <see cref="SlugScript.Urdu"/> keeps only Urdu letters. Digits are
    /// always kept, as <c>0-9</c>. Any other value counts as
    /// <see cref="SlugScript.Any"/>.
    /// </summary>
    public SlugScript Script { get; init; }
}

/// <summary>Direction for <see cref="Text.WrapBidi"/>.</summary>
public enum BidiDirection
{
    /// <summary>FIRST STRONG ISOLATE (U+2068): the text's first letter decides.</summary>
    Auto,

    /// <summary>RIGHT-TO-LEFT ISOLATE (U+2067).</summary>
    Rtl,

    /// <summary>LEFT-TO-RIGHT ISOLATE (U+2066).</summary>
    Ltr,
}

/// <summary>Text normalization, Roman Urdu spelling, Urdu digits, slugs, Urdu sorting and bidirectional text.</summary>
public static class Text
{
    private const string UrduDigits = "۰۱۲۳۴۵۶۷۸۹";
    private const string WordChar = "[A-Za-z0-9_]";

    // Common Roman Urdu spelling normalizations (informal to preferred). Only
    // unambiguous variants are listed.
    private static readonly (SafeRegex Pattern, string Replacement)[] RomanUrduReplacements = new[]
    {
        ("kia", "kya"),
        ("ker", "kar"),
        ("kr", "kar"),
        ("hy", "hai"),
        ("mujhay", "mujhe"),
        ("ap", "aap"),
        ("shukria", "shukriya"),
        ("nhi", "nahi"),
        ("assalamu alaikum", "assalamualaikum"),
        ("assalam o alaikum", "assalamualaikum"),
    }.Select(p => (Js.Rx($"(?<!{WordChar}){Js.Ci(p.Item1)}(?!{WordChar})"), p.Item2)).ToArray();

    private static readonly SafeRegex AsciiDigit = Js.Rx("[0-9]");

    /// <summary>Trims, collapses whitespace and applies Unicode NFC.</summary>
    /// <param name="text">Text to normalize.</param>
    /// <returns>The normalized text.</returns>
    public static string Normalize(string? text)
    {
        text ??= "";
        return Internal.Normalize.Whitespace(Nfc(text));
    }

    /// <summary>
    /// Normalizes informal Roman Urdu spellings (<c>kia</c> to <c>kya</c>).
    /// Also applies <see cref="Normalize"/> and converts Urdu and Arabic-Indic
    /// digits to English. A capitalized word keeps its capital; all-caps words
    /// are left alone.
    /// </summary>
    /// <param name="text">Text to normalize.</param>
    /// <returns>The normalized text.</returns>
    public static string NormalizeRomanUrdu(string text)
    {
        var result = Normalize(ToEnglishDigits(text));
        foreach (var (pattern, replacement) in RomanUrduReplacements)
            result = pattern.Replace(result, m => MatchCase(m.Value, replacement));
        return result;
    }

    /// <summary>
    /// A phonetic key for Roman Urdu, so that different spellings of the same
    /// name or word match: <c>Mubeen</c> and <c>Mobeen</c>, <c>Muhammad</c>,
    /// <c>Mohammad</c> and <c>Muhammed</c>, <c>Rehman</c> and <c>Rahman</c>,
    /// <c>Chaudhry</c>, <c>Chaudhary</c> and <c>Chaudhery</c>. Compare keys,
    /// not the text.
    /// </summary>
    /// <remarks>
    /// Each word keeps its consonants, its first vowel sound and a vowel sound
    /// at its end. Letters for one sound are merged (<c>kh</c>, <c>sh</c>,
    /// <c>ch</c>; <c>ph</c> and <c>f</c>; <c>q</c>, <c>c</c> and <c>k</c>;
    /// <c>v</c> and <c>w</c>; <c>th</c> and <c>t</c>, <c>dh</c> and <c>d</c>),
    /// doubled letters count once, <c>e</c> counts as <c>a</c>, <c>o</c> as
    /// <c>u</c>, and a final <c>h</c> after a vowel is dropped. Accents are
    /// removed and anything other than Latin letters splits words. The key is
    /// not meant to be shown: it is an opaque string.
    /// <para>
    /// Different names can share a key (<c>Hamid</c> and <c>Hamad</c>), so
    /// treat a match as "probably the same", not proof.
    /// <see cref="NormalizeRomanUrdu"/> is a different tool: it rewrites
    /// informal spellings into readable text.
    /// </para>
    /// <code>
    /// Text.RomanUrduKey("Mubeen") == Text.RomanUrduKey("Mobeen");   // true
    /// Text.RomanUrduKey("Muhammad Rehman");                          // "muhmd rahmn"
    /// Text.RomanUrduKey("Hussain") == Text.RomanUrduKey("Hassan");   // false
    /// </code>
    /// </remarks>
    /// <param name="text">A name or other Roman Urdu text.</param>
    /// <returns>
    /// The key, one part per word separated by spaces; <c>""</c> for text
    /// with no Latin letters or <c>null</c>. Never throws.
    /// </returns>
    public static string RomanUrduKey(string? text)
    {
        if (text is null) return "";
        var folded = Nfkd(Js.ToLower(text));
        var words = new List<string>();
        var word = new StringBuilder();
        foreach (var c in folded)
        {
            if (c is >= 'a' and <= 'z')
            {
                word.Append(c);
            }
            else if (word.Length > 0)
            {
                // Combining marks (U+0300-036F) are removed, not word breaks.
                if (c is >= '\u0300' and <= '\u036f') continue;
                words.Add(WordKey(word.ToString()));
                word.Clear();
            }
        }
        if (word.Length > 0) words.Add(WordKey(word.ToString()));
        return string.Join(" ", words);
    }

    /// <summary>Converts English and Arabic-Indic digits to Urdu digits (۰–۹).</summary>
    /// <param name="text">Text to convert.</param>
    /// <returns>The text with Urdu digits.</returns>
    public static string ToUrduDigits(string? text)
    {
        text ??= "";
        return AsciiDigit.Replace(
            Internal.Normalize.ToAsciiDigits(text), m => UrduDigits[m.Value[0] - '0'].ToString());
    }

    /// <summary>Converts Urdu and Arabic-Indic digits to English digits (0–9).</summary>
    /// <param name="text">Text to convert.</param>
    /// <returns>The text with English digits.</returns>
    public static string ToEnglishDigits(string? text)
    {
        text ??= "";
        return Internal.Normalize.ToAsciiDigits(text);
    }

    // ------------------------------------------------------------------
    // Slugs, Urdu sorting and bidirectional text
    // ------------------------------------------------------------------

    /// <summary>Latin-1 letters with accents (lower case), folded to ASCII for slugs.</summary>
    private static readonly Dictionary<int, string> Latin1Fold = new()
    {
        ['à'] = "a", ['á'] = "a", ['â'] = "a", ['ã'] = "a", ['ä'] = "a", ['å'] = "a", ['æ'] = "ae", ['ç'] = "c",
        ['è'] = "e", ['é'] = "e", ['ê'] = "e", ['ë'] = "e", ['ì'] = "i", ['í'] = "i", ['î'] = "i", ['ï'] = "i",
        ['ð'] = "d", ['ñ'] = "n", ['ò'] = "o", ['ó'] = "o", ['ô'] = "o", ['õ'] = "o", ['ö'] = "o", ['ø'] = "o",
        ['ù'] = "u", ['ú'] = "u", ['û'] = "u", ['ü'] = "u", ['ý'] = "y", ['ÿ'] = "y", ['þ'] = "th", ['ß'] = "ss",
    };

    /// <summary>
    /// Urdu letters in alphabetical order, from the CLDR <c>ur</c> collation
    /// (common/collation/ur.xml, CLDR 49). Each letter followed by ھ (بھ, پھ, …)
    /// is a letter of its own, right after it.
    /// </summary>
    private static readonly string[] UrduOrder =
    [
        "ا", "آ", "ب", "بھ", "پ", "پھ", "ت", "تھ", "ٹ", "ٹھ", "ث", "ج", "جھ", "چ",
        "چھ", "ح", "خ", "د", "دھ", "ڈ", "ڈھ", "ذ", "ر", "رھ", "ڑ", "ڑھ", "ز", "ژ",
        "س", "ش", "ص", "ض", "ط", "ظ", "ع", "غ", "ف", "ق", "ک", "کھ", "گ", "گھ",
        "ل", "لھ", "م", "مھ", "ن", "نھ", "ں", "ںھ", "و", "وھ", "ہ", "ھ", "ۃ", "ء",
        "ی", "یھ", "ے",
    ];

    private const int DoChashmiHe = 'ھ';

    /// <summary>Rank of each single Urdu letter.</summary>
    private static readonly Dictionary<int, int> LetterRanks = UrduOrder
        .Select((letter, index) => (letter, index)).Where(p => p.letter.Length == 1)
        .ToDictionary(p => (int)p.letter[0], p => p.index);

    /// <summary>Rank of each letter + ھ digraph, keyed by its first letter.</summary>
    private static readonly Dictionary<int, int> AspiratedRanks = UrduOrder
        .Select((letter, index) => (letter, index)).Where(p => p.letter.Length == 2)
        .ToDictionary(p => (int)p.letter[0], p => p.index);

    /// <summary>Letters with a hamza that sort as their base letter, secondarily after it.</summary>
    private static readonly Dictionary<int, int> HamzaVariants = new()
    {
        ['أ'] = 'ا', ['ؤ'] = 'و', ['ۂ'] = 'ہ', ['ئ'] = 'ی', ['ۓ'] = 'ے',
    };

    /// <summary>Diacritics in CLDR's secondary order (ْ &lt; َ &lt; ِ &lt; … &lt; ٓ).</summary>
    private const string Diacritics =
        "ًٌٍَُِّْٰٖٗٔ٘ٓ";

    private static readonly int HamzaAboveWeight = 1 + Diacritics.IndexOf('ٔ');

    // Primary groups, in sorting order.
    private const int PunctuationGroup = 1;
    private const int DigitGroup = 2;
    private const int UrduGroup = 3;
    private const int OtherArabicGroup = 4;
    private const int OtherGroup = 5;

    /// <summary>
    /// Turns text into a URL slug: lower-case words joined by <c>-</c>.
    /// </summary>
    /// <remarks>
    /// Urdu letters are kept as they are (no transliteration: Urdu does not
    /// write short vowels, so there is no single Roman spelling). Diacritics,
    /// tatweel and zero-width characters are dropped, the Arabic look-alikes
    /// ك ي ى become the Urdu ک ی ی, Urdu and Arabic-Indic digits become
    /// <c>0-9</c>, and accented Latin-1 letters lose their accents (<c>é</c>
    /// to <c>e</c>, <c>ß</c> to <c>ss</c>). Anything else separates words.
    /// <code>
    /// Text.Slugify("Lahore Fort, 2024"); // "lahore-fort-2024"
    /// Text.Slugify("لاہور قلعہ"); // "لاہور-قلعہ"
    /// Text.Slugify("لاہور Fort", new SlugifyOptions { Script = SlugScript.Latin }); // "fort"
    /// Text.Slugify("کراچی ۲۰۲۴", new SlugifyOptions { Script = SlugScript.Urdu }); // "کراچی-2024"
    /// </code>
    /// </remarks>
    /// <param name="input">Text to turn into a slug.</param>
    /// <param name="options">Which letters to keep; <c>null</c> keeps Latin and Urdu.</param>
    /// <returns>The slug, or <c>""</c> when nothing is left (or the input is <c>null</c>). Never throws.</returns>
    public static string Slugify(string? input, SlugifyOptions? options = null)
    {
        if (input is null) return "";
        var script = options?.Script ?? SlugScript.Any;
        var keepLatin = script != SlugScript.Urdu;
        var keepUrdu = script != SlugScript.Latin;
        var sb = new StringBuilder();
        var pending = false;
        void Push(string piece)
        {
            if (pending && sb.Length > 0) sb.Append('-');
            pending = false;
            sb.Append(piece);
        }

        var text = Internal.Normalize.ToAsciiDigits(input);
        for (var i = 0; i < text.Length; i++)
        {
            var cp = NextCodePoint(text, ref i, out var start, out var length);
            if (IsSkipped(cp)) continue;
            if (cp is >= 0x30 and <= 0x39)
            {
                Push(text.Substring(start, length));
                continue;
            }
            if (keepLatin)
            {
                if (cp is >= 0x61 and <= 0x7a)
                {
                    Push(text.Substring(start, length));
                    continue;
                }
                if (cp is >= 0x41 and <= 0x5a)
                {
                    Push(((char)(cp + 0x20)).ToString());
                    continue;
                }
                // À-Þ (except ×) are the capitals of à-þ.
                var lower = cp is >= 0xc0 and <= 0xde and not 0xd7 ? cp + 0x20 : cp;
                if (Latin1Fold.TryGetValue(lower, out var folded))
                {
                    Push(folded);
                    continue;
                }
            }
            if (keepUrdu && IsArabicLetter(cp))
            {
                Push(cp switch
                {
                    0x0643 => "ک",
                    0x064a or 0x0649 => "ی",
                    _ => text.Substring(start, length),
                });
                continue;
            }
            pending = true;
        }
        return sb.ToString();
    }

    /// <summary>
    /// Compares two strings in Urdu alphabetical order, for sorting
    /// (<c>list.Sort(Text.CompareUrdu)</c>).
    /// </summary>
    /// <remarks>
    /// Letters follow the Unicode CLDR collation for Urdu (<c>ur</c>, CLDR 49):
    /// ا آ ب بھ پ پھ ت تھ ٹ ٹھ ث ج جھ چ چھ ح خ د دھ ڈ ڈھ ذ ر رھ ڑ ڑھ ز ژ س ش ص ض
    /// ط ظ ع غ ف ق ک کھ گ گھ ل لھ م مھ ن نھ ں ںھ و وھ ہ ھ ۃ ء ی یھ ے. A letter
    /// joined with ھ is a letter of its own (so بھ comes after every other ب
    /// word). أ ؤ ۂ ئ ۓ sort as ا و ہ ی ے and come just after them when words
    /// are otherwise equal, and diacritics only break ties, in CLDR's order.
    /// <para>
    /// Outside the Urdu letters: spaces and punctuation come first, then
    /// digits digit by digit (Urdu, Arabic-Indic and ASCII digits are equal;
    /// <c>10</c> comes before <c>2</c>), then Urdu letters, then other
    /// Arabic-script characters (the look-alikes ك ي ى ه ة, which CLDR does
    /// not treat as Urdu letters), then everything else by code point,
    /// ignoring ASCII case. Strings that are still equal are ordered by code
    /// point, so the result is 0 only for identical strings. The order is
    /// built in, so it does not depend on the machine's culture or ICU.
    /// </para>
    /// <code>
    /// var words = new List&lt;string&gt; { "ے", "بھائی", "آم", "باغ", "اب" };
    /// words.Sort(Text.CompareUrdu); // اب, آم, باغ, بھائی, ے
    /// </code>
    /// </remarks>
    /// <param name="a">First string; <c>null</c> counts as <c>""</c>.</param>
    /// <param name="b">Second string; <c>null</c> counts as <c>""</c>.</param>
    /// <returns><c>-1</c>, <c>0</c> or <c>1</c>. Never throws.</returns>
    public static int CompareUrdu(string? a, string? b)
    {
        var x = a ?? "";
        var y = b ?? "";
        if (string.Equals(x, y, StringComparison.Ordinal)) return 0;
        var (xPrimary, xSecondary) = CollationKey(x);
        var (yPrimary, ySecondary) = CollationKey(y);
        var result = CompareArrays(xPrimary, yPrimary);
        if (result == 0) result = CompareArrays(xSecondary, ySecondary);
        if (result == 0) result = CompareArrays(CodePointValues(x), CodePointValues(y));
        return result;
    }

    /// <summary>
    /// Whether text reads right to left: its first letter is from a
    /// right-to-left script such as Urdu or Arabic. Digits, punctuation and
    /// spaces are skipped, as in the Unicode bidirectional algorithm's
    /// paragraph rule.
    /// </summary>
    /// <remarks>
    /// <code>
    /// Text.IsRtl("سلام"); // true
    /// Text.IsRtl("123 سلام"); // true
    /// Text.IsRtl("Order نمبر"); // false
    /// </code>
    /// </remarks>
    /// <param name="text">Text to check.</param>
    /// <returns><c>false</c> when there is no letter, or the input is <c>null</c>. Never throws.</returns>
    public static bool IsRtl(string? text)
    {
        if (text is null) return false;
        for (var i = 0; i < text.Length; i++)
        {
            var cp = NextCodePoint(text, ref i, out _, out _);
            if (IsLetter(cp)) return IsRtlCodePoint(cp);
        }
        return false;
    }

    /// <summary>
    /// Wraps text in Unicode directional isolates, so a name or number in one
    /// direction does not reorder the sentence around it (for example an
    /// English order number inside an Urdu message).
    /// </summary>
    /// <remarks>
    /// Uses FIRST STRONG ISOLATE (U+2068) for <see cref="BidiDirection.Auto"/>,
    /// RIGHT-TO-LEFT ISOLATE (U+2067) for <see cref="BidiDirection.Rtl"/> and
    /// LEFT-TO-RIGHT ISOLATE (U+2066) for <see cref="BidiDirection.Ltr"/>,
    /// closed with POP DIRECTIONAL ISOLATE (U+2069). Any other value counts as
    /// <see cref="BidiDirection.Auto"/>.
    /// <code>
    /// $"آرڈر {Text.WrapBidi("PDK-1042")} بھیج دیا گیا";
    /// </code>
    /// </remarks>
    /// <param name="text">Text to wrap.</param>
    /// <param name="direction">The direction of <paramref name="text"/>.</param>
    /// <returns>The wrapped text, or <c>""</c> when the input is <c>null</c>. Never throws.</returns>
    public static string WrapBidi(string? text, BidiDirection direction = BidiDirection.Auto)
    {
        if (text is null) return "";
        var open = direction switch
        {
            BidiDirection.Rtl => '⁧',
            BidiDirection.Ltr => '⁦',
            _ => '⁨',
        };
        return open + text + '⁩';
    }

    /// <summary>
    /// The code point starting at <paramref name="i"/>, as JavaScript's
    /// <c>for…of</c> yields it (a lone surrogate is its own code point);
    /// <paramref name="i"/> moves to its last UTF-16 unit.
    /// </summary>
    private static int NextCodePoint(string text, ref int i, out int start, out int length)
    {
        start = i;
        if (char.IsHighSurrogate(text[i]) && i + 1 < text.Length && char.IsLowSurrogate(text[i + 1]))
        {
            length = 2;
            i++;
            return char.ConvertToUtf32(text[i - 1], text[i]);
        }
        length = 1;
        return text[i];
    }

    private static List<int> CodePointValues(string text)
    {
        var result = new List<int>(text.Length);
        for (var i = 0; i < text.Length; i++) result.Add(NextCodePoint(text, ref i, out _, out _));
        return result;
    }

    /// <summary>Marks and invisible characters that slugs and sorting skip.</summary>
    private static bool IsSkipped(int cp) =>
        cp is (>= 0x0300 and <= 0x036f) or (>= 0x0610 and <= 0x061a) or (>= 0x064b and <= 0x065f)
            or 0x0670 or (>= 0x06d6 and <= 0x06ed) or 0x061c or 0x0640 or (>= 0x200b and <= 0x200f)
            or (>= 0x202a and <= 0x202e) or (>= 0x2066 and <= 0x2069) or 0xfeff;

    /// <summary>Arabic-script letters (Urdu letters and their Arabic look-alikes).</summary>
    private static bool IsArabicLetter(int cp) =>
        (cp is >= 0x0621 and <= 0x064a && cp != 0x0640) || cp is (>= 0x066e and <= 0x06d3) or 0x06d5
            or (>= 0x06fa and <= 0x06ff);

    private static bool IsPunctuation(int cp) =>
        cp <= 0x2f || cp is (>= 0x3a and <= 0x40) or (>= 0x5b and <= 0x60) or (>= 0x7b and <= 0xbf)
            or (>= 0x2000 and <= 0x206f) or (>= 0x0600 and <= 0x060f) or 0x061b or (>= 0x061d and <= 0x061f)
            or (>= 0x066a and <= 0x066d) or 0x06d4;

    private static int DigitValue(int cp) => cp switch
    {
        >= 0x30 and <= 0x39 => cp - 0x30,
        >= 0x0660 and <= 0x0669 => cp - 0x0660,
        >= 0x06f0 and <= 0x06f9 => cp - 0x06f0,
        _ => -1,
    };

    private static bool IsArabicScript(int cp) =>
        cp is (>= 0x0600 and <= 0x06ff) or (>= 0x0750 and <= 0x077f) or (>= 0x08a0 and <= 0x08ff)
            or (>= 0xfb50 and <= 0xfdff) or (>= 0xfe70 and <= 0xfeff);

    /// <summary>Letters of right-to-left scripts (Hebrew, Arabic, Syriac, Thaana, …).</summary>
    private static bool IsRtlCodePoint(int cp) =>
        cp is (>= 0x0590 and <= 0x08ff) or (>= 0xfb1d and <= 0xfdff) or (>= 0xfe70 and <= 0xfeff)
            or (>= 0x10800 and <= 0x10fff) or (>= 0x1e800 and <= 0x1efff);

    /// <summary>JavaScript's <c>/\p{L}/u</c>: general category L* (from .NET's own Unicode tables, not ICU).</summary>
    private static bool IsLetter(int cp) =>
        cp is < 0xd800 or > 0xdfff
        && CharUnicodeInfo.GetUnicodeCategory(cp) is UnicodeCategory.UppercaseLetter
            or UnicodeCategory.LowercaseLetter or UnicodeCategory.TitlecaseLetter
            or UnicodeCategory.ModifierLetter or UnicodeCategory.OtherLetter;

    /// <summary>A primary weight: the group times 2^21, plus the rank within the group.</summary>
    private static int Weight(int group, int rank) => group * 0x200000 + rank;

    private static (List<int> Primary, List<int> Secondary) CollationKey(string text)
    {
        var chars = CodePointValues(text);
        var primary = new List<int>(chars.Count);
        var secondary = new List<int>(chars.Count);
        for (var i = 0; i < chars.Count; i++)
        {
            var cp = chars[i];
            var diacritic = cp <= 0xffff ? Diacritics.IndexOf((char)cp) : -1;
            if (diacritic >= 0)
            {
                secondary.Add(1 + diacritic);
                continue;
            }
            if (IsSkipped(cp)) continue;
            var hamza = HamzaVariants.TryGetValue(cp, out var letter);
            if (!hamza) letter = cp;
            if (letter == 'ا' && i + 1 < chars.Count && chars[i + 1] == 0x0653)
            {
                letter = 'آ';
                i++;
            }
            if (LetterRanks.TryGetValue(letter, out var rank))
            {
                if (i + 1 < chars.Count && chars[i + 1] == DoChashmiHe
                    && AspiratedRanks.TryGetValue(letter, out var joined))
                {
                    primary.Add(Weight(UrduGroup, joined));
                    i++;
                }
                else
                {
                    primary.Add(Weight(UrduGroup, rank));
                }
                secondary.Add(0);
                if (hamza) secondary.Add(HamzaAboveWeight);
                continue;
            }
            var digit = DigitValue(cp);
            if (digit >= 0) primary.Add(Weight(DigitGroup, digit));
            else if (IsPunctuation(cp)) primary.Add(Weight(PunctuationGroup, cp));
            else if (IsArabicScript(cp)) primary.Add(Weight(OtherArabicGroup, cp));
            else primary.Add(Weight(OtherGroup, cp is >= 0x41 and <= 0x5a ? cp + 0x20 : cp));
            secondary.Add(0);
        }
        return (primary, secondary);
    }

    private static int CompareArrays(List<int> a, List<int> b)
    {
        var length = Math.Min(a.Count, b.Count);
        for (var i = 0; i < length; i++)
        {
            if (a[i] != b[i]) return a[i] < b[i] ? -1 : 1;
        }
        return a.Count == b.Count ? 0 : a.Count < b.Count ? -1 : 1;
    }

    private static string MatchCase(string original, string replacement)
    {
        if (original.Length > 1 && original == Js.ToUpper(original)) return original;
        var first = original[..1];
        return first != Js.ToLower(first) ? Js.ToUpper(replacement[..1]) + replacement[1..] : replacement;
    }

    // ------------------------------------------------------------------
    // Roman Urdu phonetic key
    // ------------------------------------------------------------------

    /// <summary>Two-letter spellings of one sound, and what each becomes in a key.</summary>
    private static readonly Dictionary<string, string> KeyDigraphs = new(StringComparer.Ordinal)
    {
        ["kh"] = "kh",
        ["gh"] = "g",
        ["sh"] = "sh",
        ["ch"] = "ch",
        ["ph"] = "f",
        ["th"] = "t",
        ["dh"] = "d",
        ["bh"] = "b",
        ["jh"] = "j",
        ["zh"] = "z",
        ["ck"] = "k",
    };

    /// <summary>Letters written for the same sound as another letter.</summary>
    private static readonly Dictionary<char, string> KeyLetters = new()
    {
        ['c'] = "k",
        ['q'] = "k",
        ['v'] = "w",
        ['x'] = "ks",
    };

    private static bool IsPlainVowel(char c) => c is 'a' or 'e' or 'i' or 'o' or 'u';

    /// <summary>The sound class of a vowel letter: a (a, e), i (i, y) or u (o, u, w).</summary>
    private static char VowelClass(char letter) => letter switch
    {
        'a' or 'e' => 'a',
        'i' or 'y' => 'i',
        _ => 'u',
    };

    /// <summary>
    /// The sound class of a word's first vowel sound: ee is i (Zeeshan,
    /// Heera); a word-initial e is i (Ebrahim, Esmail); au, aw, ou and ow are
    /// u (Chaudhry, Choudhry, Chowdhury); ai, ay, ae, ei and ey are e (Saeed,
    /// Faisal, Sheikh); otherwise the class of the first letter.
    /// </summary>
    private static char FirstVowelClass(string run, bool wordStart)
    {
        if (run.StartsWith("ee", StringComparison.Ordinal)) return 'i';
        if (wordStart && run[0] == 'e') return 'i';
        var second = run.Length > 1 ? run[1] : '\0';
        if (run[0] is 'a' or 'o' && second is 'u' or 'w') return 'u';
        if ((run[0] == 'a' && second is 'i' or 'y' or 'e') || (run[0] == 'e' && second is 'i' or 'y')) return 'e';
        return VowelClass(run[0]);
    }

    /// <summary>The phonetic key of one word of lowercase ASCII letters.</summary>
    private static string WordKey(string word)
    {
        // 1. One letter per sound.
        var mapped = new StringBuilder();
        for (var i = 0; i < word.Length;)
        {
            if (i + 1 < word.Length && KeyDigraphs.TryGetValue(word.Substring(i, 2), out var pair))
            {
                mapped.Append(pair);
                i += 2;
            }
            else
            {
                if (KeyLetters.TryGetValue(word[i], out var letter)) mapped.Append(letter);
                else mapped.Append(word[i]);
                i += 1;
            }
        }

        // 2. Doubled letters count once (Muhammad, Rehmaan), except ee, which
        //    is written for a long i (Zeeshan, Heera, Saeed).
        var sb = new StringBuilder();
        foreach (var c in mapped.ToString())
        {
            if (c != 'e' && sb.Length > 0 && sb[^1] == c) continue;
            sb.Append(c);
        }
        var letters = sb.ToString();

        // 3. Which letters are vowels: a, e, i, o, u; y except at the start; w
        //    after a vowel and before a consonant (Chowdhury).
        var vowel = new bool[letters.Length];
        for (var i = 0; i < letters.Length; i++)
        {
            var c = letters[i];
            vowel[i] = IsPlainVowel(c)
                || (c == 'y' && i > 0)
                || (c == 'w' && i > 0 && vowel[i - 1]
                    // TypeScript's "aeiou".includes("") is true, so a final w is not a vowel.
                    && i + 1 < letters.Length && !IsPlainVowel(letters[i + 1]));
        }

        // 4. A final h after a vowel is silent (Fatimah, Sarah).
        var length = letters.Length;
        var last = length - 1;
        if (last > 0 && letters[last] == 'h' && vowel[last - 1]) length = last;

        // 5. Consonants, the first vowel sound and a final vowel sound.
        var key = new StringBuilder();
        var firstVowelDone = false;
        for (var i = 0; i < length;)
        {
            if (!vowel[i])
            {
                key.Append(letters[i]);
                i += 1;
                continue;
            }
            var end = i;
            while (end < length && vowel[end]) end += 1;
            var run = letters[i..end];
            if (!firstVowelDone)
            {
                key.Append(FirstVowelClass(run, i == 0));
                firstVowelDone = true;
            }
            else if (end == length)
            {
                key.Append(run.EndsWith("ee", StringComparison.Ordinal) ? 'i' : VowelClass(run[^1]));
            }
            i = end;
        }
        return key.ToString();
    }

    /// <summary>
    /// <c>String.prototype.normalize('NFKD')</c>, for <see cref="RomanUrduKey"/>.
    /// .NET rejects unpaired surrogates and noncharacters; JavaScript keeps
    /// them, and they split words either way, so they become spaces.
    /// </summary>
    private static string Nfkd(string text)
    {
        try
        {
            return text.Normalize(NormalizationForm.FormKD);
        }
        catch (ArgumentException)
        {
            var sb = new StringBuilder(text.Length);
            for (var i = 0; i < text.Length; i++)
            {
                var c = text[i];
                var paired = char.IsHighSurrogate(c) && i + 1 < text.Length && char.IsLowSurrogate(text[i + 1]);
                var code = paired ? char.ConvertToUtf32(c, text[i + 1]) : c;
                var rejected = (!paired && char.IsSurrogate(c)) || (code & 0xFFFE) == 0xFFFE
                    || code is >= 0xFDD0 and <= 0xFDEF;
                if (rejected)
                {
                    sb.Append(paired ? "  " : " ");
                }
                else
                {
                    sb.Append(c);
                    if (paired) sb.Append(text[i + 1]);
                }
                if (paired) i++;
            }
            return sb.ToString().Normalize(NormalizationForm.FormKD);
        }
    }

    /// <summary>
    /// <c>String.prototype.normalize('NFC')</c>. JavaScript normalizes any
    /// string; .NET rejects unpaired surrogates and noncharacters, so those
    /// are left in place and the text around them is normalized.
    /// </summary>
    private static string Nfc(string text)
    {
        try
        {
            return text.Normalize(NormalizationForm.FormC);
        }
        catch (ArgumentException)
        {
            var sb = new StringBuilder();
            var start = 0;
            for (var i = 0; i < text.Length; i++)
            {
                var c = text[i];
                var paired = char.IsHighSurrogate(c) && i + 1 < text.Length && char.IsLowSurrogate(text[i + 1]);
                var code = paired ? char.ConvertToUtf32(c, text[i + 1]) : c;
                var length = paired ? 2 : 1;
                var rejected = (!paired && char.IsSurrogate(c)) || (code & 0xFFFE) == 0xFFFE
                    || code is >= 0xFDD0 and <= 0xFDEF;
                if (rejected)
                {
                    sb.Append(NfcOrSame(text[start..i])).Append(text, i, length);
                    start = i + length;
                }
                i += length - 1;
            }
            return sb.Append(NfcOrSame(text[start..])).ToString();
        }
    }

    private static string NfcOrSame(string text)
    {
        try
        {
            return text.Normalize(NormalizationForm.FormC);
        }
        catch (ArgumentException)
        {
            return text;
        }
    }
}
