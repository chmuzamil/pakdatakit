<?php

declare(strict_types=1);

namespace PakDataKit\Tests;

use DateTimeImmutable;
use DateTimeInterface;
use InvalidArgumentException;
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
use PakDataKit\PakData;
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
use stdClass;
use Throwable;

/**
 * Checks the PHP port against the vectors generated from the TypeScript
 * library (test-vectors/*.json at the repository root), the same files the
 * Python, Dart and .NET ports use. Regenerate them with
 * `npm run build && node scripts/generate-test-vectors.mjs`.
 */
final class VectorTest extends TestCase
{
    private const VECTORS_DIR = __DIR__ . '/../../test-vectors';

    /**
     * Functions that tell a JSON object from a JSON array. Their arguments
     * are decoded with objects as stdClass, since `{}` and `[]` both decode
     * to an empty PHP array otherwise.
     */
    private const OBJECT_ARGS = ['buildFbrInvoice', 'validateFbrInvoice', 'expectedSalesTax'];

    /** @return iterable<string, array{0: string}> */
    public static function modules(): iterable
    {
        $files = glob(self::VECTORS_DIR . '/*.json') ?: [];
        sort($files);
        foreach ($files as $file) {
            $module = basename($file, '.json');
            yield $module => [$module];
        }
    }

    public function testVectorsExist(): void
    {
        $total = 0;
        foreach (glob(self::VECTORS_DIR . '/*.json') ?: [] as $file) {
            $total += count(json_decode((string) file_get_contents($file), true, 512, JSON_THROW_ON_ERROR));
        }
        self::assertGreaterThan(12000, $total, 'test vectors not found');
    }

    #[DataProvider('modules')]
    public function testModule(string $module): void
    {
        $json = (string) file_get_contents(self::VECTORS_DIR . '/' . $module . '.json');
        $vectors = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        $objectVectors = json_decode($json, false, 512, JSON_THROW_ON_ERROR);
        $failures = [];
        $rejected = [];
        foreach ($vectors as $index => $vector) {
            if (in_array($vector['fn'], self::OBJECT_ARGS, true)) {
                $vector['args'] = self::decodeObjects($objectVectors[$index]->args);
            }
            $problem = self::check($vector, $rejected);
            if ($problem !== null) {
                $failures[] = sprintf(
                    '[%d] %s %s %s: %s',
                    $index,
                    $vector['fn'],
                    self::describe($vector['args'] ?? null),
                    self::describe($vector['kwargs'] ?? null),
                    $problem,
                );
            }
        }

        $total = count($vectors);
        $summary = sprintf(
            '%s: %d/%d vectors passed; %d rejected by PHP types',
            $module,
            $total - count($failures),
            $total,
            count($rejected),
        );
        $summaryDir = getenv('PAKDATAKIT_VECTOR_SUMMARY');
        if (is_string($summaryDir) && $summaryDir !== '') {
            @mkdir($summaryDir, 0777, true);
            file_put_contents(
                $summaryDir . '/' . $module . '.txt',
                implode("\n", [
                    $summary,
                    ...array_map(static fn (string $r): string => '  type-rejected: ' . $r, $rejected),
                    ...array_map(static fn (string $f): string => '  FAILED: ' . $f, $failures),
                ]) . "\n",
            );
        }
        self::assertSame([], array_slice($failures, 0, 25), $summary);
    }

    // ------------------------------------------------------------ one vector

