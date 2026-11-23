using System.Text.Json;
using Xunit;

namespace PakDataKit.Tests;

/// <summary>The 2.8.0 additions, through the .NET API (the vectors cover the behaviour in depth).</summary>
public sealed class Release280Tests
{
    [Fact]
    public void FindsCnicsAcrossSingleLineBreaksOnlyWhenAsked()
    {
        const string text = "CNIC\n35202\r\n1234567 \n 1";
        Assert.Empty(Cnic.FindAll(text));
        var match = Assert.Single(Cnic.FindAll(text, acrossLines: true));
        Assert.Equal("35202-1234567-1", match.Formatted);
        Assert.Empty(Cnic.FindAll("35202\n\n1234567\n1", acrossLines: true));
    }

    [Fact]
    public void MasksAcrossLinesKeepingTheLineBreaks()
    {
        Assert.Equal(new MaskedText("XXXXX\nXXXXXXX\nX", 1), Cnic.Mask("35202\n1234567\n1", acrossLines: true));
        Assert.Equal(
            new MaskedText("id [CNIC removed].", 1),
            Cnic.Mask("id 35202-\n1234567-1.", acrossLines: true, replacement: "[CNIC removed]"));
        // The 2.7 overloads still bind and do not join across lines.
        Assert.Equal(0, Cnic.Mask("35202\n1234567\n1", "*").Count);
        Assert.Equal(0, Cnic.Mask("35202\n1234567\n1", replacement: "x").Count);
    }

    [Fact]
    public void DescribesTheBundledDatasets()
    {
        Assert.Equal("Tax years 2020-2027", PakData.GetDataInfo("income-tax-slabs")?.Coverage);
        Assert.Null(PakData.GetDataInfo("BANKS"));
        Assert.Null(PakData.GetDataInfo(null));
        var ids = PakData.ListDataInfo().Select(d => d.Id).ToArray();
        Assert.Equal(ids.Order(StringComparer.Ordinal), ids);
        Assert.Contains("zakat-nisab", ids);
    }

    [Fact]
    public void GivesTheSourceOfLookedUpRatesOnly()
    {
        var looked = SalesTax.Calculate(1000, new SalesTaxOptions { Province = "Punjab", Date = "2026-11-18" });
        Assert.Equal("sales-tax-rates", looked?.Source?.Id);
        Assert.Null(SalesTax.Calculate(1000, new SalesTaxOptions { Rate = 18 })?.Source);
        Assert.Equal(
            "2025-07-01",
            IncomeTax.CalculateSalaryTax(1_800_000, new SalaryTaxOptions { TaxYear = 2026 })?.Source?.EffectiveFrom);
    }

    [Fact]
    public void FindsTheZakatNisabByYearLabelOrDate()
    {
        Assert.Equal(503529, Zakat.GetNisab(1447)?.Nisab);
        Assert.Equal(1446, Zakat.GetNisab(new ZakatYearQuery { Label = "1445-46" })?.ZakatYear);
        Assert.Equal(179689, Zakat.GetNisab(new ZakatYearQuery { Date = "2025-06-01" })?.Nisab);
        // 1 Ramazan 1447 is confirmed as 19 February 2026; earlier years keep the two likely days.
        Assert.Equal(1447, Zakat.GetNisab(new ZakatYearQuery { OnDate = new DateOnly(2026, 2, 19) })?.ZakatYear);
        Assert.Equal(1446, Zakat.GetNisab(new ZakatYearQuery { OnDate = new DateOnly(2026, 2, 18) })?.ZakatYear);
        Assert.Null(Zakat.GetNisab(new ZakatYearQuery { Date = "2025-03-01" }));
        Assert.Equal("2026-02-19", Zakat.GetNisab(1447)?.ValuationDate);
        Assert.Null(Zakat.GetNisab(new ZakatYearQuery()));
        Assert.Equal(15, Zakat.GetYears().Count);
    }

