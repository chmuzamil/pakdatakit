<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * A parsed EMV field of a QR payload.
 */
final readonly class EmvField
{
    use Internal\ToArray;

    public function __construct(
        /** 2-digit field ID. */
        public string $id,
        /** Field value. */
        public string $value,
        /** @var list<EmvField>|null Sub-fields, for template fields; otherwise null. */
        public ?array $children = null,
    ) {
    }
}
