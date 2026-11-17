<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * A delivery post office from Pakistan Post's post code directory.
 */
final readonly class PostOffice
{
    use Internal\ToArray;

    public function __construct(
        /** 5-digit post code, e.g. `48330`. */
        public string $code,
        /** Office name as the directory gives it, in title case, e.g. `Dulmial`. */
        public string $office,
        /**
         * The city the office belongs to when that is known (`Lahore` for an
         * office in Lahore); otherwise the office's own name, which for most
         * offices is its town or village.
         */
        public string $town,
        /** The district, when the town is the headquarters a district is named after; otherwise null. */
        public ?string $district,
        /** Province or territory. */
        public string $province,
    ) {
    }
}
