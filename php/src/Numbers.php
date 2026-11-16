<?php

declare(strict_types=1);

namespace PakDataKit;

use PakDataKit\Internal\Data;
use PakDataKit\Internal\Js;

/**
 * Landline, UAN, toll-free, premium and personal numbers.
 */
final class Numbers
{
    // Number patterns from Google libphonenumber's PK metadata (v9.0.41). They
    // apply to the national significant number, without the trunk prefix 0.
    private const FIXED_LINE = '/^(?:(?:(?:21|42)[2-9]|58[126])[0-9]{7}|(?:2[25]|4[0146-9]|5[1-35-7]|6[1-8]|7[14]|8[16]|91)[2-9][0-9]{6,7}|(?:2(?:3[2358]|4[2-4]|9[2-8])|45[3479]|54[2-467]|60[468]|72[236]|8(?:2[2-689]|3[23578]|4[3478]|5[2356])|9(?:2[2-8]|3[27-9]|4[2-6]|6[3569]|9[25-8]))[2-9][0-9]{5,6})\z/u';
    private const UAN = '/^((?:2(?:[125]|3[2358]|4[2-4]|9[2-8])|4(?:[0-246-9]|5[3479])|5(?:[1-35-7]|4[2-467])|6(?:0[468]|[1-8])|7(?:[14]|2[236])|8(?:[16]|2[2-689]|3[23578]|4[3478]|5[2356])|9(?:1|22|3[27-9]|4[2-6]|6[3569]|9[2-7])))111([0-9]{6})\z/u';
    private const UAN_WITHOUT_AREA_CODE = '/^111([0-9]{6})\z/u';
    private const TOLL_FREE = '/^800([0-9]{5}(?:[0-9]{3})?)\z/u';
    private const PREMIUM = '/^900([0-9]{5})\z/u';
    private const PERSONAL = '/^122([0-9]{6})\z/u';
    private const NATIONAL = '/^[0-9]{8,12}\z/u';

    /** @var array<string, list<string>>|null */
    private static ?array $areaMap = null;

    /**
     * Identifies and formats any Pakistani telephone number: mobile,
     * landline, UAN (`111`), toll-free (`0800`), premium-rate (`0900`) and
     * personal (`0122`) numbers. Returns null if the number is invalid.
     */
    public static function analyze(?string $phone): ?NumberInfo
    {
        $phone ??= '';
        $mobile = Phone::normalizeDigits($phone);
        if ($mobile !== null) {
            $national = substr($mobile, 2);
            return new NumberInfo('mobile', '0' . substr($national, 0, 3) . '-' . substr($national, 3), '+' . $mobile);
        }

        $bareUan = Js::match(self::UAN_WITHOUT_AREA_CODE, Js::stripSeparators(Js::toAsciiDigits($phone)));
        if ($bareUan !== null) {
            return new NumberInfo('uan', '111-' . self::groupDigits((string) $bareUan[1]), null);
        }

        $national = self::toNationalNumber($phone);
        if ($national === null) {
            return null;
        }

        foreach ([['toll-free', self::TOLL_FREE, '800'], ['premium', self::PREMIUM, '900'], ['personal', self::PERSONAL, '122']] as [$type, $pattern, $prefix]) {
            $match = Js::match($pattern, $national);
            if ($match !== null) {
                return new NumberInfo($type, '0' . $prefix . '-' . $match[1], '+92' . $national);
            }
        }

        $match = Js::match(self::UAN, $national);
        if ($match !== null) {
            $code = (string) $match[1];
            return new NumberInfo(
                'uan',
                '0' . $code . '-111-' . self::groupDigits((string) $match[2]),
                '+92' . $national,
                '0' . $code,
                self::areaMap()[$code] ?? [],
            );
        }

        if (Js::test(self::FIXED_LINE, $national)) {
            $code = self::findAreaCode($national);
            return new NumberInfo(
                'landline',
                $code === null ? '0' . $national : '0' . $code . '-' . substr($national, strlen($code)),
                '+92' . $national,
                $code === null ? null : '0' . $code,
                $code === null ? [] : (self::areaMap()[$code] ?? []),
            );
        }

        return null;
    }

    /** Returns the kind of a Pakistani telephone number, or null if it is invalid. */
    public static function getNumberType(?string $phone): ?string
    {
        return self::analyze($phone)?->type;
    }

    /** Validates a landline (fixed-line) number such as `042-35761234`. Never throws. */
    public static function validateLandline(?string $phone): bool
    {
        return self::getNumberType($phone) === 'landline';
    }

    /** Returns the landline area code for a city with trunk prefix (`042`), or null. */
    public static function getAreaCode(?string $city): ?string
    {
        $key = Js::normalizeKey($city ?? '');
        foreach (Data::load('area-codes') as $entry) {
            foreach ($entry['cities'] as $name) {
                if (Js::normalizeKey($name) === $key) {
                    return '0' . $entry['code'];
                }
            }
        }
        return null;
    }

    /** @return array<string, list<string>> */
    private static function areaMap(): array
    {
        if (self::$areaMap === null) {
            self::$areaMap = [];
            foreach (Data::load('area-codes') as $entry) {
                self::$areaMap[(string) $entry['code']] = $entry['cities'];
            }
        }
        return self::$areaMap;
    }

    private static function toNationalNumber(string $value): ?string
    {
        $digits = Js::stripSeparators(Js::toAsciiDigits($value));
        if (str_starts_with($digits, '+')) {
            $digits = substr($digits, 1);
            if (!str_starts_with($digits, '92')) {
                return null;
            }
            $digits = substr($digits, 2);
        } elseif (str_starts_with($digits, '0092')) {
            $digits = substr($digits, 4);
        } elseif (str_starts_with($digits, '92') && Js::utf16Length($digits) >= 11) {
            $digits = substr($digits, 2);
        }
        if (str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }
        return Js::test(self::NATIONAL, $digits) ? $digits : null;
    }

    private static function findAreaCode(string $national): ?string
    {
        for ($length = 4; $length >= 2; $length--) {
            $prefix = substr($national, 0, $length);
            if (isset(self::areaMap()[$prefix])) {
                return $prefix;
            }
        }
        return null;
    }

    private static function groupDigits(string $digits): string
    {
        return implode('-', str_split($digits, 3));
    }
}
