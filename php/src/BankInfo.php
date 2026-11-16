<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * A bank (or other institution) that issues Pakistani IBANs.
 */
final readonly class BankInfo
{
    use Internal\ToArray;

    public function __construct(
        /** 4-letter IBAN bank code (characters 5-8 of the IBAN). */
        public string $code,
        /** Current name of the institution. */
        public string $name,
        /** `commercial`, `islamic`, `microfinance`, `digital`, `emi`, `foreign`, `specialized`, `public-sector` or `central`. */
        public string $type,
        /** False for banks that merged into another or are no longer operating (such as one in liquidation). */
        public bool $active,
        /** Code of the bank this one merged into, if it no longer exists. */
        public ?string $mergedInto = null,
        /** Main code of the same bank, when this is an older code still in use. */
        public ?string $aliasOf = null,
    ) {
    }
}
