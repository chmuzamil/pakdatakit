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
}

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
