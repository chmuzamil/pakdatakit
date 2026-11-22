<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * A district's 2023 census counts. Returned by Population::getDistrict().
 */
final readonly class DistrictPopulation
{
    use Internal\ToArray;

    public function __construct(
        /** The district, as getDistrictsByProvince() names it. */
        public string $district,
        /** Its province or territory. */
        public string $province,
        /** Total population (all sexes), or null where the census has no figure. */
        public ?int $population,
        /** Households, or null. */
        public ?int $households,
        /** Urban population, or null. */
        public ?int $urban,
        /** Rural population, or null. */
        public ?int $rural,
        /** Always `2023`: the 7th Population and Housing Census. */
        public int $census,
        /**
         * The census district the figures belong to. For a district created
         * after the census, the one its area was part of (its own figures are
         * null); null in Gilgit-Baltistan and Azad Jammu and Kashmir, which
         * the census did not cover.
         */
        public ?string $censusDistrict,
        /**
         * True when the district has lost area to a district created after
         * the census: the figures are for the district as it was at the
         * census.
         */
        public bool $boundaryChanged,
        /** Why figures are missing or what they cover, or null. */
        public ?string $note,
        /** The census tables the figures are from. */
        public DataSource $source,
    ) {
    }
}
