<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * A tehsil's (or taluka's, sub-division's) 2023 census counts. Returned by
 * Population::getTehsil().
 */
final readonly class TehsilPopulation
{
    use Internal\ToArray;

    public function __construct(
        /** The tehsil, as the census tables name it. */
        public string $tehsil,
        /** The district at the census. */
        public string $censusDistrict,
        /** The district today, or null where the data gives none. */
        public ?string $currentDistrict,
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
        /** What the figures cover, or null. */
        public ?string $note,
        /** The census tables the figures are from. */
        public DataSource $source,
    ) {
    }
}
