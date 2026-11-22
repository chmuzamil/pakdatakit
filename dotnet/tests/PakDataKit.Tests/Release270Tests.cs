using System.Text.Json;
using Xunit;

namespace PakDataKit.Tests;

/// <summary>Mirrors tests/cnic-text.test.ts.</summary>
public sealed class CnicTextTests
{
    private static string Shift(string digits, int zero) =>
        string.Concat(digits.Select(d => (char)(zero + (d - '0'))));

    private static string Urdu(string digits) => Shift(digits, 0x06F0);

    private static string Arabic(string digits) => Shift(digits, 0x0660);

    [Fact]
    public void FindsACnicWithItsPosition()
    {
        const string text = "CNIC: 35202-1234567-1, phone 0300-1234567";
        var match = Assert.Single(Cnic.FindAll(text));
        Assert.Equal(new CnicMatch("35202-1234567-1", "3520212345671", "35202-1234567-1", 6, 21), match);
        Assert.Equal("35202-1234567-1", text[match.Start..match.End]);
    }

    [Theory]
    [InlineData("3520212345671")]
    [InlineData("35202-1234567-1")]
    [InlineData("35202 1234567-1")]
    [InlineData("35202.1234567 1")]
    [InlineData("35202\u20131234567\u20141")]
    public void AcceptsNoMatchingOrMixedSeparators(string raw)
    {
        Assert.Equal(["3520212345671"], Cnic.FindAll($"id {raw}.").Select(m => m.Digits));
    }

    [Fact]
    public void ReadsUrduAndArabicIndicDigitsEvenMixed()
    {
        var match = Cnic.FindAll($"{Urdu("35202")}-1234567-{Arabic("1")}")[0];
        Assert.Equal("3520212345671", match.Digits);
        Assert.Equal(0, match.Start);
        Assert.Equal(15, match.End);
        Assert.Single(Cnic.FindAll(Arabic("3520212345671")));
    }

    [Fact]
    public void DoesNotCutACnicOutOfALongerDigitRun()
    {
        Assert.Empty(Cnic.FindAll("1235202-1234567-1"));
        Assert.Empty(Cnic.FindAll("35202-1234567-12"));
        Assert.Empty(Cnic.FindAll($"{Urdu("1")}35202-1234567-1"));
        Assert.Single(Cnic.FindAll("x35202-1234567-1y"));
    }

    [Fact]
    public void NeedsAProvinceDigitAnd571Groups()
    {
        Assert.Empty(Cnic.FindAll("05202-1234567-1"));
        Assert.Empty(Cnic.FindAll("95202-1234567-1"));
        Assert.Empty(Cnic.FindAll("35202-123456-1"));
        Assert.Empty(Cnic.FindAll("35202--1234567-1"));
    }

    [Fact]
    public void IsLooserThanValidateWhichStaysStrict()
    {
        Assert.Single(Cnic.FindAll("Account: 1234567890123"));
        Assert.Single(Cnic.FindAll("35202 1234567-1"));
        Assert.False(Cnic.Validate("35202 1234567-1"));
    }

    [Fact]
    public void FindAllNeverThrows()
    {
        Assert.Empty(Cnic.FindAll(null));
        Assert.Empty(Cnic.FindAll(""));
    }

    [Fact]
    public void MasksEveryDigitAndKeepsTheSeparators()
    {
        Assert.Equal(new MaskedText("My CNIC is XXXXX-XXXXXXX-X", 1), Cnic.Mask("My CNIC is 35202-1234567-1"));
        Assert.Equal(new MaskedText("***** ******* *", 1), Cnic.Mask("35202 1234567 1", "*"));
        Assert.Equal(new MaskedText("XXXXX-XXXXXXX-X", 1), Cnic.Mask("35202-1234567-1", null));
        Assert.Equal(new MaskedText("--", 1), Cnic.Mask("35202-1234567-1", ""));
    }

    [Fact]
    public void CountsEachCnicAndLeavesOtherNumbersAlone()
    {
        Assert.Equal(
            new MaskedText("XXXXX-XXXXXXX-X / XXXXX-XXXXXXX-X / 0300-1234567", 2),
            Cnic.Mask("35202-1234567-1 / 61101-7654321-2 / 0300-1234567"));
        Assert.Equal("XXXXXXXXXXXXX", Cnic.Mask(Urdu("3520212345671")).Text);
    }

    [Fact]
    public void MaskNeverThrows()
    {
        Assert.Equal(new MaskedText("", 0), Cnic.Mask(null));
        Assert.Equal(new MaskedText("no ids", 0), Cnic.Mask("no ids"));
    }

