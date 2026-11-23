<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * A document behind a Zakat year's nisab: its number, date and URL.
 */
final readonly class ZakatDocument
{
    use Internal\ToArray;

    public function __construct(
        /** Its number, e.g. `BPRD Circular Letter No. 03 of 2026`. */
        public string $number,
        /** Its date (`YYYY-MM-DD`). */
        public string $date,
        /** The official document. */
        public string $url,
    ) {
    }
}