    /**
     * @param array<string, mixed> $vector
     * @param list<string> $rejected
     */
    private static function check(array $vector, array &$rejected): ?string
    {
        $fn = $vector['fn'];
        if (($vector['constant'] ?? false) === true) {
            return $fn === 'dataVersion' && PakData::version() === $vector['expected']
                ? null
                : 'constant ' . $fn . ' is ' . PakData::version();
        }

        $functions = self::functions();
        if (!isset($functions[$fn])) {
            return 'no PHP mapping for ' . $fn;
        }
        $args = in_array($fn, self::OBJECT_ARGS, true) ? $vector['args'] : self::decode($vector['args']);
        $kwargs = self::decode($vector['kwargs']);
        $throws = $vector['throws'] === true;

        try {
            try {
                $result = $functions[$fn]($args, $kwargs);
            } catch (Unrepresentable $e) {
                $rejected[] = $fn . ' ' . self::describe($vector['args']) . ' ' . self::describe($vector['kwargs'])
                    . ': ' . $e->getMessage();
                if (!$throws && $e->option !== null) {
                    // TypeScript ignored the option here, so leave it out.
                    unset($kwargs[$e->option]);
                    $result = $functions[$fn]($args, $kwargs);
                } else {
                    // Rejected by PHP's types; TypeScript must reject it too.
                    return $throws || $vector['expected'] === null
                        ? null
                        : $e->getMessage() . ', but TypeScript accepts it';
                }
            }
        } catch (InvalidArgumentException $e) {
            return $throws ? null : 'unexpected ' . $e::class . ': ' . $e->getMessage();
        } catch (Unrepresentable $e) {
            return $throws ? null : $e->getMessage();
        } catch (Throwable $e) {
            return 'crashed with ' . $e::class . ': ' . $e->getMessage();
        }

        if ($throws) {
            return 'expected an InvalidArgumentException, got ' . self::describe(self::plain($result));
        }
        return self::mismatch(self::plain($result), $vector['expected']);
    }

    // -------------------------------------------------------------- encoding

    private static function decode(mixed $value): mixed
    {
        if (!is_array($value)) {
            return $value;
        }
        if (isset($value['$date']) && count($value) === 1) {
            $text = $value['$date'];
            return new DateTimeImmutable(str_contains($text, 'T') ? $text : $text . 'T00:00:00');
        }
        if (isset($value['$num']) && count($value) === 1) {
            return match ($value['$num']) {
                'NaN' => NAN,
                'Infinity' => INF,
                '-Infinity' => -INF,
            };
        }
        return array_map(self::decode(...), $value);
    }

    /** As decode(), for JSON decoded with objects as stdClass. */
    private static function decodeObjects(mixed $value): mixed
    {
        if (is_array($value)) {
            return array_map(self::decodeObjects(...), $value);
        }
        if (!$value instanceof stdClass) {
            return $value;
        }
        $fields = get_object_vars($value);
        if (count($fields) === 1 && (isset($fields['$date']) || isset($fields['$num']))) {
            return self::decode($fields);
        }
        $object = new stdClass();
        foreach ($fields as $key => $field) {
            $object->{$key} = self::decodeObjects($field);
        }
        return $object;
    }

    /** Converts a PHP result into the vector encoding. */
    private static function plain(mixed $value): mixed
    {
        if (is_float($value)) {
            if (is_nan($value)) {
                return ['$num' => 'NaN'];
            }
            if (is_infinite($value)) {
                return ['$num' => $value > 0 ? 'Infinity' : '-Infinity'];
            }
            return $value;
        }
        if ($value instanceof DateTimeInterface) {
            return ['$date' => $value->format('Y-m-d')];
        }
        if (is_object($value)) {
            return self::plain(get_object_vars($value));
        }
        if (is_array($value)) {
            return array_map(self::plain(...), $value);
        }
        return $value;
    }

    /**
     * Describes the first difference, or returns null if equal. Keys the
     * TypeScript result leaves out (undefined) must be absent or null.
     */
    private static function mismatch(mixed $actual, mixed $expected, string $path = '$'): ?string
    {
        if ((is_int($expected) || is_float($expected)) && (is_int($actual) || is_float($actual))) {
            return (float) $actual === (float) $expected
                ? null
                : $path . ': ' . self::describe($actual) . ' != ' . self::describe($expected);
        }
        if (is_array($expected)) {
            if (!is_array($actual)) {
                return $path . ': ' . self::describe($actual) . ' is not an array';
            }
            if (array_is_list($expected) && $expected !== []) {
                if (!array_is_list($actual) || count($actual) !== count($expected)) {
                    return $path . ': ' . self::describe($actual) . ' != ' . self::describe($expected);
                }
                foreach ($expected as $i => $item) {
                    $found = self::mismatch($actual[$i], $item, $path . '[' . $i . ']');
                    if ($found !== null) {
                        return $found;
                    }
                }
                return null;
            }
            foreach (array_unique([...array_keys($expected), ...array_keys($actual)]) as $key) {
                if (!array_key_exists($key, $expected)) {
                    if ($actual[$key] !== null) {
                        return $path . '.' . $key . ': unexpected ' . self::describe($actual[$key]);
                    }
                } elseif (!array_key_exists($key, $actual)) {
                    return $path . '.' . $key . ': missing';
                } else {
                    $found = self::mismatch($actual[$key], $expected[$key], $path . '.' . $key);
                    if ($found !== null) {
                        return $found;
                    }
                }
            }
            return null;
        }
        return $actual === $expected ? null : $path . ': ' . self::describe($actual) . ' != ' . self::describe($expected);
    }

