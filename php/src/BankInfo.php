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
        /**
         * `active`, `merged` (see `mergedInto`) or `liquidated`. Every bank
         * from Iban::getBankInfo() and Iban::getBanks() has it; `active` is
         * only the default for code that builds a BankInfo itself.
         */
        public string $status = 'active',
        /**
         * The institution's official website (from SBP's lists of regulated
         * institutions, or its own site where SBP lists none or an old
         * domain), or null for a bank that no longer exists.
         */
        public ?string $website = null,
        /** What SBP's list gives, where it differs from `website` (an older domain); otherwise null. */
        public ?string $websiteSbpListed = null,
        /**
         * The 8-character SWIFT/BIC code, only where SBP or the institution's
         * own website prints it; otherwise null (see `swiftReason`).
         */
        public ?string $swift = null,
        /** Where `swift` is printed, and when it was checked; null without `swift`. */
        public ?BankSwiftSource $swiftSource = null,
        /** Why `swift` is null, or null when it is set. */
        public ?string $swiftReason = null,
    ) {
    }
}