    [Fact]
    public void DeductsZakatAtSource()
    {
        var deduction = Zakat.CalculateDeduction(600_000, new ZakatYearQuery { ZakatYear = 1447 });
        Assert.Equal(15000, deduction?.Zakat);
        Assert.True(deduction?.Deductible);
        Assert.Equal(ZakatExemption.Exempt,
            Zakat.CalculateDeduction(600_000, new ZakatYearQuery { ZakatYear = 1447 }, exempt: true)?.Reason);
        Assert.Equal(ZakatExemption.BelowNisab,
            Zakat.CalculateDeduction(1000, new ZakatYearQuery { ZakatYear = 1447 })?.Reason);
        Assert.Null(Zakat.CalculateDeduction(double.NaN, new ZakatYearQuery { ZakatYear = 1447 }));
    }

    [Fact]
    public void CalculatesWithholdingForFilersAndNonFilers()
    {
        var purchase = Withholding.Calculate(
            new WithholdingInput { Section = "236K", Amount = 60_000_000, Atl = false, TaxYear = 2027 });
        Assert.Equal(14.5, purchase?.Rate);
        Assert.Equal(8_700_000, purchase?.Tax);
        Assert.Equal(WithholdingNonAtlRule.Slabs, purchase?.NonAtlRule);
        Assert.Equal(640, Withholding.Calculate(
            new WithholdingInput { Section = "231AB", Amount = 80_000, Atl = false, TaxYear = 2027 })?.Tax);
        Assert.Equal(2000, Withholding.Calculate(new WithholdingInput
        {
            Section = "151", SubType = "bank-deposit", Amount = 10_000, Atl = true, TaxYear = 2027,
        })?.Tax);
        Assert.Null(Withholding.Calculate(new WithholdingInput { Section = "151", Amount = 10_000, Atl = true }));
        Assert.Null(Withholding.Calculate(new WithholdingInput
        {
            Section = "151", SubType = "sukuk-individual-below-1m", Amount = 1_000_000, Atl = true, TaxYear = 2027,
        }));
        Assert.Equal("final", Withholding.Calculate(new WithholdingInput
        {
            Section = "154B", Amount = 100_000, Atl = true, TaxYear = 2027, Resident = false,
        })?.TaxNature);
        Assert.Empty(Withholding.GetRates(2024));
        Assert.NotEmpty(Withholding.GetRates(2027, "154b"));
    }

    [Fact]
    public void LooksUpCensusPopulation()
    {
        Assert.Equal(13004135, Population.GetDistrict("lahore")?.Population);
        Assert.Null(Population.GetDistrict("Murree")?.Population);
        Assert.Equal("Murree", Population.GetTehsil("Murree")?.CurrentDistrict);
        Assert.Null(Population.GetTehsil("Dasht"));
        Assert.Equal("Kech", Population.GetTehsil("Dasht", "Kech")?.CensusDistrict);
        Assert.Equal("Mastung", Population.GetTehsil("Dasht", "Mastung")?.CensusDistrict);
    }

    [Fact]
    public void ChecksFbrInvoicesAgainstReferenceLists()
    {
        using var doc = JsonDocument.Parse("""
            {"invoiceType":"Sale Invoice","invoiceDate":"2026-11-23","sellerNTNCNIC":"1234567",
             "sellerBusinessName":"A","sellerProvince":"Punjab","sellerAddress":"Lahore",
             "buyerRegistrationType":"Unregistered","buyerBusinessName":"B","buyerProvince":"Sindh",
             "buyerAddress":"Karachi","items":[{"hsCode":"0101.2100","productDescription":"Horse",
             "rate":"18%","uoM":"KG","saleType":"Goods at Standard Rate (default)","quantity":1,
             "valueSalesExcludingST":1000,"salesTaxApplicable":180,"salesTaxWithheldAtSource":0,
             "totalValues":1180,"fixedNotifiedValueOrRetailPrice":0}]}
            """);
        Assert.True(FbrInvoice.Validate(doc.RootElement).Valid);
        var result = FbrInvoice.Validate(doc.RootElement, null, new FbrInvoiceReference
        {
            Provinces = ["PUNJAB"],
            HsUom = new Dictionary<string, IReadOnlyList<string>?> { ["0101.2100"] = ["Numbers, pieces, units"] },
        });
        Assert.Equal(["0074", "0099"], result.Errors.Select(e => e.Code));
        Assert.Equal("Goods at Standard Rate (default)", FbrInvoice.GetSaleTypes()[0].SaleType);
    }
}
