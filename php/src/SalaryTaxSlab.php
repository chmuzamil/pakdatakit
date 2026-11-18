<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * One band of the salaried rate table: income above `over` (and up to
 * `upTo`) pays `fixed` plus `rate` percent of the amount above `over`.
 */
final readonly class SalaryTaxSlab
{
    use Internal\ToArray;

    public function __construct(
        /** Lower bound in rupees (income must exceed it). */
        public int $over,
        /** Upper bound in rupees, or null for the top band. */
        public ?int $upTo,
        /** Tax on the income up to `over`, in rupees. */
        public int $fixed,
        /** Percent of the income above `over`, e.g. `17.5`. */
        public int|float $rate,
    ) {
    }
}
