<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * Combined phone validation, formatting and network result.
 */
final readonly class PhoneAnalysis
{
    use Internal\ToArray;

    public function __construct(
        /** Whether the number is a valid Pakistani mobile number. */
        public bool $valid,
        /** E.164 form such as `+923001234567`, or null if invalid. */
        public ?string $formatted,
        /** Network the prefix was originally allocated to, or `Unknown`. */
        public string $network,
    ) {
    }
}
