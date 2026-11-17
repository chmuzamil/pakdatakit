<?php

declare(strict_types=1);

namespace PakDataKit\Tests;

use DateTimeImmutable;
use PakDataKit\Address;
use PakDataKit\Cnic;
use PakDataKit\Currency;
use PakDataKit\Geo;
use PakDataKit\Hijri;
use PakDataKit\HijriDate;
use PakDataKit\Holidays;
use PakDataKit\Iban;
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
        Address::class, Cnic::class, Geo::class, Holidays::class, Iban::class, Input::class, Networks::class,
        Numbers::class, Passport::class, Phone::class, Postal::class, Quality::class, RaastQr::class, Tax::class,
        Text::class, VehiclePlate::class, WhatsApp::class,
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
