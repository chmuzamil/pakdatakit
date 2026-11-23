<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * One case of a withholding section in a tax year, as in FBR's Withholding
 * Tax Rate Card. Returned by Withholding::getRates().
 */
final readonly class WithholdingRate
{
    use Internal\ToArray;

    public function __construct(
        /** The tax year (July to June), e.g. `2027`. */
        public int $taxYear,
        /** Section of the Income Tax Ordinance 2001, e.g. `153`. */
        public string $section,
        /** The case of the section, e.g. `goods-company`. */
        public string $subType,
        /** The case as the rate card describes it. */
        public string $description,
        /**
         * Percent for a person on the Active Taxpayers List; null where it
         * does not apply or depends on the value (see `atlSlabs`).
         */
        public int|float|null $atlRate,
        /** @var list<WithholdingSlab>|null Value bands for a person on the list, or null. */
        public ?array $atlSlabs,
        /**
         * How the rate for a person not on the list is set: `double`, `fixed`,
         * `slabs` or `not-applicable` (see WithholdingTax::$nonAtlRule).
         */
        public string $nonAtlRule,
        /** Percent for a person not on the list, or null (see `nonAtlSlabs`). */
        public int|float|null $nonAtlRate,
        /** @var list<WithholdingSlab>|null Value bands for a person not on the list, or null. */
        public ?array $nonAtlSlabs,
        /** @var list<WithholdingSlab>|null Late-filer value bands, where the year has them; otherwise null. */
        public ?array $lateFilerSlabs,
        /** The amount at or below which nothing is collected, or null where there is none. */
        public ?WithholdingThreshold $threshold,
        /** Rate card reference, as printed on the card. */
        public string $cardRef,
        /** Law reference, as printed on the card. */
        public string $lawRef,
        /** Where the statute differs from the card and the statute is used, why; otherwise null. */
        public ?string $statuteOverride,
        /** A note on the case, or null. */
        public ?string $note,
        /** FBR's circular explaining the rate, where one is recorded; otherwise null. */
        public ?WithholdingCircular $circular,
        /** The rate card and law, with the tax year's dates. */
        public DataSource $source,
    ) {
    }
}
