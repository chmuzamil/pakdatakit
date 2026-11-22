<?php

declare(strict_types=1);

namespace PakDataKit\Tests;

use DateTimeImmutable;
use PakDataKit\Cnic;
use PakDataKit\DataInfo;
use PakDataKit\DataSource;
use PakDataKit\FbrInvoice;
use PakDataKit\FbrSaleType;
use PakDataKit\IncomeTax;
use PakDataKit\Internal\Data;
use PakDataKit\PakData;
use PakDataKit\Population;
use PakDataKit\SalesTax;
use PakDataKit\Withholding;
use PakDataKit\WithholdingTax;
use PakDataKit\Zakat;
use PHPUnit\Framework\Attributes\RunInSeparateProcess;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
use stdClass;
use Throwable;

/**
 * 2.8.0: CNICs across line breaks, the data manifest and dated sources,
 * Zakat, withholding tax, census population and FBR reference lists.
 */
final class DataReleaseTest extends TestCase
{
    /** Hostile values for the number and option parameters. */
    private const VALUES = [
        null, true, false, '', ' ', '1447', '2027', 'x', [], [1], NAN, INF, -INF, -0.0, -1, 0, 0.5, 1e300,
        PHP_INT_MAX, PHP_INT_MIN, "\xff",
    ];

    // ------------------------------------------------------------------ CNIC

    public function testCnicsAcrossSingleLineBreaksOnlyWhenAsked(): void
    {
        $text = "CNIC\n35202\n1234567\n1";
        self::assertSame([], Cnic::findAll($text));
        $found = Cnic::findAll($text, acrossLines: true);
        self::assertCount(1, $found);
        self::assertSame('35202-1234567-1', $found[0]->formatted);
        self::assertSame(5, $found[0]->start);
        self::assertSame(mb_strlen($text), $found[0]->end);
        self::assertSame('35202-1234567-1', Cnic::findAll("35202 -\r\n 1234567\r1", acrossLines: true)[0]->formatted ?? null);
        // A blank line never joins groups.
        self::assertSame([], Cnic::findAll("35202\n\n1234567\n1", acrossLines: true));
        self::assertSame([], Cnic::findAll("35202\r\n\r\n1234567-1", acrossLines: true));
    }

    public function testMaskAcrossLinesKeepsTheLineBreaks(): void
    {
        $masked = Cnic::mask("id 35202\n1234567\n1.", acrossLines: true);
        self::assertSame("id XXXXX\nXXXXXXX\nX.", $masked->text);
        self::assertSame(1, $masked->count);
        $replaced = Cnic::mask("id 35202\n1234567\n1.", replacement: '[CNIC]', acrossLines: true);
        self::assertSame('id [CNIC].', $replaced->text);
        self::assertSame("35202\n1234567\n1", Cnic::mask("35202\n1234567\n1")->text);
    }

    // -------------------------------------------------------------- manifest

    public function testDataInfoListsEveryBundledDatasetInIdOrder(): void
    {
        $list = PakData::listDataInfo();
        $ids = array_map(static fn (DataInfo $info): string => $info->id, $list);
        $sorted = $ids;
        sort($sorted, SORT_STRING);
        self::assertSame($sorted, $ids);
        self::assertContains('zakat-nisab', $ids);
        self::assertSame('Tax years 2020-2027', PakData::getDataInfo('income-tax-slabs')?->coverage);
        self::assertArrayNotHasKey('series', PakData::getDataInfo('income-tax-slabs')->toArray());
        self::assertNull(PakData::getDataInfo('BANKS'));
        self::assertNull(PakData::getDataInfo(42));
        foreach ($list as $info) {
            self::assertFileExists(dirname(__DIR__) . '/data/' . substr($info->file, 0, -5) . '.php');
        }
    }

    public function testResultsNameTheirSource(): void
    {
        $salary = IncomeTax::calculateSalary(1_800_000, ['taxYear' => 2026]);
        self::assertInstanceOf(DataSource::class, $salary?->source);
        self::assertSame(['income-tax-slabs', '2025-07-01', '2026-06-30'], [
            $salary->source->id, $salary->source->effectiveFrom, $salary->source->effectiveTo,
        ]);
        $looked = SalesTax::calculate(1000, ['province' => 'Punjab', 'date' => '2026-11-18']);
        self::assertSame('sales-tax-rates', $looked?->source?->id);
        self::assertArrayHasKey('source', $looked->toArray());
        $given = SalesTax::calculate(1000, ['rate' => 18]);
        self::assertNull($given?->source);
        self::assertSame(['net', 'tax', 'gross', 'rate'], array_keys($given->toArray()));
        $inclusive = SalesTax::calculate(1160, ['province' => 'Punjab', 'date' => '2026-11-18', 'inclusive' => true]);
        self::assertSame([1000.0, 'sales-tax-rates'], [$inclusive?->net, $inclusive?->source?->id]);
    }

