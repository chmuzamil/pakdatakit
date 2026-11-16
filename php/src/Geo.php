<?php

declare(strict_types=1);

namespace PakDataKit;

use PakDataKit\Internal\Data;
use PakDataKit\Internal\Js;

/**
 * Cities, districts, divisions, tehsils and provinces.
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

    /** @var list<array{name: string, provinceKey: string}>|null */
    private static ?array $divisions = null;

    /** @var array<string, string>|null District key to division name. */
    private static ?array $divisionOfDistrict = null;

    /** @var list<array{key: string, name: string, censusKey: string, censusDistrict: string, currentKey: ?string, provinceKey: string}>|null */
    private static ?array $tehsils = null;

    /** @var array<string, true>|null Keys of the districts of the 2023 census. */
    private static ?array $censusDistrictKeys = null;

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
     * Returns the administrative divisions of Pakistan, or of one province
     * (case-insensitive), sorted.
     *
     * The list is the 30 divisions of the 2023 census: Punjab 9, Sindh 6,
     * Khyber Pakhtunkhwa 7 and Balochistan 8. Islamabad has no division, and
     * the census tables do not cover Azad Jammu and Kashmir or
     * Gilgit-Baltistan. Divisions created since the census (such as Gujrat in
     * Punjab) are not included.
     *
     * With no argument or null, every division is returned. An empty,
     * unknown or invalid UTF-8 province gives an empty array. Never throws.
     *
     * @return list<string>
     */
    public static function getDivisions(?string $province = null): array
    {
        $names = [];
        if ($province === null) {
            $names = array_column(self::divisions(), 'name');
        } else {
            $key = Js::normalizeKey($province);
            if ($key === '') {
                return [];
            }
            foreach (self::divisions() as $entry) {
                if ($entry['provinceKey'] === $key) {
                    $names[] = $entry['name'];
                }
            }
        }
        return Js::localeSorted($names);
    }

    /**
     * Returns the division a district belonged to in the 2023 census, or
     * null if it is not known (case-insensitive).
     *
     * Census-district caveat: only the 136 districts of the 2023 census have
     * a division here, under the name they had then (so `Quetta`, `Dera
     * Bugti` and `South Waziristan` work, and their successors do not).
     * Districts created after the census, and those of Azad Jammu and
     * Kashmir, Gilgit-Baltistan and Islamabad, return null.
     *
     * Null, empty, unknown or invalid UTF-8 input returns null. Never throws.
     */
    public static function getDivisionOfDistrict(?string $district): ?string
    {
        $key = Js::normalizeKey($district ?? '');
        if ($key === '') {
            return null;
        }
        self::divisions();
        return self::$divisionOfDistrict[$key] ?? null;
    }

    /**
     * Returns the tehsils (talukas, sub-divisions) of a district
     * (case-insensitive), sorted. Former district names such as `Quetta` and
     * `South Waziristan` work.
     *
     * Census-district caveat: the data is the 591 tehsil-level units of the
     * 2023 census, each recorded under the district it was in then. For a
     * district of the 2023 census this returns its census tehsils, even if
     * some have since moved to a new district (so `Rawalpindi` still lists
     * Murree). For a district created after the census it returns only the
     * tehsils an official source places in it, which can be an empty array.
     * Azad Jammu and Kashmir and Gilgit-Baltistan are not covered.
     *
     * Null, empty, unknown or invalid UTF-8 input returns an empty array.
     * Never throws.
     *
     * @return list<string>
     */
    public static function getTehsils(?string $district): array
    {
        $key = Js::normalizeKey($district ?? '');
        if ($key === '') {
            return [];
        }
        $tehsils = self::tehsils();
        $field = isset(self::$censusDistrictKeys[$key]) ? 'censusKey' : 'currentKey';
        $names = [];
        foreach ($tehsils as $entry) {
            if ($entry[$field] === $key) {
                $names[] = $entry['name'];
            }
        }
        return Js::localeSorted($names);
    }

    /**
     * Returns the district a tehsil, taluka or sub-division was in at the
     * 2023 census, or null (case-insensitive).
     *
     * Census-district caveat: the result is the census district, which may
     * have been split since (a tehsil of `Quetta` is now in Quetta East or
     * Quetta West). A few names are shared by tehsils in different districts
     * (`Saddar`, `Sahiwal`, `Khanpur`); pass the province to tell them apart.
     * Returns null when the name is unknown or still matches more than one
     * district.
     *
     * A null province (the default) searches every province; an empty or
     * unknown one matches nothing. Null, empty or invalid UTF-8 input
     * returns null. Never throws.
     */
    public static function getTehsilDistrict(?string $tehsil, ?string $province = null): ?string
    {
        $key = Js::normalizeKey($tehsil ?? '');
        if ($key === '') {
            return null;
        }
        $provinceKey = $province === null ? null : Js::normalizeKey($province);
        $matches = [];
        foreach (self::tehsils() as $entry) {
            if ($entry['key'] === $key && ($provinceKey === null || $entry['provinceKey'] === $provinceKey)) {
                $matches[$entry['censusDistrict']] = true;
            }
        }
        return count($matches) === 1 ? (string) array_key_first($matches) : null;
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

    /** @return list<array{name: string, provinceKey: string}> */
    private static function divisions(): array
    {
        if (self::$divisions === null) {
            $divisions = [];
            $ofDistrict = [];
            foreach (Data::load('divisions') as $entry) {
                $divisions[] = [
                    'name' => $entry['division'],
                    'provinceKey' => Js::normalizeKey($entry['province']),
                ];
                foreach ($entry['districts'] as $district) {
                    $ofDistrict[Js::normalizeKey($district)] = $entry['division']; // the last entry wins
                }
            }
            self::$divisionOfDistrict = $ofDistrict;
            self::$divisions = $divisions;
        }
        return self::$divisions;
    }

    /** @return list<array{key: string, name: string, censusKey: string, censusDistrict: string, currentKey: ?string, provinceKey: string}> */
    private static function tehsils(): array
    {
        if (self::$tehsils === null) {
            $tehsils = [];
            $census = [];
            foreach (Data::load('tehsils') as $entry) {
                $censusKey = Js::normalizeKey($entry['censusDistrict']);
                $census[$censusKey] = true;
                $tehsils[] = [
                    'key' => Js::normalizeKey($entry['tehsil']),
                    'name' => $entry['tehsil'],
                    'censusKey' => $censusKey,
                    'censusDistrict' => $entry['censusDistrict'],
                    'currentKey' => $entry['currentDistrict'] === null
                        ? null
                        : Js::normalizeKey($entry['currentDistrict']),
                    'provinceKey' => Js::normalizeKey($entry['province']),
                ];
            }
            self::$censusDistrictKeys = $census;
            self::$tehsils = $tehsils;
        }
        return self::$tehsils;
    }
}
