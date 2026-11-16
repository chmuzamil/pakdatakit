<?php

declare(strict_types=1);

namespace PakDataKit;

use PakDataKit\Internal\Data;
use PakDataKit\Internal\Js;

/**
 * Pakistani postal code lookups.
 */
final class Postal
{
    /** @var array<string, string>|null */
    private static ?array $byCode = null;

    /** @var array<string, string>|null */
    private static ?array $byCity = null;

    /** @var list<array{key: string, areaKey: string, postalCode: string, area: ?string}>|null */
    private static ?array $entries = null;

    /** Returns the city for a postal code (whitespace is ignored), or null. */
    public static function getCity(?string $postalCode): ?string
    {
        $code = Js::replace('/[' . Js::WS . ']+/u', '', Js::trim($postalCode ?? ''));
        if ($code === '') {
            return null;
        }
        if (self::$byCode === null) {
            self::$byCode = [];
            foreach (Data::load('postal-codes') as $entry) {
                self::$byCode[$entry['postalCode']] = $entry['city'];
            }
        }
        return self::$byCode[$code] ?? null;
    }

    /** Returns the primary (GPO) postal code for a city, or null. */
    public static function getCode(?string $city): ?string
    {
        $key = Js::normalizeKey($city ?? '');
        if ($key === '') {
            return null;
        }
        if (self::$byCity === null) {
            self::$byCity = [];
            foreach (Data::load('postal-codes') as $entry) {
                $entryKey = Js::normalizeKey($entry['city']);
                if (!isset(self::$byCity[$entryKey]) || ($entry['primary'] ?? false) === true) {
                    self::$byCity[$entryKey] = $entry['postalCode'];
                }
            }
        }
        return self::$byCity[$key] ?? null;
    }

    /**
     * Returns all known postal codes for a city, sorted.
     *
     * @return list<string>
     */
    public static function getCodes(?string $city): array
    {
        $key = Js::normalizeKey($city ?? '');
        if ($key === '') {
            return [];
        }
        $codes = [];
        foreach (self::entries() as $entry) {
            if ($entry['key'] === $key) {
                $codes[] = $entry['postalCode'];
            }
        }
        return Js::localeSorted($codes);
    }

    /**
     * Returns known area names for a city's postal entries, sorted.
     *
     * @return list<string>
     */
    public static function getAreas(?string $city): array
    {
        $key = Js::normalizeKey($city ?? '');
        if ($key === '') {
            return [];
        }
        $areas = [];
        foreach (self::entries() as $entry) {
            if ($entry['key'] === $key && $entry['area'] !== null && $entry['area'] !== '') {
                $areas[] = $entry['area'];
            }
        }
        return Js::localeSorted($areas);
    }

    /**
     * Searches postal entries by city name, area, or postal code prefix.
     *
     * @return list<string> Matching postal codes, sorted and without duplicates.
     */
    public static function search(?string $query): array
    {
        $normalized = Js::normalizeKey($query ?? '');
        if ($normalized === '') {
            return [];
        }
        $prefix = Js::trim($query ?? '');
        $matches = [];
        foreach (self::entries() as $entry) {
            if (
                str_contains($entry['key'], $normalized)
                || str_contains($entry['areaKey'], $normalized)
                || str_starts_with($entry['postalCode'], $prefix)
            ) {
                $matches[$entry['postalCode']] = true;
            }
        }
        return Js::localeSorted(array_map('strval', array_keys($matches)));
    }

    /** @return list<array{key: string, areaKey: string, postalCode: string, area: ?string}> */
    private static function entries(): array
    {
        if (self::$entries === null) {
            self::$entries = [];
            foreach (Data::load('postal-codes') as $entry) {
                $area = $entry['area'] ?? null;
                self::$entries[] = [
                    'key' => Js::normalizeKey($entry['city']),
                    'areaKey' => $area === null || $area === '' ? '' : Js::normalizeKey($area),
                    'postalCode' => $entry['postalCode'],
                    'area' => $area,
                ];
            }
        }
        return self::$entries;
    }
}
