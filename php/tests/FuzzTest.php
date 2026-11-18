<?php

declare(strict_types=1);

namespace PakDataKit\Tests;

use DateTimeImmutable;
use PakDataKit\Address;
use PakDataKit\Bills;
use PakDataKit\Cnic;
use PakDataKit\Courier;
use PakDataKit\Currency;
use PakDataKit\FbrInvoice;
use PakDataKit\Geo;
use PakDataKit\Hijri;
use PakDataKit\HijriDate;
use PakDataKit\Holidays;
use PakDataKit\Iban;
use PakDataKit\IncomeTax;
use PakDataKit\Input;
use PakDataKit\Networks;
use PakDataKit\Numbers;
use PakDataKit\Passport;
use PakDataKit\Phone;
use PakDataKit\Postal;
use PakDataKit\Quality;
use PakDataKit\RaastQr;
use PakDataKit\SalesTax;
use PakDataKit\Tax;
use PakDataKit\Text;
use PakDataKit\VehiclePlate;
use PakDataKit\WhatsApp;
use PakDataKit\Words;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
use ReflectionMethod;
use ReflectionNamedType;
use Throwable;

/**
 * Feeds random and hostile strings to every public method that takes a
 * string, and checks the no-throw contract: validators return false, parsers
 * and lookups return null (or an empty list), and nothing throws.
 */
final class FuzzTest extends TestCase
{
    private const CLASSES = [
        Address::class, Bills::class, Cnic::class, Courier::class, Geo::class, Holidays::class, Iban::class, Input::class,
        Networks::class, Numbers::class, Passport::class, Phone::class, Postal::class, Quality::class, RaastQr::class,
        Tax::class, Text::class, VehiclePlate::class, WhatsApp::class,
    ];

    /** @return list<string|null> Inputs that can never be valid for any validator or parser. */
    private static function hostile(): array
    {
        return [
            null,
            '',
            ' ',
            "\t\r\n",
            "\u{a0}\u{2028}\u{2029}\u{feff}",
            "\0",
            "\0\0\0",
            'garbage',
            '!@#$%^&*()',
            "'; DROP TABLE users; --",
            '<script>alert(1)</script>',
            '../../etc/passwd',
            '%00%0a%0d',
            "\xff",                       // not UTF-8
            "\xc3\x28",                   // invalid 2-byte sequence
            "\xed\xa0\x80",               // UTF-8 encoded surrogate
            "\xf8\x88\x80\x80\x80",       // 5-byte sequence
            "a\x80b",
            "\u{ffff}\u{fffe}",           // noncharacters
            "\u{202e}\u{202d}\u{200f}",   // bidi controls
            "\u{200b}\u{200c}\u{200d}",   // zero-width characters
            "e\u{301}\u{301}\u{301}",     // stacked combining marks
            "\u{661}\u{662}\u{663}",      // Arabic-Indic digits alone
            '１２３４５',                    // full-width digits
            'ＰＫ３６',                      // full-width letters
            'ß',
            'İıΣς',
            '🇵🇰',
            '-',
            '--------',
            '+',
            '+92',
            '0',
            str_repeat('(', 20),
            str_repeat(')', 20),
            '[[[[\\\\\\\\]]]]',
            '{0}{1}{2}%s%d%n',
            str_repeat('A', 200_000),
            str_repeat('9', 200_000),
            str_repeat(' ', 200_000),
            str_repeat('-', 200_000),
            str_repeat(',', 20_000),
            str_repeat("\xf0\x9f\x98\x80", 5_000),
            str_repeat('12345 ', 30_000),
            str_repeat('a,', 20_000),
            str_repeat('p. o. box ', 10_000),
            str_repeat('0002', 50_000),
            // Regex bait: long runs that almost match, then fail.
            str_repeat('1', 50_000) . '!',
            'PK' . str_repeat('0', 50_000) . '!',
            str_repeat('A', 50_000) . '-' . str_repeat('1', 50_000) . '/',
            '35202' . str_repeat('-', 50_000) . '1234567-1!',
            str_repeat('kia ', 20_000) . "\xff",
        ];
    }

