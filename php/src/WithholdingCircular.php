<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * An FBR circular that explains a withholding rate (WithholdingRate::$circular).
 */
final readonly class WithholdingCircular
{
    use Internal\ToArray;

    public function __construct(
        /** The circular's number, date and paragraph, as written. */
        public string $reference,
        /** The official document. */
        public string $url,
    ) {
    }
}
