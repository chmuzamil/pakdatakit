<?php

declare(strict_types=1);

namespace PakDataKit\Tests;

use PakDataKit\IncomeTax;
use PakDataKit\Numbers;
use PakDataKit\RaastQr;
use PHPUnit\Framework\TestCase;

/**
 * Landline service numbers, Raast QR kind and merchant QRs without an IBAN,
 * and the salary tax surcharge.
 */
final class ReleaseChangesTest extends TestCase
{
    private const IBAN = 'PK36SCBL0000001123456702';

    // ----------------------------------------------------------- landlines

    public function testLandlineAcceptsServiceNumbersOnlyWhenAsked(): void
    {
        self::assertTrue(Numbers::validateLandline('042-35761234'));
        self::assertTrue(Numbers::validateLandline('042-35761234', services: true));
        foreach (['021-111-123-456', '111-123-456', '0800-78686', '+92 800 78686', '0900 12345'] as $number) {
            self::assertFalse(Numbers::validateLandline($number), $number);
            self::assertTrue(Numbers::validateLandline($number, services: true), $number);
        }
        foreach (['0122 123456', '0300-1234567', 'garbage'] as $number) {
            self::assertFalse(Numbers::validateLandline($number, services: true), $number);
        }
        self::assertFalse(Numbers::validateLandline(null, services: true));
        self::assertFalse(Numbers::validateLandline(42, services: true));
    }

    public function testTollFreeIsEightHundredAndFiveOrSixDigits(): void
    {
        self::assertSame('toll-free', Numbers::getNumberType('0800-78686'));
        // Six digits: PTA's National Numbering Plan 2008 (2.7.1).
        self::assertSame('toll-free', Numbers::getNumberType('0800005000'));
        self::assertNull(Numbers::getNumberType('0800-12345678'));
        self::assertSame('toll-free', Numbers::getNumberType('0800 123456'));
        self::assertNull(Numbers::getNumberType('0800-1234'));
    }

    // ---------------------------------------------------------------- Raast

    public function testRaastValidationReturnsTheKind(): void
    {
        self::assertSame('p2p', RaastQr::validate(RaastQr::createP2P(['iban' => self::IBAN]))->kind);
        $none = RaastQr::validate('not a qr');
        self::assertNull($none->kind);
        self::assertSame(
            ['valid', 'kind', 'errors', 'warnings', 'qr'],
            array_keys($none->toArray()),
        );
    }

    public function testMerchantQrWithoutAnIbanIsValidWithAWarning(): void
    {
        $payload = RaastQr::createMerchant([
            'merchantAccount' => ['fields' => ['00' => 'A000000736', '01' => 'MERCHANT42']],
            'merchantName' => 'Aziz General Store',
            'city' => 'Karachi',
        ]);
        $result = RaastQr::validate($payload);
        self::assertTrue($result->valid);
        self::assertSame('merchant', $result->kind);
        self::assertSame([], $result->errors);
        self::assertSame(['no-iban'], $result->warnings);
    }

    public function testP2pQrWithoutAnIbanIsStillAnError(): void
    {
        $result = RaastQr::validate('00020201021102020010042E82');
        self::assertSame('p2p', $result->kind);
        self::assertContains('no-iban', $result->errors);
        self::assertFalse($result->valid);
    }

    // ------------------------------------------------------ salary surcharge

    public function testSurchargeIsOffByDefault(): void
    {
        $plain = IncomeTax::calculateSalary(1_800_000, ['taxYear' => 2026]);
        self::assertSame(
            ['tax', 'surcharge', 'total', 'monthly', 'effectiveRate', 'slab', 'taxYear', 'source'],
            array_keys($plain->toArray()),
        );
        self::assertSame(72000.0, $plain->tax);
        self::assertSame(0.0, $plain->surcharge);
        self::assertSame(72000.0, $plain->total);
        self::assertSame(6000.0, $plain->monthly);

        $high = IncomeTax::calculateSalary(12_000_000, ['taxYear' => 2026]);
        self::assertSame(0.0, $high->surcharge);
        self::assertSame($high->tax, $high->total);
    }

    public function testSurchargeWhenAsked(): void
    {
        $result = IncomeTax::calculateSalary(12_000_000, ['taxYear' => 2026, 'includeSurcharge' => true]);
        self::assertSame(3381000.0, $result->tax);
        self::assertSame(304290.0, $result->surcharge);
        self::assertSame(3685290.0, $result->total);
        self::assertSame(307107.5, $result->monthly);

        self::assertSame(346500.0, IncomeTax::calculateSalary(12_000_000, ['taxYear' => 2025, 'includeSurcharge' => true])->surcharge);
        foreach ([2027, 2024, 2020] as $taxYear) {
            self::assertSame(0.0, IncomeTax::calculateSalary(12_000_000, ['taxYear' => $taxYear, 'includeSurcharge' => true])->surcharge);
        }
        // Only `true` turns it on.
        self::assertSame(0.0, IncomeTax::calculateSalary(12_000_000, ['taxYear' => 2026, 'includeSurcharge' => 1])->surcharge);
        $monthly = IncomeTax::calculateMonthlySalary(1_000_000, ['taxYear' => 2026, 'includeSurcharge' => true]);
        self::assertSame(304290.0, $monthly->surcharge);
    }

    public function testSurchargeOnlyAboveTenMillionOnTheWholeTax(): void
    {
        $at = static fn (int|float $income): float => IncomeTax::calculateSalary(
            $income,
            ['taxYear' => 2026, 'includeSurcharge' => true],
        )->surcharge;
        self::assertSame(0.0, $at(10_000_000));
        self::assertSame(241290.0, $at(10_000_000.01));
    }

    public function testEachYearHasItsSurcharge(): void
    {
        self::assertNull(IncomeTax::getSalarySlabs(2024)->surcharge);
        $y2025 = IncomeTax::getSalarySlabs(2025)->surcharge;
        self::assertSame(10, $y2025->rate);
        self::assertSame(10_000_000, $y2025->over);
        self::assertSame(9, IncomeTax::getSalarySlabs(2026)->surcharge->rate);
        self::assertSame(0, IncomeTax::getSalarySlabs(2027)->surcharge->rate);
        foreach ([2025, 2026, 2027] as $year) {
            self::assertStringStartsWith('https://download1.fbr.gov.pk/', IncomeTax::getSalarySlabs($year)->surcharge->source);
        }
        self::assertSame(
            ['rate', 'over', 'law', 'source'],
            array_keys(IncomeTax::getSalarySlabs(2026)->toArray()['surcharge']),
        );
    }
}
