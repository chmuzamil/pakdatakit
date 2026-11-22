<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * Result of Cnic::mask(): the text with every CNIC masked.
 */
final readonly class MaskedText
{
    use Internal\ToArray;

    public function __construct(
        /** The text with every CNIC masked (or replaced, with `replacement`). */
        public string $text,
        /** How many CNICs were masked. */
        public int $count,
    ) {
    }
}
