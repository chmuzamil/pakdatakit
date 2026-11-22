<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * The threshold of a withholding case and whether the amount given to
 * Withholding::calculate() was within it (nothing is then collected).
 */
final readonly class WithholdingThresholdCheck
{
    use Internal\ToArray;

    public function __construct(
        /** The threshold in rupees: nothing is collected at or below it. */
        public int|float $amount,
        /** The period the amounts are added up over, e.g. `day`. */
        public string $per,
        /** True if the amount was at or below the threshold. */
        public bool $withinThreshold,
    ) {
    }
}
