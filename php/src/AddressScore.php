<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * Result of Quality::scoreAddress().
 */
final readonly class AddressScore
{
    use Internal\ToArray;

    public function __construct(
        /** 0 (unusable) to 100 (every part present and consistent). */
        public int $score,
        /**
         * @var list<string> Parts not found (`city`, `houseNumber`, `street`,
         * `area`, `postalCode`, `landmark`), in the order of
         * Quality::ADDRESS_WEIGHTS.
         */
        public array $missing,
        /** The address as Address::parse() reads it, with any extra warnings. */
        public ParsedAddress $parsed,
    ) {
    }
}
