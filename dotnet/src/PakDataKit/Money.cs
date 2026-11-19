using System.Globalization;
using System.Numerics;
using System.Text;
using System.Text.RegularExpressions;
using PakDataKit.Internal;

namespace PakDataKit;

/// <summary>Pakistani Rupee and lakh/crore formatting.</summary>
public static class Currency
{
    private const double Lakh = 100_000;
    private const double Crore = 10_000_000;

    /// <summary>Formats an amount as <c>Rs. 150,000</c>, rounded to whole rupees.</summary>
    /// <param name="amount">Amount in rupees.</param>
    /// <returns>The formatted amount.</returns>
    /// <exception cref="ArgumentException"><paramref name="amount"/> is NaN or infinite.</exception>
    public static string FormatPkr(double amount)
    {
        AssertFinite(amount);
        var rounded = Js.Round(Math.Abs(amount));
        var sign = amount < 0 && rounded != 0 ? "-" : "";
        return $"{sign}Rs. {Js.GroupInteger(rounded)}";
    }

    /// <summary>
    /// Formats an amount with lakh/crore units (<c>25 Lakh</c>, <c>1 Crore</c>).
    /// Values are rounded to two decimals before the unit is chosen, so
    /// <c>9999999</c> gives <c>1 Crore</c>. Smaller amounts fall back to
    /// <see cref="FormatPkr"/>.
    /// </summary>
    /// <param name="amount">Amount in rupees.</param>
    /// <returns>The formatted amount.</returns>
    /// <exception cref="ArgumentException"><paramref name="amount"/> is NaN or infinite.</exception>
    public static string FormatLakh(double amount)
    {
        AssertFinite(amount);
        var sign = amount < 0 ? "-" : "";
        var absolute = Math.Abs(amount);
        var crores = RoundTo2(absolute / Crore);
        if (crores >= 1) return $"{sign}{Js.NumberToString(crores)} Crore";
        var lakhs = RoundTo2(absolute / Lakh);
        return lakhs >= 1 ? $"{sign}{Js.NumberToString(lakhs)} Lakh" : FormatPkr(amount);
    }

    private static double RoundTo2(double value) => Js.Round(value * 100) / 100;

    private static void AssertFinite(double amount)
    {
        if (!double.IsFinite(amount))
            throw new ArgumentException("Amount must be a finite number", nameof(amount));
    }

    // Whitespace around and inside an amount: space, tab, line breaks, no-break spaces.
    private const string SpaceChars = " \t\n\r  ";
    private const string Space = @"[ \t\n\r  ]";

    // Rs, Rs., PKR or ₨ (after ASCII letters are lower-cased).
    private const string CurrencyMark = @"(rs\.?|pkr|₨)";

    // 1,234,567 (international) | 12,34,567 (Pakistani) | 1234567, then an
    // optional decimal part. [0-9], not \d, which matches any Unicode digit in .NET.
    private const string NumberPart =
        @"([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{1,2}(?:,[0-9]{2})+,[0-9]{3}|[0-9]+)?(?:\.([0-9]*))?";

    // × 1,000: k, thousand(s), hazar, ہزار.
    private const string ThousandUnit = @"k|thousands?|hazar|ہزار";

    // × 100,000: lakh(s), lac(s), لاکھ.
    private const string LakhUnit = @"lakhs?|lacs?|لاکھ";

    // × 10,000,000: crore(s), cr, کروڑ.
    private const string CroreUnit = @"crores?|cr|کروڑ";

    private static readonly SafeRegex AmountPattern = Js.Rx(
        $"^(?:{CurrencyMark}{Space}*)?{NumberPart}" +
        $"(?:{Space}*({ThousandUnit}|{LakhUnit}|{CroreUnit}))?" +
        $@"(?:{Space}*{CurrencyMark})?(?:{Space}*(/-))?\z");

    private static readonly SafeRegex ThousandOnly = Js.Rx($@"^(?:{ThousandUnit})\z");
    private static readonly SafeRegex LakhOnly = Js.Rx($@"^(?:{LakhUnit})\z");

    // The largest amount, in paisa: Rs. 50 trillion (50 lakh crore). Below 2^46
    // rupees (about 70 trillion) a double holds every paisa exactly.
    private static readonly BigInteger MaxPaisa = 5_000_000_000_000_000L;

