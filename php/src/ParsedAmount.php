<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * Result of Currency::parseAmount().
 */
final readonly class ParsedAmount
{
    use Internal\ToArray;

    public function __construct(
        /** The amount in rupees, rounded half-up to the paisa (2 decimals). */
        public float $value,
        /** The input with surrounding whitespace removed. */
        public string $raw,
    ) {
    }
}
