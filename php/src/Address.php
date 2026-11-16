<?php

declare(strict_types=1);

namespace PakDataKit;

use PakDataKit\Internal\Js;

/**
 * Free-form Pakistani address parsing and formatting.
 */
final class Address
{
    private const WORD = 'A-Za-z0-9_';

    private const PROVINCES = [
        'Islamabad Capital Territory', 'Azad Jammu and Kashmir', 'Gilgit-Baltistan', 'Khyber Pakhtunkhwa',
        'Balochistan', 'Punjab', 'Sindh',
    ];

    private const POSTAL_CANDIDATE = '/(?<![' . self::WORD . '#\/-])([1-9][0-9]{4})(?![' . self::WORD . '\/-])/u';

    /** @var array<string, array{names: list<string>, keys: list<string>}> */
    private static array $options = [];

    private static ?string $nonPostalPrefix = null;

    /**
     * Parses a free-form Pakistani address into structured components. It
     * extracts the postal code, matches known cities, districts and
     * provinces, and assigns the remaining segments to street and area.
     * Never throws; unknown parts are null.
     */
    public static function parse(?string $address): ParsedAddress
    {
        $raw = Js::normalizeWhitespace($address ?? '');
        if ($raw === '') {
            return new ParsedAddress(raw: $raw);
        }

        $warnings = [];
        $working = $raw;
        $postalCode = null;
        $postal = self::findPostalCode($working);
        if ($postal !== null) {
            [$postalCode, $index] = $postal;
            $working = substr($working, 0, $index) . ' ' . substr($working, $index + strlen($postalCode));
        }

        $segments = [];
        foreach (explode(',', $working) as $part) {
            $part = Js::normalizeWhitespace($part);
            if ($part !== '') {
                $segments[] = $part;
            }
        }

        $province = $city = $district = null;

        // Match whole segments first, from the end of the address.
        for ($i = count($segments) - 1; $i >= 0; $i--) {
            $segment = $segments[$i];
            $matched = $province === null ? self::matchExact($segment, 'provinces') : null;
            if ($matched !== null) {
                $province = $matched;
                $segments[$i] = '';
                continue;
            }
            $matched = $city === null ? self::matchExact($segment, 'cities') : null;
            if ($matched !== null) {
                $city = $matched;
                $segments[$i] = '';
                continue;
            }
            $matched = $district === null ? self::matchExact($segment, 'districts') : null;
            if ($matched !== null) {
                $district = $matched;
                $segments[$i] = '';
            }
        }

        // Then look for names at the end of a segment ("12 Model Town Lahore").
        for ($i = count($segments) - 1; $i >= 0; $i--) {
            if ($province === null) {
                $found = self::matchTrailing($segments[$i], 'provinces');
                if ($found !== null) {
                    [$province, $segments[$i]] = $found;
                }
            }
            if ($city === null) {
                $found = self::matchTrailing($segments[$i], 'cities');
                if ($found !== null) {
                    [$city, $segments[$i]] = $found;
                }
            }
        }

        if ($city === null && $district !== null) {
            $city = $district;
        }
        if ($postalCode !== null && $city === null) {
            $city = Postal::getCity($postalCode);
        }

        if ($city !== null) {
            $inferred = Geo::getProvince($city) ?? Geo::getDistrictProvince($city);
        } elseif ($district !== null) {
            $inferred = Geo::getDistrictProvince($district);
        } else {
            $inferred = null;
        }

        if ($province === null) {
            $province = $inferred;
        } elseif ($inferred !== null && $inferred !== $province) {
            $warnings[] = ($city ?? $district) . ' is in ' . $inferred . ', but the address says ' . $province;
        }

        $remaining = array_values(array_filter($segments, static fn (string $part): bool => $part !== ''));
        return new ParsedAddress(
            raw: $raw,
            street: $remaining[0] ?? null,
            area: count($remaining) > 1 ? implode(', ', array_slice($remaining, 1)) : null,
            city: $city,
            district: $district,
            province: $province,
            postalCode: $postalCode,
            warnings: $warnings,
        );
    }

