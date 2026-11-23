<?php

declare(strict_types=1);

namespace PakDataKit;

use PakDataKit\Internal\Data;
use PakDataKit\Internal\Js;

/**
 * Population, households and the urban/rural split of districts and tehsils
 * from Pakistan's 7th Population and Housing Census 2023 (Pakistan Bureau of
 * Statistics).
 */
final class Population
{
    private const SOURCE_REFERENCE = '7th Population and Housing Census 2023, Table 1 (population, urban and rural)'
        . ' and Table 20 (households)';

    private const SOURCE_URL = 'https://www.pbs.gov.pk/result-excel/';

    /** @var array<string, array<string, mixed>>|null District key to data row. */
    private static ?array $districts = null;

    /** @var array<string, list<array<string, mixed>>>|null Tehsil key to data rows. */
    private static ?array $tehsils = null;

    /**
     * A district's population, households and urban/rural split from the
     * 2023 census, for any of the 177 districts in
     * Geo::getDistrictsByProvince().
     *
     * - Districts created after the census have null figures and name the
     *   census district their area was part of; nothing is estimated.
     * - Districts that lost area to a new district keep their census
     *   figures, with `boundaryChanged: true`.
     * - Gilgit-Baltistan and Azad Jammu and Kashmir were not enumerated by
     *   this census, so their figures are null.
     *
     * ```php
     * Population::getDistrict('Lahore')?->population; // 13004135
     * Population::getDistrict('Murree')?->population; // null (created after the census)
     * ```
     *
     * @param mixed $district A district name, in any case (spaces collapsed)
     * @return DistrictPopulation|null The figures and their source, or null
     *   for an unknown district or a value that is not a string. Never
     *   throws.
     */
    public static function getDistrict(mixed $district): ?DistrictPopulation
    {
        if (!is_string($district)) {
            return null;
        }
        $row = self::districts()[Js::normalizeKey($district)] ?? null;
        if ($row === null) {
            return null;
        }
        return new DistrictPopulation(
            district: $row['district'],
            province: $row['province'],
            population: $row['population'],
            households: $row['households'],
            urban: $row['urban'],
            rural: $row['rural'],
            census: 2023,
            censusDistrict: $row['inCensusDistrict'],
            boundaryChanged: $row['boundaryChanged'],
            note: $row['note'],
            source: self::source('district-population'),
        );
    }

    /**
     * A tehsil's (or taluka's, sub-division's) population, households and
     * urban/rural split from the 2023 census, for the 591 units in the
     * census tables. A few names occur in more than one district; give the
     * district (at the census or today) to choose.
     *
     * ```php
     * Population::getTehsil('Murree')?->currentDistrict; // 'Murree'
     * Population::getTehsil('Saddar', 'Quetta')?->censusDistrict; // 'Quetta'
     * ```
     *
     * @param mixed $tehsil A tehsil name, in any case (spaces collapsed)
     * @param mixed $district Its district at the census or today, in any
     *   case; needed only when the name is not unique. Anything that is not a
     *   string is ignored.
     * @return TehsilPopulation|null The figures and their source, or null
     *   for an unknown or ambiguous name or a value that is not a string.
     *   Never throws.
     */
    public static function getTehsil(mixed $tehsil, mixed $district = null): ?TehsilPopulation
    {
        if (!is_string($tehsil)) {
            return null;
        }
        $rows = self::tehsils()[Js::normalizeKey($tehsil)] ?? [];
        if (is_string($district)) {
            $key = Js::normalizeKey($district);
            $rows = array_values(array_filter(
                $rows,
                static fn (array $row): bool => Js::normalizeKey($row['inCensusDistrict']) === $key
                    || (is_string($row['currentDistrict']) && Js::normalizeKey($row['currentDistrict']) === $key),
            ));
        }
        if (count($rows) !== 1) {
            return null;
        }
        $row = $rows[0];
        return new TehsilPopulation(
            tehsil: $row['tehsil'],
            censusDistrict: $row['inCensusDistrict'],
            currentDistrict: $row['currentDistrict'],
            province: $row['province'],
            population: $row['population'],
            households: $row['households'],
            urban: $row['urban'],
            rural: $row['rural'],
            census: 2023,
            note: $row['note'],
            source: self::source('tehsil-population'),
        );
    }

    private static function source(string $id): DataSource
    {
        return new DataSource(
            id: $id,
            effectiveFrom: '2023-03-01',
            effectiveTo: null,
            sourceReference: self::SOURCE_REFERENCE,
            sourceUrl: self::SOURCE_URL,
        );
    }

    /** @return array<string, array<string, mixed>> */
    private static function districts(): array
    {
        if (self::$districts === null) {
            self::$districts = [];
            foreach (Data::load('district-population') as $row) {
                self::$districts[Js::normalizeKey($row['district'])] = $row;
            }
        }
        return self::$districts;
    }

    /** @return array<string, list<array<string, mixed>>> */
    private static function tehsils(): array
    {
        if (self::$tehsils === null) {
            self::$tehsils = [];
            foreach (Data::load('tehsil-population') as $row) {
                self::$tehsils[Js::normalizeKey($row['tehsil'])][] = $row;
            }
        }
        return self::$tehsils;
    }
}