    // ----------------------------------------------------------------- Zakat

    public function testZakatNisabAndDeduction(): void
    {
        self::assertSame(503529, Zakat::getNisab(zakatYear: 1447)?->nisab);
        self::assertSame(1446, Zakat::getNisab(zakatYear: '1445-46')?->zakatYear);
        self::assertSame(1446, Zakat::getNisab(zakatYear: ' 1446 ')?->zakatYear);
        self::assertSame(179689, Zakat::getNisab(date: '2025-06-01')?->nisab);
        self::assertSame(179689, Zakat::getNisab(date: new DateTimeImmutable('2025-06-01'))?->nisab);
        // The first of the two likely days of 1 Ramazan is ambiguous.
        self::assertNull(Zakat::getNisab(date: '2026-02-19'));
        self::assertSame(1447, Zakat::getNisab(date: '2026-02-20')?->zakatYear);
        self::assertNull(Zakat::getNisab());
        self::assertSame(range(1433, 1447), Zakat::getYears());

        $deduction = Zakat::deduction(600000, zakatYear: 1447);
        self::assertSame([true, null, 15000.0], [$deduction?->deductible, $deduction?->reason, $deduction?->zakat]);
        self::assertSame('exempt', Zakat::deduction(600000, zakatYear: 1447, exempt: true)?->reason);
        self::assertSame('below-nisab', Zakat::deduction(503528.99, zakatYear: 1447)?->reason);
        self::assertNull(Zakat::deduction('600000', zakatYear: 1447));
        self::assertNull(Zakat::deduction(600000));
    }

    // ----------------------------------------------------------- withholding

    public function testWithholdingByAtlStatus(): void
    {
        $nonAtl = Withholding::calculate('236K', 60_000_000, atl: false, taxYear: 2027);
        self::assertInstanceOf(WithholdingTax::class, $nonAtl);
        self::assertSame([14.5, 8700000.0, 'slabs'], [$nonAtl->rate, $nonAtl->tax, $nonAtl->nonAtlRule]);
        self::assertSame(640.0, Withholding::calculate(' 231ab ', 80_000, atl: false, taxYear: 2027)?->tax);
        self::assertTrue(Withholding::calculate('231AB', 50_000, atl: false, taxYear: 2027)?->threshold?->withinThreshold);
        self::assertSame(
            2000.0,
            Withholding::calculate('151', 10_000, atl: true, subType: 'bank-deposit', taxYear: 2027)?->tax,
        );
        // 151 has several cases, so the case is needed.
        self::assertNull(Withholding::calculate('151', 10_000, atl: true, taxYear: 2027));
        self::assertNull(Withholding::calculate('236K', 60_000_000, atl: 'no', taxYear: 2027));
        self::assertNull(Withholding::calculate('236K', 60_000_000, atl: true));
        self::assertSame(2027, Withholding::calculate('236K', 60_000_000, atl: true, date: '2026-07-01')?->taxYear);
        self::assertSame([], Withholding::getRates(2024));
        self::assertCount(1, Withholding::getRates(2027, '154b'));
        self::assertEquals(Withholding::getRates(2027, '153'), Withholding::getRates(2027, 153));
    }

    public function testWithholdingAndZakatNeverThrow(): void
    {
        foreach (self::VALUES as $value) {
            try {
                Withholding::calculate($value, 1000, atl: true, taxYear: 2027);
                Withholding::calculate('153', $value, atl: true, subType: 'goods-company', taxYear: 2027);
                Withholding::calculate('153', 1000, atl: $value, subType: $value, taxYear: $value, date: $value);
                Withholding::calculate('236C', 1000, atl: true, date: $value, lateFiler: true);
                Withholding::getRates($value, $value);
                Zakat::getNisab(zakatYear: $value, date: $value);
                Zakat::getNisab(date: $value);
                Zakat::deduction($value, zakatYear: 1447);
                Zakat::deduction(1000, zakatYear: $value, date: $value);
                Population::getTehsil('Saddar', $value);
            } catch (Throwable $e) {
                self::fail('threw ' . $e::class . ' for ' . var_export($value, true) . ': ' . $e->getMessage());
            }
        }
        $this->addToAssertionCount(1);
    }

    // ------------------------------------------------------------ population

