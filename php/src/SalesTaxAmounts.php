<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * Result of SalesTax::calculate() and SalesTax::splitInclusive(), in rupees.
 * `net + tax` is always `gross`, to the paisa.
 */
final readonly class SalesTaxAmounts
{
    use Internal\ToArray;

    public function __construct(
        /** Value excluding tax, in rupees (2 decimals at most). */
        public float $net,
        /** The tax, in rupees. */
        public float $tax,
        /** Value including tax, in rupees. */
        public float $gross,
        /** Percent used. */
        public float $rate,
    ) {
    }
}