    /** @return iterable<string, array{0: ReflectionMethod}> */
    public static function stringMethods(): iterable
    {
        foreach (self::CLASSES as $class) {
            foreach ((new ReflectionClass($class))->getMethods(ReflectionMethod::IS_STATIC) as $method) {
                $parameters = $method->getParameters();
                if (!$method->isPublic() || $parameters === [] || str_contains((string) $method->getDocComment(), '@internal')) {
                    continue;
                }
                $type = $parameters[0]->getType();
                $takesString = $type !== null && str_contains((string) $type, 'string');
                $restOptional = array_reduce(
                    array_slice($parameters, 1),
                    static fn (bool $ok, $p): bool => $ok && $p->isOptional(),
                    true,
                );
                if ($takesString && $restOptional) {
                    yield $method->getDeclaringClass()->getShortName() . '::' . $method->getName() => [$method];
                }
            }
        }
    }

    public function testCoversEveryStringMethod(): void
    {
        $names = array_keys(iterator_to_array(self::stringMethods()));
        self::assertGreaterThanOrEqual(45, count($names));
        foreach ([
            'Cnic::validate', 'Cnic::getInfo', 'Phone::validate', 'Phone::format', 'Phone::analyze',
            'Networks::getNetwork', 'Numbers::analyze', 'Numbers::validateLandline', 'Iban::validate',
            'Iban::getBank', 'Iban::getBankInfo', 'Tax::analyzeNtn', 'Tax::validateNtn', 'Tax::validateStrn',
            'Passport::validate', 'VehiclePlate::parse', 'VehiclePlate::validate', 'Postal::getCity',
            'Postal::search', 'Postal::getPostOffice', 'Postal::searchPostOffices',
            'Geo::getProvince', 'Geo::searchCities', 'Geo::getDivisions',
            'Geo::getDivisionOfDistrict', 'Geo::getTehsils', 'Geo::getTehsilDistrict', 'WhatsApp::createLink', 'Text::normalize',
            'Text::normalizeRomanUrdu', 'Address::parse', 'Input::formatCnic', 'Input::checkIban',
            'RaastQr::parse', 'RaastQr::validate', 'Holidays::isHoliday', 'Holidays::getHolidaysOn',
            'Holidays::tryGetHolidaysOn', 'Quality::scoreAddress', 'Quality::phoneRiskSignals',
            'Bills::parseElectricityRef', 'Bills::validateElectricityRef', 'Courier::normalizeCity',
        ] as $expected) {
            self::assertContains($expected, $names);
        }
    }

    #[DataProvider('stringMethods')]
    public function testHostileInput(ReflectionMethod $method): void
    {
        $name = $method->getDeclaringClass()->getShortName() . '::' . $method->getName();
        $returnType = $method->getReturnType();
        foreach (self::hostile() as $input) {
            $label = $name . '(' . self::describe($input) . ')';
            try {
                $result = $method->invoke(null, $input);
            } catch (Throwable $e) {
                self::fail($label . ' threw ' . $e::class . ': ' . $e->getMessage());
            }
            if ($returnType instanceof ReflectionNamedType && $returnType->getName() === 'bool') {
                // validate*, is*: hostile input is never valid.
                self::assertFalse($result, $label . ' returned true');
            } elseif ($returnType !== null && $returnType->allowsNull()) {
                // parse, get*, analyze*, try*: nothing to return.
                self::assertNull($result, $label . ' returned a value');
            } elseif ($returnType instanceof ReflectionNamedType && $returnType->getName() === 'array') {
                self::assertIsArray($result);
            } else {
                self::assertNotNull($result, $label . ' returned null');
            }
        }
    }

    #[DataProvider('stringMethods')]
    public function testRandomInput(ReflectionMethod $method): void
    {
        $name = $method->getDeclaringClass()->getShortName() . '::' . $method->getName();
        // Seeded, so a failure is reproducible.
        mt_srand(crc32($name));
        for ($i = 0; $i < 300; $i++) {
            $input = self::randomString();
            try {
                $method->invoke(null, $input);
            } catch (Throwable $e) {
                self::fail($name . '(' . self::describe($input) . ') threw ' . $e::class . ': ' . $e->getMessage());
            }
        }
        $this->addToAssertionCount(1);
    }

