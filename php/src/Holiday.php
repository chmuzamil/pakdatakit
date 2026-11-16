<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * A public holiday on a specific date.
 */
final readonly class Holiday
{
    use Internal\ToArray;

    public function __construct(
        /** Identifier such as `eid-ul-fitr` or `independence-day`. */
        public string $id,
        /** English name. */
        public string $name,
        /** Date as `YYYY-MM-DD`. */
        public string $date,
        /** `national` or `religious`. */
        public string $type,
        /** True when an Islamic date is estimated from the tabular Hijri calendar. */
        public bool $estimated,
        /** True for holidays that apply to Christian employees only; otherwise null. */
        public ?bool $christiansOnly = null,
        /** Source of an observed Islamic holiday date, when known. */
        public ?string $source = null,
    ) {
    }
}
