<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * A CNIC found in free text by Cnic::findAll().
 */
final readonly class CnicMatch
{
    use Internal\ToArray;

    public function __construct(
        /** The text as written, e.g. `35202 1234567-1` or with Urdu digits. */
        public string $raw,
        /** The 13 digits, in ASCII. */
        public string $digits,
        /** The CNIC in `#####-#######-#` form. */
        public string $formatted,
        /** Offset of the first character in the text, in code points (use with `mb_substr`). */
        public int $start,
        /** Offset just after the last character, in code points. */
        public int $end,
    ) {
    }
}