    public function testTryMethodsNeverThrow(): void
    {
        self::assertNull(Holidays::tryGetHolidaysOn('14-08-2026'));
        self::assertNull(Holidays::tryGetHolidaysOn('1900-01-01'));
        self::assertCount(1, Holidays::tryGetHolidaysOn('2026-08-14') ?? []);
        self::assertFalse(Holidays::isHoliday('not a date'));
        self::assertSame([], Holidays::getHolidaysOn('0000-00-00'));
        self::assertTrue(Holidays::isHoliday(new DateTimeImmutable('2026-08-14')));

        self::assertNull(Hijri::tryFromHijri(new HijriDate(1447, 13, 1)));
        self::assertSame('2026', Hijri::tryFromHijri(new HijriDate(1447, 9, 1))?->format('Y'));

        self::assertNull(Currency::tryFormatPkr(NAN));
        self::assertNull(Currency::tryFormatLakh(INF));
        self::assertSame('Rs. 150,000', Currency::tryFormatPkr(150000));
        self::assertNull(Words::tryNumberToWords(1.5));
        self::assertNull(Words::tryNumberToWords(5, 'fr'));
        self::assertNull(Words::tryAmountInWords(-1));
        self::assertSame('five rupees', Words::tryAmountInWords(5));

        self::assertNull(RaastQr::tryCreateP2P(['iban' => 'garbage']));
        self::assertNull(RaastQr::tryCreateP2P([]));
        self::assertNull(RaastQr::tryCreateP2P(['iban' => 'PK36SCBL0000001123456702', 'amount' => 10])); // no expiry
        self::assertNull(RaastQr::tryCreateP2P(['iban' => ['not', 'a', 'string']]));
        $payload = RaastQr::tryCreateP2P(['iban' => 'PK36SCBL0000001123456702']);
        self::assertTrue(RaastQr::validate($payload)->valid);
        self::assertNull(RaastQr::tryCreateMerchant([]));
        self::assertNull(RaastQr::tryCreateMerchant([
            'merchantAccount' => ['fields' => []],
            'merchantName' => 'Shop',
            'city' => 'Lahore',
        ]));

        // The npm package throws for a message with an unpaired surrogate.
        self::assertNull(WhatsApp::createLink('0300 1234567', "hi \xed\xa0\x80"));
        self::assertSame('https://wa.me/923001234567?text=hi', WhatsApp::createLink('0300 1234567', 'hi'));
    }

    public function testGasConsumerNumberHandlesHostileInput(): void
    {
        $companies = [null, '', 'SNGPL', 'SSGC', 'sngpl', 'ssgc', '__proto__', 'constructor', 'toString', "ÿ", 'ßgc'];
        foreach (self::hostile() as $input) {
            foreach ([...$companies, $input] as $company) {
                try {
                    $result = Bills::validateGasConsumerNumber($input, $company);
                } catch (Throwable $e) {
                    self::fail('Bills::validateGasConsumerNumber(' . self::describe($input) . ', ' . self::describe($company)
                        . ') threw ' . $e::class . ': ' . $e->getMessage());
                }
                self::assertFalse($result, self::describe($input) . ', ' . self::describe($company));
            }
        }
        mt_srand(crc32('Bills::validateGasConsumerNumber'));
        for ($i = 0; $i < 300; $i++) {
            Bills::validateGasConsumerNumber(self::randomString(), self::randomString());
            Bills::validateGasConsumerNumber(self::randomString(), 'SSGC');
        }
        self::assertTrue(Bills::validateGasConsumerNumber('1234567890', 'ßgc')); // 'ß'.toUpperCase() is 'SS'
    }

    public function testAddressFormatHandlesHostileInput(): void
    {
        foreach (self::hostile() as $input) {
            self::assertIsString(Address::format(Address::parse($input)));
        }
        self::assertSame('', Address::format([]));
        self::assertSame('', Address::format(['street' => 5, 'raw' => null]));
    }