    [Theory]
    [InlineData("352 0212 3456 71")]
    [InlineData("35202/1234567/1")]
    [InlineData("3520/2123/4567/1")]
    [InlineData("352.0212.3456.71")]
    [InlineData("3 5 2 0 2 1 2 3 4 5 6 7 1")]
    public void FindsThirteenDigitsInAnyGroupingWithSlashesToo(string raw)
    {
        var match = Assert.Single(Cnic.FindAll($"ID {raw}, ok"));
        Assert.Equal(raw, match.Raw);
        Assert.Equal("3520212345671", match.Digits);
        Assert.Equal(3, match.Start);
    }

    [Fact]
    public void StillFindsA571CnicNextToAnotherNumber()
    {
        var match = Assert.Single(Cnic.FindAll("0300-1234567 35202-1234567-1"));
        Assert.Equal(new CnicMatch("35202-1234567-1", "3520212345671", "35202-1234567-1", 13, 28), match);
    }

    [Theory]
    [InlineData("352 0212 3456 712")]
    [InlineData("1 352 0212 3456 71")]
    [InlineData("4111 1111 1111 1111")]
    [InlineData("35202 - 1234567 - 1")]
    public void NeverCutsALongerRunOrOneWithDoubledSeparators(string text)
    {
        Assert.Empty(Cnic.FindAll(text));
        Assert.Equal(new MaskedText(text, 0), Cnic.Mask(text));
    }

    [Fact]
    public void MatchesAny13DigitsStartingWith1To8()
    {
        Assert.Single(Cnic.FindAll("order 4520 1123 4567 8"));
    }

    [Fact]
    public void ReplacesWholeMatchesWithReplacement()
    {
        Assert.Equal(
            new MaskedText("a [CNIC removed] b [CNIC removed]", 2),
            Cnic.Mask("a 352 0212 3456 71 b 35202/1234567/1", replacement: "[CNIC removed]"));
        Assert.Equal("", Cnic.Mask("352 0212 3456 71", "*", "").Text);
        Assert.Equal("XXX XXXX XXXX XX", Cnic.Mask("352 0212 3456 71", replacement: null).Text);
        Assert.Equal("*** **** **** **", Cnic.Mask("352 0212 3456 71", "*").Text);
    }
}

/// <summary>Mirrors tests/roman-urdu-key.test.ts.</summary>
public sealed class RomanUrduKeyTests
{
    private static bool Same(params string[] spellings) =>
        spellings.Select(Text.RomanUrduKey).Distinct().Count() == 1;

    [Fact]
    public void MatchesTheSpellingsItWasAskedTo()
    {
        Assert.True(Same("Mubeen", "Mobeen"));
        Assert.True(Same("Muhammad", "Mohammad", "Muhammed"));
        Assert.True(Same("Rehman", "Rahman"));
        Assert.True(Same("Chaudhry", "Chaudhary", "Chaudhery"));
    }

    [Fact]
    public void KeepsSimilarButDifferentNamesApart()
    {
        Assert.False(Same("Hussain", "Hassan"));
        Assert.False(Same("Imran", "Umran"));
        Assert.False(Same("Saeed", "Saad"));
        Assert.False(Same("Ehsan", "Ahsan"));
        Assert.False(Same("Ali", "Alia"));
    }

    [Fact]
    public void KeysEachWordIgnoringCaseAccentsAndPunctuation()
    {
        Assert.Equal("muhmd rahmn", Text.RomanUrduKey("Muhammad Rehman"));
        Assert.Equal("muhmd rahmn", Text.RomanUrduKey("MUHAMMAD  rehman!"));
        Assert.Equal(Text.RomanUrduKey("Jose"), Text.RomanUrduKey("Jos\u00E9"));
        Assert.Equal(Text.RomanUrduKey("Jose"), Text.RomanUrduKey("Jose\u0301"));
        // Unpaired surrogates split words, as in JavaScript.
        Assert.Equal("ali ali", Text.RomanUrduKey("Ali\uD800Ali"));
    }

    [Fact]
    public void ReturnsAnEmptyKeyWhenThereAreNoLatinLetters()
    {
        Assert.Equal("", Text.RomanUrduKey(""));
        Assert.Equal("", Text.RomanUrduKey("123"));
        Assert.Equal("", Text.RomanUrduKey(null));
    }

    [Fact]
    public void DoesNotChangeNormalizeRomanUrdu()
    {
        Assert.Equal("aap kaise ho", Text.NormalizeRomanUrdu("ap kaise ho"));
    }

