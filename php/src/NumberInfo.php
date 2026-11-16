<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * Result of Numbers::analyze().
 */
final readonly class NumberInfo
{
    use Internal\ToArray;

    public function __construct(
        /** `mobile`, `landline`, `uan`, `toll-free`, `premium` or `personal`. */
        public string $type,
        /** National format with trunk prefix and separators, e.g. `021-111-825-888`. */
        public string $formatted,
        /** E.164 format; null for a UAN dialled without an area code. */
        public ?string $e164,
        /** Area code with trunk prefix (e.g. `021`) for landlines and UANs. */
        public ?string $areaCode = null,
        /** @var list<string> Cities served by the area code, when known. */
        public array $cities = [],
    ) {
    }
}
