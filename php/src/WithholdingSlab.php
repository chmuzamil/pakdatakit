<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * A value band of a withholding rate: the rate for amounts over `over` up to
 * `upTo` (inclusive; null for no limit).
 */
final readonly class WithholdingSlab
{
    use Internal\ToArray;

    public function __construct(
        /** The band applies to amounts over this many rupees. */
        public int|float $over,
        /** And up to this many rupees (inclusive), or null for no upper limit. */
        public int|float|null $upTo,
        /** Percent of the whole amount. */
        public int|float $rate,
    ) {
    }
}