    public function testSalesTaxHandlesHostileInput(): void
    {
        $numbers = [
            null, true, false, '18', '', [], [18], new \stdClass(), NAN, INF, -INF, -0.0, -1, -0.01, 0, 0.0,
            5e-324, 1e-7, 0.005, 1.005, 99.999, 100.01, 1e12, 1e12 + 0.01, 1e300, PHP_INT_MAX, PHP_INT_MIN,
            999_999_999_999.99, 999_999_999_999.995,
        ];
        foreach ($numbers as $value) {
            try {
                SalesTax::splitInclusive($value, 18);
                SalesTax::splitInclusive(1000, $value);
                SalesTax::calculate($value, ['rate' => 18]);
                SalesTax::calculate(1000, ['rate' => $value]);
                SalesTax::calculate($value, ['rate' => $value, 'inclusive' => true]);
                SalesTax::calculate(1000, ['kind' => $value, 'province' => $value, 'date' => $value, 'inclusive' => $value]);
                SalesTax::getRate(['kind' => 'goods', 'province' => $value, 'date' => $value]);
            } catch (Throwable $e) {
                self::fail('SalesTax threw ' . $e::class . ' for ' . var_export($value, true) . ': ' . $e->getMessage());
            }
        }
        foreach (self::hostile() as $input) {
            $label = 'SalesTax(' . self::describe($input) . ')';
            try {
                self::assertNull(SalesTax::getRate(['kind' => $input, 'date' => '2026-11-18']), $label);
                self::assertNull(SalesTax::getRate(['kind' => 'services', 'province' => $input, 'date' => '2026-11-18']), $label);
                self::assertNull(SalesTax::getRate(['kind' => 'goods', 'province' => 'Punjab', 'date' => $input ?? 'x']), $label);
                self::assertNull(SalesTax::calculate(1000, ['province' => $input ?? 'x']), $label);
                self::assertNull(SalesTax::calculate($input, ['rate' => 18]), $label);
                self::assertNull(SalesTax::splitInclusive(1180, $input), $label);
            } catch (Throwable $e) {
                self::fail($label . ' threw ' . $e::class . ': ' . $e->getMessage());
            }
        }
        self::assertNull(SalesTax::getRate(null));
        self::assertNull(SalesTax::getRate([]));
        self::assertNull(SalesTax::calculate(1000, null));
        self::assertNull(SalesTax::calculate(1000, []));
        self::assertNull(SalesTax::splitInclusive(true, 18));
        self::assertNull(SalesTax::splitInclusive(1000, true));
        self::assertNull(SalesTax::splitInclusive(1e12 + 1, 18));
        self::assertNull(SalesTax::splitInclusive(1000, 16.666));
        self::assertSame(['net' => 1000.0, 'tax' => 180.0, 'gross' => 1180.0, 'rate' => 18.0], SalesTax::splitInclusive(1180, 18)?->toArray());
        self::assertSame(1.01, SalesTax::calculate(1.005, ['rate' => 0])?->net);
        self::assertSame(1e12, SalesTax::calculate(1e12, ['rate' => 100])?->net);
        self::assertSame(2e12, SalesTax::calculate(1e12, ['rate' => 100])?->gross);
        self::assertSame(18, SalesTax::getRate(['kind' => 'goods', 'date' => new DateTimeImmutable('2026-11-18')])?->rate);
        self::assertSame(15, SalesTax::getRate(['kind' => 'services', 'province' => ' ict ', 'date' => ' 2026-11-18 '])?->rate);
        self::assertNull(SalesTax::getRate(['kind' => 'goods', 'date' => '2023-02-29']));
        self::assertNotNull(SalesTax::getRate(['kind' => 'goods']));
    }

