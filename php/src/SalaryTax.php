<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * Result of IncomeTax::calculateSalary() and IncomeTax::calculateMonthlySalary().
 */
final readonly class SalaryTax
{
    use Internal\ToArray;

    public function __construct(
        /** Tax for the year from the rate table, in rupees, rounded half up to the paisa. */
        public float $tax,
        /**
         * The section 4AB surcharge, rounded half up to the paisa. `0` unless
         * `includeSurcharge` is set and the year and income attract one.
         */
        public float $surcharge,
        /** `tax + surcharge`: the year's total. */
        public float $total,
        /** `total / 12`, rounded half up to the paisa. */
        public float $monthly,
        /** `total` as a percent of the income, rounded half up to 2 decimals. */
        public float $effectiveRate,
        /** The band the income falls in. */
        public SalaryTaxSlab $slab,
        /** The tax year used. */
        public int $taxYear,
        /** The rate table used: its tax year's dates, law and official source. */
        public DataSource $source,
    ) {
    }
}
