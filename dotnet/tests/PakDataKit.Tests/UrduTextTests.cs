using Xunit;

namespace PakDataKit.Tests;

/// <summary>Mirrors tests/urdu-text.test.ts.</summary>
public sealed class UrduTextTests
{
    [Fact]
    public void SlugifyMakesLatinSlugs()
    {
        Assert.Equal("lahore-fort-2024", Text.Slugify("Lahore Fort, 2024"));
        Assert.Equal("united-kingdom", Text.Slugify("  Ünited   Kingdom "));
        Assert.Equal("strasse-aeon", Text.Slugify("Straße ÆON"));
        Assert.Equal("a", Text.Slugify("---a---"));
    }

    [Fact]
    public void SlugifyKeepsUrduLettersAndDropsDiacritics()
    {
        Assert.Equal("لاہور-قلعہ", Text.Slugify("لاہور قلعہ"));
        Assert.Equal("محمد", Text.Slugify("مُحَمَّد"));
        Assert.Equal("کتاب", Text.Slugify("كتاب"));
    }

    [Fact]
    public void SlugifyFiltersByScript()
    {
        Assert.Equal("fort", Text.Slugify("لاہور Fort", new SlugifyOptions { Script = SlugScript.Latin }));
        Assert.Equal("لاہور", Text.Slugify("لاہور Fort", new SlugifyOptions { Script = SlugScript.Urdu }));
        Assert.Equal("کراچی-2024", Text.Slugify("کراچی ۲۰۲۴", new SlugifyOptions { Script = SlugScript.Urdu }));
    }

    [Fact]
    public void CompareUrduSortsInCldrUrduOrder()
    {
        var words = new List<string> { "ے", "بھائی", "آم", "باغ", "اب" };
        words.Sort(Text.CompareUrdu);
        Assert.Equal(["اب", "آم", "باغ", "بھائی", "ے"], words);
        Assert.Equal(-1, Text.CompareUrdu("بہن", "بھائی"));
        Assert.Equal(-1, Text.CompareUrdu("ہم", "ھ"));
    }

    [Fact]
    public void CompareUrduTreatsHamzaFormsAndDiacriticsAsSecondary()
    {
        Assert.Equal(-1, Text.CompareUrdu("اب", "أب"));
        Assert.Equal(-1, Text.CompareUrdu("أب", "اج"));
        Assert.Equal(-1, Text.CompareUrdu("بت", "بَت"));
    }

    [Fact]
    public void CompareUrduOrdersDigitsByValueAndPunctuationFirst()
    {
        Assert.Equal(-1, Text.CompareUrdu("۲", "3"));
        Assert.Equal(-1, Text.CompareUrdu("10", "۲"));
        Assert.Equal(-1, Text.CompareUrdu(" ", "1"));
        Assert.Equal(-1, Text.CompareUrdu("ے", "ك"));
        Assert.Equal(-1, Text.CompareUrdu("ے", "a"));
    }

    [Fact]
    public void CompareUrduIsZeroOnlyForIdenticalStrings()
    {
        Assert.Equal(0, Text.CompareUrdu("ا", "ا"));
        Assert.Equal(1, Text.CompareUrdu("a", "A"));
    }

    [Fact]
    public void IsRtlUsesTheFirstLetter()
    {
        Assert.True(Text.IsRtl("سلام"));
        Assert.True(Text.IsRtl("123 سلام"));
        Assert.False(Text.IsRtl("Order نمبر"));
        Assert.True(Text.IsRtl("שלום"));
        Assert.False(Text.IsRtl("123"));
        Assert.False(Text.IsRtl(null));
    }

    [Fact]
    public void WrapBidiWrapsInIsolates()
    {
        Assert.Equal("⁨PDK-1042⁩", Text.WrapBidi("PDK-1042"));
        Assert.Equal("⁧abc⁩", Text.WrapBidi("abc", BidiDirection.Rtl));
        Assert.Equal("⁦abc⁩", Text.WrapBidi("abc", BidiDirection.Ltr));
        Assert.Equal("", Text.WrapBidi(null));
    }
}