    private static function describe(mixed $value): string
    {
        $text = json_encode(
            $value,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR | JSON_INVALID_UTF8_SUBSTITUTE,
        );
        $text = $text === false ? gettype($value) : $text;
        return strlen($text) > 300 ? substr($text, 0, 300) . '...' : $text;
    }

    // ------------------------------------------------------ argument mapping

    private static function str(mixed $value): string
    {
        if (!is_string($value)) {
            throw new Unrepresentable(self::describe($value) . ' is not a string');
        }
        return $value;
    }

    private static function optStr(mixed $value): ?string
    {
        return $value === null ? null : self::str($value);
    }

    private static function number(mixed $value): int|float
    {
        if (!is_int($value) && !is_float($value)) {
            throw new Unrepresentable(self::describe($value) . ' is not a number');
        }
        return $value;
    }

    private static function integer(mixed $value): int
    {
        $n = self::number($value);
        if (is_int($n)) {
            return $n;
        }
        if (is_finite($n) && floor($n) === $n && abs($n) < 9.0e18) {
            return (int) $n;
        }
        throw new Unrepresentable(self::describe(self::plain($n)) . ' is not an int');
    }

    /** @param array<string, mixed> $kwargs */
    private static function intOption(array $kwargs, string $key, int $fallback): int
    {
        if (!isset($kwargs[$key])) {
            return $fallback;
        }
        try {
            return self::integer($kwargs[$key]);
        } catch (Unrepresentable $e) {
            throw new Unrepresentable($e->getMessage(), $key);
        }
    }

    /**
     * @param array<string, mixed> $kwargs
     * @return array<string, mixed>
     */
    private static function holidayOptions(array $kwargs): array
    {
        $options = [];
        if (isset($kwargs['includeChristianHolidays'])) {
            $options['includeChristianHolidays'] = (bool) $kwargs['includeChristianHolidays'];
        }
        if (isset($kwargs['announced'])) {
            $options['announced'] = $kwargs['announced'];
        }
        $options['hijriOffset'] = self::intOption($kwargs, 'hijriOffset', 0);
        return $options;
    }

