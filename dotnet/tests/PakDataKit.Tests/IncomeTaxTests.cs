using Xunit;

namespace PakDataKit.Tests;

/// <summary>Mirrors tests/incometax.test.ts.</summary>
public sealed class IncomeTaxTests
{
    private static SalaryTaxOptions Year(int taxYear) => new() { TaxYear = taxYear };

    [Fact]
    public void SlabsCoverTaxYears2020To2027WithConsistentFixedAmounts()
    {
        Assert.Equal([2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027], IncomeTax.GetSalaryTaxYears());
        foreach (var taxYear in IncomeTax.GetSalaryTaxYears())
        {
            var year = IncomeTax.GetSalaryTaxSlabs(taxYear)!;
            Assert.Equal($"{taxYear - 1}-07-01", year.From);
            Assert.Equal($"{taxYear}-06-30", year.To);
            Assert.StartsWith("https://download1.fbr.gov.pk/", year.Source, StringComparison.Ordinal);
            Assert.Equal(new SalaryTaxSlab(0, 600000, 0, 0), year.Slabs[0]);
            Assert.Null(year.Slabs[^1].UpTo);
            for (var i = 1; i < year.Slabs.Count; i++)
            {
                var prev = year.Slabs[i - 1];
                var slab = year.Slabs[i];
                Assert.Equal(prev.UpTo, slab.Over);
                Assert.Equal(prev.Fixed + prev.Rate * (prev.UpTo!.Value - prev.Over) / 100, slab.Fixed, 6);
            }
        }
    }

    [Fact]
    public void AppliesTheSlabForTheYear()
    {
        Assert.Equal(
            new SalaryTax(72000, 6000, 4, new SalaryTaxSlab(1200000, 2200000, 6000, 11), 2026),
            IncomeTax.CalculateSalaryTax(1_800_000, Year(2026)));
        Assert.Equal(120000, IncomeTax.CalculateSalaryTax(1_800_000, Year(2025))?.Tax);
        Assert.Equal(1774000, IncomeTax.CalculateSalaryTax(8_000_000, Year(2027))?.Tax);
        Assert.Equal(282500, IncomeTax.CalculateSalaryTax(3_000_000, Year(2020))?.Tax);
    }

    [Fact]
    public void TreatsABoundAsTheLowerBand()
    {
        Assert.Equal(0, IncomeTax.CalculateSalaryTax(600_000, Year(2026))?.Tax);
        Assert.Equal(600000, IncomeTax.CalculateSalaryTax(1_200_000, Year(2026))?.Slab.Over);
        Assert.Equal(1200000, IncomeTax.CalculateSalaryTax(1_200_000.01, Year(2026))?.Slab.Over);
    }

    [Fact]
    public void RoundsHalfUpToThePaisa()
    {
        Assert.Equal(0.01, IncomeTax.CalculateSalaryTax(600_000.5, Year(2026))?.Tax);
        Assert.Equal(0, IncomeTax.CalculateSalaryTax(600_000.49, Year(2026))?.Tax);
    }

    [Fact]
    public void PicksTheYearFromADate()
    {
        Assert.Equal(2025, IncomeTax.GetTaxYear("2025-06-30"));
        Assert.Equal(2026, IncomeTax.GetTaxYear("2025-07-01"));
        Assert.Equal(2026, IncomeTax.GetTaxYear(new DateOnly(2025, 7, 1)));
        Assert.Equal(2026, IncomeTax.CalculateSalaryTax(1_800_000, new SalaryTaxOptions { Date = "2025-07-01" })?.TaxYear);
    }

    [Fact]
    public void ReturnsNullForBadInputOrUncoveredYears()
    {
        Assert.Null(IncomeTax.CalculateSalaryTax(-1, Year(2026)));
        Assert.Null(IncomeTax.CalculateSalaryTax(double.NaN, Year(2026)));
        Assert.Null(IncomeTax.CalculateSalaryTax(1, Year(2019)));
        Assert.Null(IncomeTax.GetSalaryTaxSlabs(2030));
        Assert.Null(IncomeTax.GetTaxYear("2026-02-30"));
    }

    [Fact]
    public void ReturnsCopies()
    {
        var slabs = IncomeTax.GetSalaryTaxSlabs(2026)!.Slabs;
        ((SalaryTaxSlab[])slabs)[0] = new SalaryTaxSlab(0, 600000, 0, 99);
        Assert.Equal(0, IncomeTax.GetSalaryTaxSlabs(2026)!.Slabs[0].Rate);
    }

    [Fact]
    public void MonthlyAnnualisesTheSalary()
    {
        Assert.Equal(6000, IncomeTax.CalculateMonthlySalaryTax(150_000, Year(2026))?.Monthly);
        Assert.Equal(0, IncomeTax.CalculateMonthlySalaryTax(50_000, Year(2026))?.Tax);
    }
}
