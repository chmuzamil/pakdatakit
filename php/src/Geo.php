<?php

declare(strict_types=1);

namespace PakDataKit;

use PakDataKit\Internal\Data;
use PakDataKit\Internal\Js;

/**
 * Cities, districts and provinces.
 */
final class Geo
{
    // Districts that were split or renamed, so names stored before the
    // change still resolve. They are not listed by searchDistricts() or
    // getDistrictsByProvince().
    private const FORMER_DISTRICTS = [
        'south waziristan' => 'Khyber Pakhtunkhwa',
        'quetta' => 'Balochistan',
        'dera bugti' => 'Balochistan',
        'upper dera bugti' => 'Balochistan',
        'upper swat' => 'Khyber Pakhtunkhwa',
    ];

    /** @var list<array{key: string, name: string, province: string}>|null */
    private static ?array $cities = null;

    /** @var list<array{key: string, name: string, province: string, provinceKey: string}>|null */
    private static ?array $districts = null;

    /** Returns the province for a city name (case and spacing are ignored), or null. */
    public static function getProvince(?string $city): ?string
    {
        $key = Js::normalizeKey($city ?? '');
        if ($key === '') {
            return null;
        }
        $found = null;
        foreach (self::cities() as $entry) {
            if ($entry['key'] === $key) {
                $found = $entry['province']; // the last entry wins, as in a Map
            }
        }
        return $found;
    }

    /**
     * Searches cities by partial, case-insensitive name; sorted.
     *
     * @return list<string>
     */
    public static function searchCities(?string $query): array
    {
        $q = Js::normalizeKey($query ?? '');
        if ($q === '') {
            return [];
        }
        $matches = [];
        foreach (self::cities() as $entry) {
            if (str_contains($entry['key'], $q)) {
                $matches[$entry['name']] = true;
            }
        }
        return Js::localeSorted(array_map('strval', array_keys($matches)));
    }

    /**
     * Returns the province for a district name, or null. Former names of
     * districts that were split or renamed still resolve.
     */
    public static function getDistrictProvince(?string $district): ?string
    {
        $key = Js::normalizeKey($district ?? '');
        if ($key === '') {
            return null;
        }
        $found = null;
        foreach (self::districts() as $entry) {
            if ($entry['key'] === $key) {
                $found = $entry['province'];
            }
        }
        return $found ?? (self::FORMER_DISTRICTS[$key] ?? null);
    }

    /**
     * Searches districts by partial, case-insensitive name; sorted.
     *
     * @return list<string>
     */
    public static function searchDistricts(?string $query): array
    {
        $q = Js::normalizeKey($query ?? '');
        if ($q === '') {
            return [];
        }
        $matches = [];
        foreach (self::districts() as $entry) {
            if (str_contains($entry['key'], $q)) {
                $matches[$entry['name']] = true;
            }
        }
        return Js::localeSorted(array_map('strval', array_keys($matches)));
    }

    /**
     * Returns all districts in a province (case-insensitive), sorted.
     *
     * @return list<string>
     */
    public static function getDistrictsByProvince(?string $province): array
    {
        $key = Js::normalizeKey($province ?? '');
        if ($key === '') {
            return [];
        }
        $names = [];
        foreach (self::districts() as $entry) {
            if ($entry['provinceKey'] === $key) {
                $names[] = $entry['name'];
            }
        }
        return Js::localeSorted($names);
    }

    /**
     * @internal City names in dataset order.
     * @return list<string>
     */
    public static function cityNames(): array
    {
        return array_column(self::cities(), 'name');
    }

    /**
     * @internal District names in dataset order.
     * @return list<string>
     */
    public static function districtNames(): array
    {
        return array_column(self::districts(), 'name');
    }

    /** @return list<array{key: string, name: string, province: string}> */
    private static function cities(): array
    {
        if (self::$cities === null) {
            self::$cities = [];
            foreach (Data::load('cities') as $entry) {
                self::$cities[] = [
                    'key' => Js::normalizeKey($entry['city']),
                    'name' => $entry['city'],
                    'province' => $entry['province'],
                ];
            }
        }
        return self::$cities;
    }

    /** @return list<array{key: string, name: string, province: string, provinceKey: string}> */
    private static function districts(): array
    {
        if (self::$districts === null) {
            self::$districts = [];
            foreach (Data::load('districts') as $entry) {
                self::$districts[] = [
                    'key' => Js::normalizeKey($entry['district']),
                    'name' => $entry['district'],
                    'province' => $entry['province'],
                    'provinceKey' => Js::normalizeKey($entry['province']),
                ];
            }
        }
        return self::$districts;
    }
}