    /// <summary>
    /// Reads a rupee amount the way people type it in Pakistan, and returns it in
    /// rupees, rounded half-up to the paisa. Returns <c>null</c> for anything that is
    /// not exactly one non-negative amount; it never throws.
    /// </summary>
    /// <remarks>
    /// <para>Accepted:</para>
    /// <list type="bullet">
    /// <item>digits, with or without grouping: <c>150000</c>, <c>150,000</c> (international) or
    /// <c>1,50,000</c> (Pakistani: groups of two, then three), and decimals
    /// (<c>1,234.50</c>, <c>.5</c>, <c>5.</c>); a grouping must be complete and consistent;</item>
    /// <item>Urdu (<c>۱۵۰۰۰۰</c>) and Arabic-Indic (<c>١٥٠٠٠٠</c>) digits, also mixed with
    /// 0-9, and the Arabic decimal and thousands separators (<c>٫</c>, <c>٬</c>);</item>
    /// <item>one currency mark before or after the number: <c>Rs</c>, <c>Rs.</c>, <c>PKR</c> or <c>₨</c>
    /// (any case), and a trailing <c>/-</c> (<c>Rs. 5,000/-</c>);</item>
    /// <item>one shorthand unit after the number, with or without a space, in any
    /// case: <c>k</c>, <c>thousand(s)</c>, <c>hazar</c>, <c>ہزار</c> (× 1,000); <c>lakh(s)</c>, <c>lac(s)</c>,
    /// <c>لاکھ</c> (× 100,000); <c>crore(s)</c>, <c>cr</c>, <c>کروڑ</c> (× 10,000,000). Decimals
    /// work with units: <c>1.5 lakh</c> is 150,000 and <c>2.25cr</c> is 22,500,000;</item>
    /// <item>whitespace around and between the parts (spaces, tabs, line breaks and
    /// no-break spaces).</item>
    /// </list>
    /// <para>
    /// Rejected (<c>null</c>): empty input, negative or signed amounts (<c>-500</c>,
    /// <c>+500</c>), ranges (<c>5-10k</c>), more than one number (<c>500 600</c>), two currency
    /// marks or two units, leftover letters (<c>500 rupees</c>, <c>5kk</c>), grouping that
    /// could be read two ways or is broken (<c>1,50</c>, <c>1.500,00</c>, <c>1,5000</c>), and
    /// amounts over Rs. 50 trillion (50 lakh crore), beyond which a number can no
    /// longer hold every paisa exactly.
    /// </para>
    /// <para>
    /// The arithmetic is done on the digits, so the result is exact: <c>1.005</c>
    /// rounds to 1.01 and <c>1.5 lakh</c> is exactly 150000.
    /// </para>
    /// <example>
    /// <code>
    /// Currency.ParseAmount("Rs. 1,50,000/-"); // ParsedAmount(150000, "Rs. 1,50,000/-")
    /// Currency.ParseAmount("2.25cr");         // ParsedAmount(22500000, "2.25cr")
    /// Currency.ParseAmount("5-10k");          // null
    /// </code>
    /// </example>
    /// </remarks>
    /// <param name="input">The amount as typed.</param>
    /// <returns>The value and raw input, or <c>null</c> if the input is not one amount.</returns>
    public static ParsedAmount? ParseAmount(string? input)
    {
        if (input is null) return null;
        var raw = input.Trim(SpaceChars.ToCharArray());
        var sb = new StringBuilder(raw.Length);
        foreach (var c in raw)
        {
            // Urdu (Extended Arabic-Indic) and Arabic-Indic digits, the Arabic
            // decimal and thousands separators, and ASCII-only lower-casing.
            sb.Append(c switch
            {
                >= '۰' and <= '۹' => (char)('0' + (c - '۰')),
                >= '٠' and <= '٩' => (char)('0' + (c - '٠')),
                '٫' => '.',
                '٬' => ',',
                >= 'A' and <= 'Z' => (char)(c + ('a' - 'A')),
                _ => c,
            });
        }

        var match = AmountPattern.Match(sb.ToString());
        if (!match.Success) return null;
        var before = match.Groups[1];
        var whole = match.Groups[2].Success ? match.Groups[2].Value : "";
        var fraction = match.Groups[3];
        var unit = match.Groups[4];
        var after = match.Groups[5];
        if (before.Success && after.Success) return null;
        if (whole.Length == 0 && (!fraction.Success || fraction.Value.Length == 0)) return null;

        // Move the decimal point by the unit's power of ten, on the digit string.
        var wholeDigits = whole.Replace(",", "", StringComparison.Ordinal);
        var digits = wholeDigits + (fraction.Success ? fraction.Value : "");
        var point = wholeDigits.Length + UnitExponent(unit.Success ? unit.Value : null);
        var padded = digits.PadRight(point + 3, '0');
        var rupees = point == 0 ? "0" : padded[..point];
        var paisa = padded.Substring(point, 2);
        var cents = BigInteger.Parse(rupees + paisa, NumberStyles.None, CultureInfo.InvariantCulture);
        if (padded[point + 2] >= '5') cents += 1; // half-up
        if (cents > MaxPaisa) return null;
        return new ParsedAmount((double)(long)cents / 100, raw);
    }