    public function testFbrInvoiceHandlesHostileInput(): void
    {
        $values = [
            null, true, false, '', '18', [], [[]], ['items' => null], new \stdClass(), NAN, INF, -INF, -0.0, -1, 0,
            0.001, 1e300, PHP_INT_MAX, PHP_INT_MIN, '__proto__', 'constructor', ['a', 'b'], [1 => 'x'],
        ];
        $line = [
            'hsCode' => '0101.2100', 'productDescription' => 'Horses', 'rate' => '18%', 'uoM' => 'Numbers, pieces, units',
            'quantity' => 1, 'valueSalesExcludingST' => 1000, 'saleType' => 'Goods at standard rate (default)',
        ];
        $invoice = [
            'invoiceType' => 'Sale Invoice', 'invoiceDate' => '2025-04-21', 'sellerNTNCNIC' => '1234567',
            'sellerBusinessName' => 'Example Traders', 'sellerProvince' => 'Sindh', 'sellerAddress' => 'Karachi',
            'buyerNTNCNIC' => '7654321', 'buyerBusinessName' => 'Example Buyer', 'buyerProvince' => 'Punjab',
            'buyerAddress' => 'Lahore', 'buyerRegistrationType' => 'Registered', 'items' => [$line],
        ];
        $keys = [...array_keys($invoice), 'invoiceRefNo', 'scenarioId'];
        $lineKeys = [
            ...array_keys($line), 'totalValues', 'fixedNotifiedValueOrRetailPrice', 'salesTaxApplicable',
            'salesTaxWithheldAtSource', 'extraTax', 'furtherTax', 'fedPayable', 'discount', 'sroScheduleNo', 'sroItemSerialNo',
        ];
        foreach ([...$values, ...self::hostile()] as $value) {
            try {
                FbrInvoice::build($value);
                self::assertFalse(FbrInvoice::validate($value)->valid);
                FbrInvoice::expectedSalesTax($value);
                FbrInvoice::validate($invoice, ['today' => $value]);
                foreach ($keys as $key) {
                    FbrInvoice::build([...$invoice, $key => $value]);
                    FbrInvoice::validate([...$invoice, $key => $value]);
                    FbrInvoice::validate((object) [...$invoice, $key => $value]);
                }
                foreach ($lineKeys as $key) {
                    $item = [...$line, $key => $value];
                    FbrInvoice::expectedSalesTax($item);
                    FbrInvoice::expectedSalesTax([...$item, 'rate' => 'Rs.3']);
                    FbrInvoice::expectedSalesTax([...$item, 'saleType' => '3rd Schedule Goods']);
                    FbrInvoice::build([...$invoice, 'items' => [$item, (object) $item]]);
                    FbrInvoice::validate([...$invoice, 'items' => [$item, [...$item, 'rate' => 'Rs 3'], (object) $item]]);
                }
            } catch (Throwable $e) {
                self::fail('FbrInvoice threw ' . $e::class . ' for ' . self::describe(is_string($value) ? $value : null)
                    . ': ' . $e->getMessage());
            }
        }

        self::assertSame('1.12', FbrInvoice::SPEC_VERSION);
        $full = FbrInvoice::build($invoice)['invoice'] ?? null;
        self::assertTrue(FbrInvoice::validate($full)->valid);
        self::assertTrue(FbrInvoice::validate(json_decode((string) json_encode($full)))->valid);
        self::assertFalse(FbrInvoice::validate($invoice)->valid); // totalValues … are required
        self::assertSame('The invoice must be an object', FbrInvoice::validate([])->errors[0]->message);
        self::assertSame('0011', FbrInvoice::validate(new \stdClass())->errors[0]->code);
        $built = FbrInvoice::build(json_decode((string) json_encode($invoice)));
        self::assertSame(180.0, $built['invoice']['items'][0]['salesTaxApplicable'] ?? null);
        self::assertSame('', $built['invoice']['invoiceRefNo'] ?? null);
        self::assertSame(1.0, $built['totals']['quantity'] ?? null);
        self::assertNull(FbrInvoice::build([...$invoice, 'items' => [[]]]));
        self::assertSame(
            ['code' => '0104', 'field' => 'items[0].salesTaxApplicable', 'message' => 'Sales tax should be 180.00 for this rate'],
            FbrInvoice::validate([...$invoice, 'items' => [[...$line, 'salesTaxApplicable' => 170, 'totalValues' => 0,
                'fixedNotifiedValueOrRetailPrice' => 0, 'salesTaxWithheldAtSource' => 0]]])->errors[0]->toArray(),
        );
        // Per-unit tax beyond 64-bit integers, rounded as the npm package's BigInt.
        self::assertSame(1e24, FbrInvoice::expectedSalesTax(['rate' => 'Rs.1000000000000', 'quantity' => 1e12]));
        self::assertSame(
            9.999999999999899e+23,
            FbrInvoice::expectedSalesTax(['rate' => 'Rs.999999999999.99', 'quantity' => 999999999999.9999]),
        );
        self::assertSame(
            1.2193263113702222e+23,
            FbrInvoice::expectedSalesTax(['rate' => 'Rs.987654321098.76', 'quantity' => 123456789012.3468]),
        );
        self::assertNull(FbrInvoice::expectedSalesTax(['rate' => 'ſ3', 'quantity' => 1]));
        self::assertSame(0.18, FbrInvoice::expectedSalesTax(['rate' => "18%\n", 'valueSalesExcludingST' => 1]));
        self::assertSame('0005', FbrInvoice::validate([...$invoice, 'invoiceDate' => "2025-04-21\n"])->errors[0]->code);
    }