    /// <summary>
    /// The list of common Pakistani names: spellings of one name should share
    /// a key, spellings of different names should not. These are the rates
    /// measured when romanUrduKey was written (2.7.0).
    /// </summary>
    [Fact]
    public void Matches95PercentOfSpellingPairsWithUnderPoint05PercentFalseMatches()
    {
        using var doc = JsonDocument.Parse(File.ReadAllText(NamesFile()));
        var all = doc.RootElement.GetProperty("groups").EnumerateArray()
            .SelectMany((group, g) => group.EnumerateArray().Select(n => (g, key: Text.RomanUrduKey(n.GetString()))))
            .ToArray();
        long variants = 0, variantsMatched = 0, others = 0, othersMatched = 0;
        for (var i = 0; i < all.Length; i++)
        {
            for (var j = i + 1; j < all.Length; j++)
            {
                if (all[i].g == all[j].g)
                {
                    variants++;
                    if (all[i].key == all[j].key) variantsMatched++;
                }
                else
                {
                    others++;
                    if (all[i].key == all[j].key) othersMatched++;
                }
            }
        }
        Assert.True((double)variantsMatched / variants >= 0.95, $"{variantsMatched}/{variants} variants matched");
        Assert.True((double)othersMatched / others < 0.0005, $"{othersMatched}/{others} false matches");
    }

    private static string NamesFile()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            var candidate = Path.Combine(dir.FullName, "data", "sources", "roman-urdu-names.json");
            if (File.Exists(candidate)) return candidate;
            dir = dir.Parent;
        }
        throw new FileNotFoundException("data/sources/roman-urdu-names.json not found above " + AppContext.BaseDirectory);
    }
}

/// <summary>Mirrors the 2.7.0 additions to tests/numbers.test.ts.</summary>
public sealed class LandlineTests
{
    [Fact]
    public void FollowsPtasPlanForTollFreeNumbers()
    {
        Assert.Equal(NumberType.TollFree, Numbers.GetNumberType("0800-78686"));
        // Six digits: PTA's National Numbering Plan 2008 (Soneri Bank uses one).
        Assert.Equal(NumberType.TollFree, Numbers.GetNumberType("0800005000"));
        // libphonenumber also accepts eight digits; PTA's plan does not.
        Assert.Null(Numbers.GetNumberType("080012345678"));
        Assert.Null(Numbers.GetNumberType("0800-1234"));
    }

    [Fact]
    public void AcceptsServiceNumbersOnlyWhenAsked()
    {
        Assert.True(Numbers.ValidateLandline("042-35761234"));
        Assert.True(Numbers.ValidateLandline("042-35761234", services: true));
        foreach (var number in new[] { "021-111-123-456", "111-123-456", "0800-78686", "0900-12345" })
        {
            Assert.False(Numbers.ValidateLandline(number), number);
            Assert.True(Numbers.ValidateLandline(number, services: true), number);
        }
        // Personal numbers and mobiles are not landlines either way.
        Assert.False(Numbers.ValidateLandline("0122-123456", services: true));
        Assert.False(Numbers.ValidateLandline("03001234567", services: true));
        Assert.False(Numbers.ValidateLandline(null, services: true));
    }
}

/// <summary>Mirrors the 2.7.0 additions to tests/raast-validate.test.ts.</summary>
public sealed class RaastKindTests
{
    private const string Iban = "PK36SCBL0000001123456702";

    [Fact]
    public void ReturnsTheKind()
    {
        Assert.Equal(RaastQrKind.P2p, RaastQr.Validate(RaastQr.CreateP2P(new RaastP2POptions { Iban = Iban })).Kind);
        Assert.Null(RaastQr.Validate("not a qr").Kind);
    }

    [Fact]
    public void TreatsAMerchantQrWithoutAnIbanAsValidWithAWarning()
    {
        var payload = RaastQr.CreateMerchant(new MerchantQrOptions
        {
            MerchantAccount = new MerchantAccountInfo(
                new Dictionary<string, string> { ["00"] = "A000000736", ["01"] = "MERCHANT42" }),
            MerchantName = "Aziz General Store",
            City = "Karachi",
        });
        var result = RaastQr.Validate(payload);
        Assert.True(result.Valid);
        Assert.Equal(RaastQrKind.Merchant, result.Kind);
        Assert.Empty(result.Errors);
        Assert.Equal([RaastQrWarning.NoIban], result.Warnings);
    }

    [Fact]
    public void StillRejectsAPersonToPersonQrWithoutAnIban()
    {
        var result = RaastQr.Validate("00020201021102020010042E82", new DateTime(2026, 1, 1));
        Assert.Equal(RaastQrKind.P2p, result.Kind);
        Assert.Contains(RaastQrError.NoIban, result.Errors);
    }
}