    public function testPopulationByDistrictAndTehsil(): void
    {
        self::assertSame(13004135, Population::getDistrict(' lahore ')?->population);
        $murree = Population::getDistrict('Murree');
        self::assertNull($murree?->population);
        self::assertSame('Rawalpindi', $murree?->censusDistrict);
        self::assertSame('Murree', Population::getTehsil('Murree')?->currentDistrict);
        // Not unique without the district.
        self::assertNull(Population::getTehsil('Saddar'));
        self::assertSame('Quetta', Population::getTehsil('Saddar', 'Quetta')?->censusDistrict);
        // Rows whose current district is unknown are still checked by the census district.
        self::assertSame('Mastung', Population::getTehsil('Dasht', 'Mastung')?->censusDistrict);
        self::assertNull(Population::getTehsil(42, 'x'));
    }

    // ------------------------------------------------------------------- FBR

    public function testSaleTypes(): void
    {
        $types = FbrInvoice::getSaleTypes();
        self::assertContainsOnlyInstancesOf(FbrSaleType::class, $types);
        self::assertSame(
            ['saleType' => 'Goods at Standard Rate (default)', 'scenarioIds' => ['SN001', 'SN002', 'SN026']],
            $types[0]->toArray(),
        );
    }

    public function testValidationAgainstReferenceLists(): void
    {
        $invoice = self::invoice();
        self::assertSame([], self::codes(FbrInvoice::validate($invoice, ['reference' => [
            'provinces' => ['punjab', 'SINDH'],
            'saleTypes' => ['Goods at standard rate (default)'],
            'uoms' => [' numbers, pieces, units '],
            'hsUom' => ['0101.2100' => ['Numbers, pieces, units']],
        ]])));
        self::assertSame(
            ['0073:sellerProvince', '0074:buyerProvince', '0013:items[0].saleType', '0099:items[0].uoM', ':items[0].hsCode'],
            self::codes(FbrInvoice::validate($invoice, ['reference' => [
                'provinces' => [],
                'saleTypes' => ['Exempt Goods'],
                'uoms' => ['KG'],
                'hsUom' => ['9999.9999' => ['KG']],
            ]])),
        );
        // Objects as json_decode() gives them.
        $reference = json_decode('{"hsUom": {"0101.2100": ["KG"]}}', false, 512, JSON_THROW_ON_ERROR);
        self::assertSame(
            ['0099:items[0].uoM'],
            self::codes(FbrInvoice::validate($invoice, ['reference' => $reference])),
        );
        foreach ([null, 'x', 42, [], ['provinces' => 'PUNJAB'], ['hsUom' => ['a', 'b']], new stdClass()] as $ignored) {
            self::assertSame([], self::codes(FbrInvoice::validate($invoice, ['reference' => $ignored])));
        }
    }

    // --------------------------------------------------------- lazy loading

    #[RunInSeparateProcess]
    public function testNewDatasetsLoadOnFirstUse(): void
    {
        $loaded = static fn (): array => array_keys(
            (new ReflectionClass(Data::class))->getStaticPropertyValue('cache'),
        );
        Cnic::findAll('35202-1234567-1');
        self::assertSame([], array_intersect(
            ['manifest', 'zakat-nisab', 'withholding-rates', 'district-population', 'tehsil-population', 'fbr-sale-types'],
            $loaded(),
        ));
        Zakat::getYears();
        self::assertContains('zakat-nisab', $loaded());
        self::assertNotContains('withholding-rates', $loaded());
    }

    // --------------------------------------------------------------- helpers

    /** @return array<string, mixed> */
    private static function invoice(): array
    {
        return [
            'invoiceType' => 'Sale Invoice', 'invoiceDate' => '2025-04-21', 'sellerNTNCNIC' => '1234567',
            'sellerBusinessName' => 'Example Traders', 'sellerProvince' => 'Sindh', 'sellerAddress' => 'Karachi',
            'buyerNTNCNIC' => '7654321', 'buyerBusinessName' => 'Example Buyer', 'buyerProvince' => 'Punjab',
            'buyerAddress' => 'Lahore', 'buyerRegistrationType' => 'Registered',
            'items' => [[
                'hsCode' => '0101.2100', 'productDescription' => 'Horses', 'rate' => '18%',
                'uoM' => 'Numbers, pieces, units', 'quantity' => 1, 'totalValues' => 1180,
                'valueSalesExcludingST' => 1000, 'fixedNotifiedValueOrRetailPrice' => 0, 'salesTaxApplicable' => 180, 'salesTaxWithheldAtSource' => 0,
                'extraTax' => '', 'furtherTax' => 0, 'sroScheduleNo' => '', 'fedPayable' => 0, 'discount' => 0,
                'saleType' => 'Goods at standard rate (default)', 'sroItemSerialNo' => '',
            ]],
        ];
    }

    /** @return list<string> */
    private static function codes(\PakDataKit\FbrInvoiceValidation $validation): array
    {
        return array_map(
            static fn ($error): string => ($error->code ?? '') . ':' . $error->field,
            $validation->errors,
        );
    }
}
