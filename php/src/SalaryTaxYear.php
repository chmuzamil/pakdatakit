<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * The salaried rate table for one tax year (1 July to 30 June).
 */
final readonly class SalaryTaxYear
{
    use Internal\ToArray;

    public function __construct(
        /** The tax year, named after the June it ends in: 2026 is 1 July 2025 to 30 June 2026. */
        public int $taxYear,
        /** `YYYY-MM-DD`, always 1 July. */
        public string $from,
        /** `YYYY-MM-DD`, always 30 June. */
        public string $to,
        /** The law that sets the table. */
        public string $law,
        /** Official document. */
        public string $source,
        /** @var list<SalaryTaxSlab> The bands, lowest first. */
        public array $slabs,
    ) {
    }
}