    /// <summary>
    /// Writes back an amount typed in any form <see cref="ParseAmount"/> accepts, for
    /// showing next to the field ("= Rs. 150,000"): <c>Rs.</c>, international
    /// grouping, and paisa only when there are any (<c>Rs. 1,234.50</c>). Returns
    /// <c>null</c> when <see cref="ParseAmount"/> does; it never throws.
    /// </summary>
    /// <param name="input">The amount as typed.</param>
    /// <returns>E.g. <c>Rs. 150,000</c> for <c>1.5 lakh</c>, or <c>null</c>.</returns>
    public static string? FormatAmountInput(string? input)
    {
        var parsed = ParseAmount(input);
        if (parsed is null) return null;
        var cents = (long)Js.Round(parsed.Value * 100);
        var rupees = (cents / 100).ToString(CultureInfo.InvariantCulture);
        var grouped = new StringBuilder();
        for (var i = 0; i < rupees.Length; i++)
        {
            if (i > 0 && (rupees.Length - i) % 3 == 0) grouped.Append(',');
            grouped.Append(rupees[i]);
        }
        var paisa = cents % 100;
        return paisa != 0
            ? $"Rs. {grouped}.{paisa.ToString("00", CultureInfo.InvariantCulture)}"
            : $"Rs. {grouped}";
    }

    // The power of ten a shorthand unit multiplies by.
    private static int UnitExponent(string? unit)
    {
        if (unit is null) return 0;
        if (ThousandOnly.IsMatch(unit)) return 3;
        if (LakhOnly.IsMatch(unit)) return 5;
        return 7;
    }
}

/// <summary>The result of <see cref="Currency.ParseAmount"/>.</summary>
/// <param name="Value">The amount in rupees, rounded half-up to the paisa (2 decimals).</param>
/// <param name="Raw">The input with surrounding whitespace removed.</param>
public sealed record ParsedAmount(double Value, string Raw);

/// <summary>Language for <see cref="Words"/>.</summary>
public enum WordsLanguage
{
    /// <summary>English.</summary>
    En,

    /// <summary>Urdu.</summary>
    Ur,
}

/// <summary>Numbers and rupee amounts in words (English and Urdu, lakh/crore scale).</summary>
public static class Words
{
    // Pakistani scale words, largest first.
    private static readonly (long Value, string En, string Ur)[] Scales =
    [
        (100_000_000_000, "kharab", "کھرب"),
        (1_000_000_000, "arab", "ارب"),
        (10_000_000, "crore", "کروڑ"),
        (100_000, "lakh", "لاکھ"),
        (1_000, "thousand", "ہزار"),
        (100, "hundred", "سو"),
    ];

    private static readonly string[] EnOnes =
    [
        "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven",
        "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
    ];

    private static readonly string[] EnTens =
        ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

    // Urdu has a distinct word for every number from 0 to 99.
    private static readonly string[] Ur0To99 = (
        "صفر ایک دو تین چار پانچ چھ سات آٹھ نو " +
        "دس گیارہ بارہ تیرہ چودہ پندرہ سولہ سترہ اٹھارہ انیس " +
        "بیس اکیس بائیس تئیس چوبیس پچیس چھبیس ستائیس اٹھائیس انتیس " +
        "تیس اکتیس بتیس تینتیس چونتیس پینتیس چھتیس سینتیس اڑتیس انتالیس " +
        "چالیس اکتالیس بیالیس تینتالیس چوالیس پینتالیس چھیالیس سینتالیس اڑتالیس انچاس " +
        "پچاس اکاون باون ترپن چون پچپن چھپن ستاون اٹھاون انسٹھ " +
        "ساٹھ اکسٹھ باسٹھ ترسٹھ چونسٹھ پینسٹھ چھیاسٹھ سڑسٹھ اڑسٹھ انہتر " +
        "ستر اکہتر بہتر تہتر چوہتر پچھتر چھہتر ستتر اٹھہتر اناسی " +
        "اسی اکیاسی بیاسی تراسی چوراسی پچاسی چھیاسی ستاسی اٹھاسی نواسی " +
        "نوے اکانوے بانوے ترانوے چورانوے پچانوے چھیانوے ستانوے اٹھانوے ننانوے").Split(' ');

