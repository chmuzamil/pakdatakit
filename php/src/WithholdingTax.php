<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * Result of Withholding::calculate(): the tax to withhold or collect under
 * one section of the Income Tax Ordinance 2001.
 */
final readonly class WithholdingTax
{
    use Internal\ToArray;

    public function __construct(
        /** Section of the Income Tax Ordinance 2001, e.g. `236K`. */
        public string $section,
        /** The case of the section, e.g. `purchase`. */
        public string $subType,
        /** The case as the rate card describes it. */
        public string $description,
        /** The tax year (July to June) used. */
        public int $taxYear,
        /** Whether the person is on FBR's Active Taxpayers List. */
        public bool $atl,
        /** Whether the late-filer case was asked for (only for a person on the list). */
        public bool $lateFiler,
        /** Percent applied to the whole amount (for 149, the effective rate). */
        public int|float $rate,
        /**
         * Tax to withhold or collect, in whole rupees: section 219 of the
         * Ordinance disregards fractions under 50 paisa and counts 50 paisa
         * or more as a rupee.
         */
        public int $tax,
        /**
         * How the rate for a person not on the list is set for this case:
         * `double` (the Tenth Schedule's 100% increase), `fixed` (its own
         * rate, as for 236C, or 231AB, which applies only to them), `slabs`
         * (its own value bands, 236K) or `not-applicable` (149: the same rate
         * for all).
         */
        public string $nonAtlRule,
        /** The value band used (236C, 236K), or null. */
        public ?WithholdingSlab $slab,
        /** The threshold and whether the amount was within it, or null where there is none. */
        public ?WithholdingThresholdCheck $threshold,
        /** Rate card reference, as printed on the card. */
        public string $cardRef,
        /** Law reference, as printed on the card. */
        public string $lawRef,
        /** Where the statute differs from the card and the statute is used, why; otherwise null. */
        public ?string $statuteOverride,
        /**
         * 154B with `resident` given: `minimum` for a resident, `final` for a
         * non-resident without a permanent establishment in Pakistan;
         * otherwise null.
         */
        public ?string $taxNature,
        /** The rate card and law, with the tax year's dates. */
        public DataSource $source,
    ) {
    }
}
