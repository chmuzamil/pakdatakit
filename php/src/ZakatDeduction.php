<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * Result of Zakat::deduction(): Zakat deducted at source from one account.
 */
final readonly class ZakatDeduction
{
    use Internal\ToArray;

    public function __construct(
        /** The Zakat year (Hijri year of 1 Ramazan), e.g. `1447`. */
        public int $zakatYear,
        /** That year's nisab in rupees. */
        public int $nisab,
        /** The balance in rupees (2 decimals at most). */
        public float $balance,
        /** Whether Zakat is deducted from this balance. */
        public bool $deductible,
        /** Why not, when `deductible` is false: `exempt` or `below-nisab`; otherwise null. */
        public ?string $reason,
        /** Percent of the whole balance: 2.5. */
        public float $rate,
        /**
         * The amount deducted, in whole rupees (First Schedule, Note 2: less
         * than a rupee is not charged, 50 paisa or more counts as a rupee);
         * `0` if not deductible.
         */
        public int $zakat,
        /** The notification and SBP circular for the year. */
        public DataSource $source,
    ) {
    }
}