    private static readonly SafeRegex TitleCase = Js.Rx("(^|[" + Js.Ws + "-])([a-z])");

    /// <summary>
    /// Converts a whole number to words using hundred, thousand, lakh, crore,
    /// arab and kharab: <c>125000</c> gives <c>one lakh twenty-five thousand</c>.
    /// </summary>
    /// <param name="number">A whole number between ±9,007,199,254,740,991.</param>
    /// <param name="language">English (default) or Urdu.</param>
    /// <returns>The number in words.</returns>
    /// <exception cref="ArgumentException"><paramref name="number"/> is not a safe integer.</exception>
    public static string NumberToWords(double number, WordsLanguage language = WordsLanguage.En)
    {
        if (!Js.IsSafeInteger(number))
            throw new ArgumentException("Expected a safe integer", nameof(number));
        var n = (long)number;
        if (n == 0) return UnderHundred(0, language);
        var words = string.Join(" ", Convert(Math.Abs(n), language));
        if (n > 0) return words;
        return language == WordsLanguage.Ur ? "منفی " + words : "minus " + words;
    }

    /// <summary>
    /// Writes a rupee amount in words, with paisa, rounded to the nearest
    /// paisa. With <paramref name="cheque"/>, <c>125000</c> gives
    /// <c>Rupees One Lakh Twenty-Five Thousand Only</c>.
    /// </summary>
    /// <param name="amount">Amount in rupees; zero or more.</param>
    /// <param name="language">English (default) or Urdu.</param>
    /// <param name="cheque">Use the cheque style: title case, ending in "Only".</param>
    /// <returns>The amount in words.</returns>
    /// <exception cref="ArgumentException"><paramref name="amount"/> is negative, not finite or too large.</exception>
    public static string AmountInWords(double amount, WordsLanguage language = WordsLanguage.En, bool cheque = false)
    {
        if (!double.IsFinite(amount) || amount < 0)
            throw new ArgumentException("Amount must be a finite number of zero or more", nameof(amount));
        var totalPaisa = Js.Round(amount * 100);
        var rupees = Math.Floor(totalPaisa / 100);
        var paisa = totalPaisa % 100;
        var rupeeWords = NumberToWords(rupees, language);
        var paisaWords = paisa > 0 ? NumberToWords(paisa, language) : null;

        if (language == WordsLanguage.Ur)
        {
            var urdu = rupeeWords + " روپے";
            if (paisaWords is not null) urdu += $" اور {paisaWords} پیسے";
            return cheque ? urdu + " صرف" : urdu;
        }

        if (cheque)
        {
            var paisaPart = paisaWords is not null ? $" and {paisaWords} paisa" : "";
            var title = TitleCase.Replace(
                $"rupees {rupeeWords}{paisaPart} only",
                m => m.Groups[1].Value + m.Groups[2].Value.ToUpperInvariant());
            var index = title.IndexOf(" And ", StringComparison.Ordinal);
            return index < 0 ? title : title[..index] + " and " + title[(index + 5)..];
        }

        var text = $"{rupeeWords} {(rupees == 1 ? "rupee" : "rupees")}";
        if (paisaWords is not null) text += $" and {paisaWords} paisa";
        return text;
    }

    private static string UnderHundred(long n, WordsLanguage language)
    {
        if (language == WordsLanguage.Ur) return Ur0To99[n];
        if (n < 20) return EnOnes[n];
        var tens = EnTens[n / 10];
        return n % 10 == 0 ? tens : $"{tens}-{EnOnes[n % 10]}";
    }

    private static List<string> Convert(long n, WordsLanguage language)
    {
        foreach (var (value, en, ur) in Scales)
        {
            if (n < value) continue;
            var words = Convert(n / value, language);
            words.Add(language == WordsLanguage.Ur ? ur : en);
            var rest = n % value;
            if (rest > 0) words.AddRange(Convert(rest, language));
            return words;
        }
        return [UnderHundred(n, language)];
    }
}