    /**
     * Formats address components into a single mailing line. Only the
     * components that are set are included; if none are, `raw` is returned.
     * Accepts a ParsedAddress or an array with the same keys.
     *
     * @param ParsedAddress|array<string, mixed> $parts
     */
    public static function format(ParsedAddress|array $parts): string
    {
        $get = static function (string $name) use ($parts): mixed {
            return is_array($parts) ? ($parts[$name] ?? null) : $parts->{$name};
        };
        $segments = [];
        foreach ([$get('street'), $get('area'), $get('city') ?? $get('district'), $get('province')] as $part) {
            if (is_string($part) && $part !== '') {
                $segments[] = $part;
            }
        }
        $formatted = implode(', ', $segments);
        $postalCode = $get('postalCode');
        if (is_string($postalCode) && $postalCode !== '') {
            $formatted = $formatted !== '' ? $formatted . ' ' . $postalCode : $postalCode;
        }
        if ($formatted !== '') {
            return $formatted;
        }
        $raw = $get('raw');
        return is_string($raw) ? $raw : '';
    }

    /** @return array{0: string, 1: int}|null The postal code and its byte offset. */
    private static function findPostalCode(string $text): ?array
    {
        $result = null;
        foreach (Js::matchAllWithOffsets(self::POSTAL_CANDIDATE, $text) as [$code, $offset]) {
            // Whitespace is already collapsed, so the longest prefix
            // ("p. o. box ") fits well inside the last 32 bytes before the
            // number. Cut on a character boundary.
            $start = max(0, $offset - 32);
            while ($start < $offset && (ord($text[$start]) & 0xC0) === 0x80) {
                $start++;
            }
            if (!Js::test(self::nonPostalPrefix(), substr($text, $start, $offset - $start))) {
                $result = [$code, $offset];
            }
        }
        return $result;
    }

    /** Words that mark a following 5-digit number as something other than a postal code. */
    private static function nonPostalPrefix(): string
    {
        if (self::$nonPostalPrefix === null) {
            $ws = '[' . Js::WS . ']*';
            $ci = static function (string $letters): string {
                $out = '';
                foreach (str_split($letters) as $char) {
                    $out .= '[' . strtoupper($char) . $char . ']';
                }
                return $out;
            };
            $words = [
                $ci('p') . '\.?' . $ws . $ci('o') . '\.?' . $ws . $ci('box'),
                $ci('box'), $ci('house'),
                $ci('h') . '\.?' . $ws . $ci('no') . '\.?',
                $ci('plot'), $ci('street'), $ci('st') . '\.?', $ci('flat'), $ci('shop'), $ci('office'), $ci('suite'),
                $ci('no') . '\.?',
            ];
            self::$nonPostalPrefix = '/(?:(?<![' . self::WORD . '])(?:' . implode('|', $words) . ')|#)' . $ws . '\z/u';
        }
        return self::$nonPostalPrefix;
    }

    /** @return array{names: list<string>, keys: list<string>} */
    private static function options(string $kind): array
    {
        if (!isset(self::$options[$kind])) {
            $names = match ($kind) {
                'provinces' => self::PROVINCES,
                'cities' => self::byLengthDesc(Geo::cityNames()),
                default => self::byLengthDesc(Geo::districtNames()),
            };
            self::$options[$kind] = ['names' => $names, 'keys' => array_map(Js::normalizeKey(...), $names)];
        }
        return self::$options[$kind];
    }

    /**
     * Longest names first so "Dera Ghazi Khan" wins over "Ghazi".
     *
     * @param list<string> $names
     * @return list<string>
     */
    private static function byLengthDesc(array $names): array
    {
        usort($names, static fn (string $a, string $b): int => Js::utf16Length($b) <=> Js::utf16Length($a));
        return $names;
    }

    private static function matchExact(string $segment, string $kind): ?string
    {
        $key = Js::normalizeKey($segment);
        if ($key === '') {
            return null;
        }
        $options = self::options($kind);
        $index = array_search($key, $options['keys'], true);
        return $index === false ? null : $options['names'][$index];
    }

    /** @return array{0: string, 1: string}|null The matched name and the rest of the segment. */
    private static function matchTrailing(string $segment, string $kind): ?array
    {
        $key = Js::normalizeKey($segment);
        $options = self::options($kind);
        foreach ($options['keys'] as $i => $optionKey) {
            if (str_ends_with($key, ' ' . $optionKey)) {
                $name = $options['names'][$i];
                return [$name, Js::normalizeWhitespace(Js::dropLastUtf16Units($segment, Js::utf16Length($name)))];
            }
        }
        return null;
    }
}
