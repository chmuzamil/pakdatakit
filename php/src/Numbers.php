<?php

declare(strict_types=1);

namespace PakDataKit;

use PakDataKit\Internal\Data;
use PakDataKit\Internal\Js;

/**
 * Landline, UAN, toll-free and premium numbers.
 */
final class Numbers
{
    // Number patterns. They apply to the national significant number, without
    // the trunk prefix 0.
    //
    // - Fixed lines and area codes: Google libphonenumber's PK metadata
    //   (v9.0.41), which matches PTA's numbering plan (ITU, 9 November 2021).
    // - UAN: an area code, then 111 and six digits (PTA's plan, "National
    //   Universal Access Number"). Written without the area code, `111-XXX-XXX`
    //   is how UANs are advertised and dialled within a city.
    // - Toll-free: 800 and five digits (PTA's plan, "National Toll Free Number"),
    //   or six digits (PTA's National Numbering Plan 2008, 8.1 and 8.1.4; in use,
    //   e.g. 0800-005000).
    // - Premium rate: 900 and five digits (PTA, National Numbering Plan 2008,
    //   9.1.4, "current structure"; the 2021 plan does not list 0900).
    // - 0122 numbers: seen in use, no PTA source, not supported since 2.7.0 (see DATA.md).
    private const FIXED_LINE = '/^(?:(?:(?:21|42)[2-9]|58[126])[0-9]{7}|(?:2[25]|4[0146-9]|5[1-35-7]|6[1-8]|7[14]|8[16]|91)[2-9][0-9]{6,7}|(?:2(?:3[2358]|4[2-4]|9[2-8])|45[3479]|54[2-467]|60[468]|72[236]|8(?:2[2-689]|3[23578]|4[3478]|5[2356])|9(?:2[2-8]|3[27-9]|4[2-6]|6[3569]|9[25-8]))[2-9][0-9]{5,6})\z/u';
    private const UAN = '/^((?:2(?:[125]|3[2358]|4[2-4]|9[2-8])|4(?:[0-246-9]|5[3479])|5(?:[1-35-7]|4[2-467])|6(?:0[468]|[1-8])|7(?:[14]|2[236])|8(?:[16]|2[2-689]|3[23578]|4[3478]|5[2356])|9(?:1|22|3[27-9]|4[2-6]|6[3569]|9[2-7])))111([0-9]{6})\z/u';
    private const UAN_WITHOUT_AREA_CODE = '/^111([0-9]{6})\z/u';
    private const TOLL_FREE = '/^800([0-9]{5,6})\z/u';
    private const PREMIUM = '/^900([0-9]{5})\z/u';
    private const NATIONAL = '/^[0-9]{8,12}\z/u';

    /** @var array<string, list<string>>|null */
    private static ?array $areaMap = null;

    /**
     * Identifies and formats any Pakistani telephone number: mobile,
     * landline, UAN (`111`), toll-free (`0800`) and premium-rate (`0900`)
     * numbers. 0122 numbers are not recognised: no PTA document lists them
     * (see DATA.md). Returns null if the number is invalid.
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

        foreach ([['toll-free', self::TOLL_FREE, '800'], ['premium', self::PREMIUM, '900']] as [$type, $pattern, $prefix]) {
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

    /** The number types validateLandline() accepts with `services: true`. */
    private const SERVICE_TYPES = ['uan', 'toll-free', 'premium'];

    /**
     * Validates a Pakistani landline (fixed-line) number such as
     * `042-35761234`. With `services: true` it also accepts the
     * non-geographic service numbers a business may give as its landline:
     * UAN (`021-111-123-456`, `111-123-456`), toll-free (`0800-12345`) and
     * premium rate (`0900-12345`); analyze() tells them apart with its
     * `type` field.
     *
     * ```php
     * Numbers::validateLandline('042-35761234');                     // true
     * Numbers::validateLandline('021-111-123-456');                  // false
     * Numbers::validateLandline('021-111-123-456', services: true);  // true
     * ```
     *
     * @param mixed $phone Number in local or international format; anything
     *   that is not a string gives false
     * @param bool $services Also accept UAN, toll-free and premium numbers
     *   (default false)
     * @return bool True for a valid landline number (or service number, with
     *   `$services`). Never throws.
     */
    public static function validateLandline(mixed $phone, bool $services = false): bool
    {
        if (!is_string($phone)) {
            return false;
        }
        $type = self::getNumberType($phone);
        return $type === 'landline' || ($services && in_array($type, self::SERVICE_TYPES, true));
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