    /**
     * @return array<string, callable(array<int, mixed>, array<string, mixed>): mixed>
     */
    private static function functions(): array
    {
        static $functions = null;
        if ($functions !== null) {
            return $functions;
        }

        $one = static fn (callable $fn): callable => static fn (array $a, array $k): mixed => $fn(self::str($a[0]));
        $date = static fn (array $a): DateTimeInterface => $a[0];
        // For date text TypeScript throws on, the PHP methods return an empty
        // list or false instead; tryGetHolidaysOn() reports which case it is.
        $holidaysOn = static function (array $a, array $k): array {
            $found = Holidays::tryGetHolidaysOn($a[0], self::holidayOptions($k));
            if ($found === null) {
                throw new InvalidArgumentException('not a usable date');
            }
            return $found;
        };

        return $functions = [
            'validateCNIC' => $one(Cnic::validate(...)),
            'getCNICInfo' => $one(Cnic::getInfo(...)),
            'findCNICs' => static fn (array $a, array $k): mixed => Cnic::findAll($a[0] ?? null),
            'maskCNICs' => static fn (array $a, array $k): mixed => array_key_exists('mask', $k)
                ? Cnic::mask($a[0] ?? null, $k['mask'])
                : Cnic::mask($a[0] ?? null),
            'validatePhone' => $one(Phone::validate(...)),
            'formatPhone' => $one(Phone::format(...)),
            'analyzePhone' => $one(Phone::analyze(...)),
            'getNetwork' => $one(Networks::getNetwork(...)),
            'createWhatsAppLink' => static fn (array $a, array $k): mixed => count($a) > 1
                ? WhatsApp::createLink(self::str($a[0]), self::optStr($a[1]))
                : WhatsApp::createLink(self::str($a[0])),
            'getProvince' => $one(Geo::getProvince(...)),
            'searchCities' => $one(Geo::searchCities(...)),
            'getDistrictProvince' => $one(Geo::getDistrictProvince(...)),
            'searchDistricts' => $one(Geo::searchDistricts(...)),
            'getDistrictsByProvince' => $one(Geo::getDistrictsByProvince(...)),
            'getDivisions' => static fn (array $a, array $k): mixed => count($a) > 0
                ? Geo::getDivisions(self::str($a[0]))
                : Geo::getDivisions(),
            'getDivisionOfDistrict' => $one(Geo::getDivisionOfDistrict(...)),
            'getTehsils' => $one(Geo::getTehsils(...)),
            'getTehsilDistrict' => static fn (array $a, array $k): mixed => count($a) > 1
                ? Geo::getTehsilDistrict(self::str($a[0]), self::str($a[1]))
                : Geo::getTehsilDistrict(self::str($a[0])),
            'formatPKR' => static fn (array $a, array $k): mixed => Currency::formatPkr(self::number($a[0])),
            'formatLakh' => static fn (array $a, array $k): mixed => Currency::formatLakh(self::number($a[0])),
            'parseAmount' => static fn (array $a, array $k): mixed => Currency::parseAmount($a[0]),
            'formatAmountInput' => static fn (array $a, array $k): mixed => Currency::formatAmountInput($a[0]),
            'validateIBAN' => $one(Iban::validate(...)),
            'getBankFromIBAN' => $one(Iban::getBank(...)),
            'getBankInfo' => $one(Iban::getBankInfo(...)),
            'getBanks' => static fn (array $a, array $k): mixed => Iban::getBanks(),
            'getCityByPostalCode' => $one(Postal::getCity(...)),
            'getPostalCode' => $one(Postal::getCode(...)),
            'getPostalCodes' => $one(Postal::getCodes(...)),
            'getPostalAreas' => $one(Postal::getAreas(...)),
            'searchPostalCodes' => $one(Postal::search(...)),
            'getPostOffice' => $one(Postal::getPostOffice(...)),
            'searchPostOffices' => $one(Postal::searchPostOffices(...)),
            'parseAddress' => $one(Address::parse(...)),
            'formatAddress' => static fn (array $a, array $k): mixed => Address::format($k),
            'normalizeText' => $one(Text::normalize(...)),
            'normalizeRomanUrdu' => $one(Text::normalizeRomanUrdu(...)),
            'toUrduDigits' => $one(Text::toUrduDigits(...)),
            'toEnglishDigits' => $one(Text::toEnglishDigits(...)),
            'slugify' => static fn (array $a, array $k): mixed => Text::slugify($a[0], $k),
            'compareUrdu' => static fn (array $a, array $k): mixed => Text::compareUrdu($a[0], $a[1]),
            'romanUrduKey' => static fn (array $a, array $k): mixed => Text::romanUrduKey($a[0] ?? null),
            'isRTL' => static fn (array $a, array $k): mixed => Text::isRtl($a[0]),
            'wrapBidi' => static fn (array $a, array $k): mixed => count($a) > 1
                ? Text::wrapBidi($a[0], $a[1])
                : Text::wrapBidi($a[0]),
            'toHijri' => static fn (array $a, array $k): mixed => Hijri::toHijri($date($a), self::intOption($k, 'offset', 0)),
            'fromHijri' => static fn (array $a, array $k): mixed => Hijri::fromHijri(
                new HijriDate(
                    self::integer($a[0]['year'] ?? null),
                    self::integer($a[0]['month'] ?? null),
                    self::integer($a[0]['day'] ?? null),
                ),
                self::intOption($k, 'offset', 0),
            ),
            'formatHijri' => static fn (array $a, array $k): mixed => Hijri::format($date($a), self::intOption($k, 'offset', 0)),
            'isRamadan' => static fn (array $a, array $k): mixed => Hijri::isRamadan($date($a), self::intOption($k, 'offset', 0)),
            'getHijriMonthName' => static fn (array $a, array $k): mixed => Hijri::getMonthName(self::integer($a[0])),
            'getPakistanHolidays' => static fn (array $a, array $k): mixed => Holidays::getHolidays(
                self::integer($a[0]),
                self::holidayOptions($k),
            ),
            'getHolidaysOn' => $holidaysOn,
            'isPakistanHoliday' => static fn (array $a, array $k): mixed => count($holidaysOn($a, $k)) > 0
                && Holidays::isHoliday($a[0], self::holidayOptions($k)),
            'numberToWords' => static fn (array $a, array $k): mixed => Words::numberToWords(
                self::number($a[0]),
                self::str($k['language'] ?? 'en'),
            ),
            'amountInWords' => static fn (array $a, array $k): mixed => Words::amountInWords(
                self::number($a[0]),
                self::str($k['language'] ?? 'en'),
                (bool) ($k['cheque'] ?? false),
            ),
            'analyzeNTN' => $one(Tax::analyzeNtn(...)),
            'validateNTN' => $one(Tax::validateNtn(...)),
            'validateSTRN' => $one(Tax::validateStrn(...)),
            'validatePassport' => $one(Passport::validate(...)),
            'validateVehiclePlate' => $one(VehiclePlate::validate(...)),
            'parseVehiclePlate' => $one(VehiclePlate::parse(...)),
            'analyzeNumber' => $one(Numbers::analyze(...)),
            'getNumberType' => $one(Numbers::getNumberType(...)),
            'validateLandline' => static fn (array $a, array $k): mixed => Numbers::validateLandline(
                $a[0] ?? null,
                ($k['services'] ?? false) === true,
            ),
            'getAreaCode' => $one(Numbers::getAreaCode(...)),
            'createRaastP2PQr' => static fn (array $a, array $k): mixed => RaastQr::createP2P($k),
            'createMerchantQr' => static fn (array $a, array $k): mixed => RaastQr::createMerchant($k),
            'parseRaastQr' => $one(RaastQr::parse(...)),
            'validateRaastQr' => static fn (array $a, array $k): mixed => RaastQr::validate(
                self::str($a[0]),
                $k['now'] ?? null,
                isset($k['expiresSoonMs']) ? self::number($k['expiresSoonMs']) : 3_600_000,
            ),
            'formatCNICInput' => $one(Input::formatCnic(...)),
            'checkCNICInput' => $one(Input::checkCnic(...)),
            'formatPhoneInput' => $one(Input::formatPhone(...)),
            'checkPhoneInput' => $one(Input::checkPhone(...)),
            'formatIBANInput' => $one(Input::formatIban(...)),
            'checkIBANInput' => $one(Input::checkIban(...)),
            'scoreAddress' => $one(Quality::scoreAddress(...)),
            'phoneRiskSignals' => $one(Quality::phoneRiskSignals(...)),
            'getSalesTaxRate' => static fn (array $a, array $k): mixed => SalesTax::getRate($k),
            'calculateSalesTax' => static fn (array $a, array $k): mixed => SalesTax::calculate($a[0], $k),
            'splitInclusive' => static fn (array $a, array $k): mixed => SalesTax::splitInclusive($a[0], $a[1]),
            'getSalaryTaxSlabs' => static fn (array $a, array $k): mixed => count($a) > 0
                ? IncomeTax::getSalarySlabs($a[0])
                : IncomeTax::getSalarySlabs(),
            'getSalaryTaxYears' => static fn (array $a, array $k): mixed => IncomeTax::getSalaryYears(),
            'getTaxYear' => static fn (array $a, array $k): mixed => count($a) > 0
                ? IncomeTax::getTaxYear($a[0])
                : IncomeTax::getTaxYear(),
            'calculateSalaryTax' => static fn (array $a, array $k): mixed => IncomeTax::calculateSalary($a[0], $k),
            'calculateMonthlySalaryTax' => static fn (array $a, array $k): mixed => IncomeTax::calculateMonthlySalary($a[0], $k),
            'parseElectricityRef' => $one(Bills::parseElectricityRef(...)),
            'validateElectricityRef' => $one(Bills::validateElectricityRef(...)),
            'validateGasConsumerNumber' => static fn (array $a, array $k): mixed => Bills::validateGasConsumerNumber(
                self::str($a[0]),
                self::str($a[1]),
            ),
            'buildFbrInvoice' => static fn (array $a, array $k): mixed => FbrInvoice::build($a[0]),
            'validateFbrInvoice' => static fn (array $a, array $k): mixed => FbrInvoice::validate($a[0], $k),
            'expectedSalesTax' => static fn (array $a, array $k): mixed => FbrInvoice::expectedSalesTax($a[0]),
            'mapCourierStatus' => static fn (array $a, array $k): mixed => Courier::mapStatus($a[0], $a[1]),
            'normalizeCityForCourier' => $one(Courier::normalizeCity(...)),
        ];
    }
}
