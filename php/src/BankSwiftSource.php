<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * Where a bank's SWIFT/BIC code is printed (BankInfo::$swiftSource).
 */
final readonly class BankSwiftSource
{
    use Internal\ToArray;

    public function __construct(
        /** `sbp` (State Bank of Pakistan), `bank-site` (the institution's own domain) or `directory` (a SWIFT code directory, not confirmed by SBP or the bank). */
        public string $bicSource,
        /** The code as printed, e.g. `HABBPKKAXXX` or `MEZN PK KA`. */
        public string $printed,
        /** The page or document that prints it. */
        public string $sourceUrl,
        /** The PDF page, or null for a web page. */
        public ?int $page,
        /** When the source was checked (`YYYY-MM-DD`). */
        public string $checkedAt,
    ) {
    }
}
