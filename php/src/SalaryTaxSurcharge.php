<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * The surcharge under section 4AB of the Income Tax Ordinance: `rate`
 * percent of the tax from the rate table, payable when taxable income
 * exceeds `over` rupees.
 */
final readonly class SalaryTaxSurcharge
{
    use Internal\ToArray;

    public function __construct(
        /** Percent of the tax from the rate table. `0` where the law sets none. */
        public int|float $rate,
        /** Taxable income must exceed this many rupees (Rs 10 million). */
        public int $over,
        /** The law that sets it. */
        public string $law,
        /** Official document. */
        public string $source,
    ) {
    }
}