    public function testCourierStatusHandlesHostileInput(): void
    {
        $values = [
            null, true, false, [], ['PostEx'], new \stdClass(), NAN, INF, -INF, -0.0, -1, -1.0, 1.5, 0.5,
            PHP_INT_MAX, PHP_INT_MIN, 1e300, -1e300, 'constructor', '__proto__', 'hasOwnProperty', 'toString',
        ];
        foreach ([...$values, ...self::hostile()] as $value) {
            try {
                Courier::mapStatus($value, 'Delivered');
                Courier::mapStatus('PostEx', $value);
                Courier::mapStatus($value, $value);
            } catch (Throwable $e) {
                self::fail('Courier::mapStatus threw ' . $e::class . ' for ' . var_export($value, true) . ': ' . $e->getMessage());
            }
        }
        foreach ([...$values, ...self::hostile()] as $value) {
            self::assertNull(Courier::mapStatus($value, 'Delivered'));
        }
        foreach (self::hostile() as $input) {
            self::assertNull(Courier::mapStatus('PostEx', $input), 'Courier::mapStatus(PostEx, ' . self::describe($input) . ')');
        }
        foreach (['constructor', '__proto__', 'hasOwnProperty', true, null, [], NAN, INF, -1, -1.0, 1.5, 1e300] as $raw) {
            self::assertNull(Courier::mapStatus('PostEx', $raw));
        }
        self::assertSame(Courier::DELIVERED, Courier::mapStatus('PostEx', 5));
        self::assertSame(Courier::DELIVERED, Courier::mapStatus('PostEx', 5.0));
        self::assertSame(Courier::DELIVERED, Courier::mapStatus('PostEx', '5'));
        self::assertSame(Courier::DELIVERED, Courier::mapStatus('PostEx', '0005'));
        self::assertSame(Courier::PENDING, Courier::mapStatus(' postex ', 1));
        self::assertNull(Courier::mapStatus('PostEx', 0));
        self::assertNull(Courier::mapStatus('PostEx', -0.0));
        self::assertSame(Courier::ATTEMPTED, Courier::mapStatus('PostEx', 'Attempt Made: Customer not available'));
        self::assertNull(Courier::mapStatus('PostEx', 'Attempt Madel'));
        self::assertSame(Courier::RETURNED, Courier::mapStatus('LCS', 'Returned to Shipper'));
        self::assertNull(Courier::mapStatus('TCS', 'Delivered'));
        foreach (['constructor', '__proto__', 'hasOwnProperty', 'toString'] as $name) {
            self::assertNull(Courier::normalizeCity($name));
            self::assertNull(Courier::normalizeCity($name . ' city'));
        }
        self::assertSame('Karachi', Courier::normalizeCity('Karachi City'));
        self::assertSame('Lahore', Courier::normalizeCity('لاہور'));
    }

