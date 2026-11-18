<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * Result of Bills::parseElectricityRef().
 */
final readonly class ElectricityRef
{
    use Internal\ToArray;

    public function __construct(
        /**
         * Kind of identifier: `reference` (14-digit DISCO reference number),
         * `customer-id` (DISCO customer ID, 10 or 11 digits) or `k-electric`
         * (13-digit K-Electric account number). See the Bills constants.
         */
        public string $type,
        /** The digits, without separators or the U/R letter. */
        public string $digits,
        /**
         * Display form: `01 14111 1234567 U` for a reference (2, 5 and 7
         * digits), the digits for the others.
         */
        public string $formatted,
        /** `U` or `R` when given after a reference number, otherwise null. */
        public ?string $urbanRural,
        /**
         * `K-Electric` for a K-Electric account; otherwise null, because no
         * official source maps reference or customer ID digits to a DISCO.
         */
        public ?string $disco,
    ) {
    }
}
