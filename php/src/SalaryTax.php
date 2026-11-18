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
        /** Tax for the year, in rupees, rounded half up to the paisa. */
        public float $tax,
        /** `tax / 12`, rounded half up to the paisa. */
        public float $monthly,
        /** `tax` as a percent of the income, rounded half up to 2 decimals. */
        public float $effectiveRate,
        /** The band the income falls in. */
        public SalaryTaxSlab $slab,
        /** The tax year used. */
        public int $taxYear,
    ) {
    }
}