    public function testUrduTextHandlesHostileInput(): void
    {
        $values = [null, true, false, 0, 1.5, NAN, [], ['script' => 'urdu'], new \stdClass(), 'rtl', 'ltr', 'urdu', 'latin'];
        $inputs = [...$values, ...self::hostile()];
        mt_srand(crc32('Text::urdu'));
        for ($i = 0; $i < 300; $i++) {
            $inputs[] = self::randomString();
        }
        foreach ($inputs as $value) {
            $label = is_string($value) ? self::describe($value) : var_export(is_object($value) ? 'object' : $value, true);
            try {
                self::assertIsString(Text::slugify($value));
                self::assertIsString(Text::slugify($value, ['script' => 'urdu']));
                self::assertIsString(Text::slugify($value, ['script' => 'latin']));
                self::assertIsString(Text::slugify('Lahore', $value));
                self::assertContains(Text::compareUrdu($value, 'لاہور'), [-1, 0, 1]);
                self::assertContains(Text::compareUrdu('abc', $value), [-1, 0, 1]);
                self::assertSame(0, Text::compareUrdu($value, $value));
                self::assertIsBool(Text::isRtl($value));
                self::assertIsString(Text::wrapBidi($value));
                self::assertIsString(Text::wrapBidi('x', $value));
            } catch (Throwable $e) {
                self::fail('Text threw ' . $e::class . ' for ' . $label . ': ' . $e->getMessage());
            }
            if (!is_string($value)) {
                self::assertSame('', Text::slugify($value));
                self::assertFalse(Text::isRtl($value));
                self::assertSame('', Text::wrapBidi($value));
            }
        }
        self::assertSame('lahore-fort-2024', Text::slugify('Lahore Fort, 2024'));
        self::assertSame('لاہور-قلعہ', Text::slugify('لاہور قلعہ'));
        self::assertSame('fort', Text::slugify('لاہور Fort', ['script' => Text::SCRIPT_LATIN]));
        self::assertSame('کراچی-2024', Text::slugify('کراچی ۲۰۲۴', ['script' => Text::SCRIPT_URDU]));
        self::assertSame('aeiou-ss-th', Text::slugify('ÀÉÎÕÜ ß Þ'));
        self::assertSame('a-b', Text::slugify("a\u{d7}b"));
        self::assertSame('a-b', Text::slugify("\xffa\xed\xa0\x80b\xff"));
        $words = ['ے', 'بھائی', 'آم', 'باغ', 'اب'];
        usort($words, Text::compareUrdu(...));
        self::assertSame(['اب', 'آم', 'باغ', 'بھائی', 'ے'], $words);
        self::assertSame(-1, Text::compareUrdu('10', '2'));
        self::assertSame(-1, Text::compareUrdu('ا', 'أ'));
        self::assertTrue(Text::isRtl('123 سلام'));
        self::assertFalse(Text::isRtl('Order نمبر'));
        self::assertSame("\u{2067}x\u{2069}", Text::wrapBidi('x', Text::BIDI_RTL));
        self::assertSame("\u{2068}x\u{2069}", Text::wrapBidi('x', 'up'));
    }

    public function testIncomeTaxHandlesHostileInput(): void
    {
        $values = [
            null, true, false, '2026', '', [], [2026], new \stdClass(), NAN, INF, -INF, -0.0, -1, 0, 0.0, 0.005,
            2026.5, 2026.0, 1e12, 1e12 + 0.01, 1e300, PHP_INT_MAX, PHP_INT_MIN, 999_999_999_999.99,
            new DateTimeImmutable('2025-07-01'), '2025-02-29', '2025-07-01',
        ];
        foreach ([...$values, ...self::hostile()] as $value) {
            try {
                IncomeTax::getSalarySlabs($value);
                IncomeTax::getTaxYear($value);
                IncomeTax::calculateSalary($value, ['taxYear' => 2026]);
                IncomeTax::calculateSalary(1_800_000, ['taxYear' => $value]);
                IncomeTax::calculateSalary(1_800_000, ['date' => $value]);
                IncomeTax::calculateSalary($value, ['taxYear' => $value, 'date' => $value]);
                IncomeTax::calculateMonthlySalary($value, ['taxYear' => 2027]);
                IncomeTax::calculateMonthlySalary(150_000, ['taxYear' => $value, 'date' => $value]);
                IncomeTax::calculateMonthlySalary($value);
            } catch (Throwable $e) {
                self::fail('IncomeTax threw ' . $e::class . ' for ' . var_export(is_object($value) ? 'object' : $value, true)
                    . ': ' . $e->getMessage());
            }
        }
        foreach (self::hostile() as $input) {
            self::assertNull(IncomeTax::calculateSalary($input, ['taxYear' => 2026]));
            self::assertNull(IncomeTax::getTaxYear($input ?? 'x'));
            self::assertNull(IncomeTax::calculateSalary(1000, ['date' => $input ?? 'x']));
        }
        self::assertSame([2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027], IncomeTax::getSalaryYears());
        self::assertSame(
            ['tax' => 72000.0, 'monthly' => 6000.0, 'effectiveRate' => 4.0,
                'slab' => ['over' => 1200000, 'upTo' => 2200000, 'fixed' => 6000, 'rate' => 11], 'taxYear' => 2026],
            IncomeTax::calculateSalary(1_800_000, ['taxYear' => 2026])?->toArray(),
        );
        self::assertSame(6000.0, IncomeTax::calculateMonthlySalary(150_000, ['taxYear' => 2026])?->monthly);
        self::assertSame(0.01, IncomeTax::calculateSalary(600_000.5, ['taxYear' => 2026])?->tax);
        self::assertSame(2026, IncomeTax::getTaxYear('2025-07-01'));
        self::assertSame(2025, IncomeTax::getTaxYear(new DateTimeImmutable('2025-06-30')));
        self::assertSame(2026, IncomeTax::calculateSalary(1_800_000, ['taxYear' => 2026.0])?->taxYear);
        self::assertNull(IncomeTax::calculateSalary(1_800_000, ['taxYear' => '2026']));
        self::assertNull(IncomeTax::calculateSalary(1_800_000, ['taxYear' => 2019]));
        self::assertNull(IncomeTax::getSalarySlabs(2026.5));
        self::assertNotNull(IncomeTax::calculateSalary(1_800_000));
        // The largest income: 1.2 × 10^15 paisa at 35%, exact in 64-bit integers.
        $top = IncomeTax::calculateMonthlySalary(1e12, ['taxYear' => 2026]);
        self::assertNotNull($top);
        self::assertGreaterThan(0, $top->effectiveRate);
    }

    private static function describe(?string $input): string
    {
        if ($input === null) {
            return 'null';
        }
        $text = strlen($input) > 24 ? substr($input, 0, 24) . '... (' . strlen($input) . ' bytes)' : $input;
        return '"' . addcslashes($text, "\0..\37\177..\377") . '"';
    }

    private static function randomString(): string
    {
        static $fragments = [
            '35202', '1234567', '-', ' ', '+92', '0092', '0300', '03', 'PK36', 'SCBL', '0000001123456702', 'AB',
            'LEA', '0002', '0102', '6304', '1004', 'Lahore', 'Punjab', ',', '.', '/', '(', ')', '۱', '٣', 'ß', 'İ',
            '😀', "\xed\xa0\x80", "\xff", "\u{a0}", "\u{200b}", "\0", "\n", '#', 'house', 'p.o. box', '54000',
            'kia', '2026-08-14', '290200001200', 'A', 'z', '9',
        ];
        $out = '';
        $parts = mt_rand(0, 11);
        for ($i = 0; $i < $parts; $i++) {
            $out .= mt_rand(0, 3) === 0 ? chr(mt_rand(0, 255)) : $fragments[mt_rand(0, count($fragments) - 1)];
        }
        return $out;
    }
}
