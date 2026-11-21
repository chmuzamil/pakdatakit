<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * Result of RaastQr::validate().
 */
final readonly class RaastQrValidation
{
    use Internal\ToArray;

    public function __construct(
        /** True when there are no errors. */
        public bool $valid,
        /** `p2p` for a person-to-person QR, `merchant` for a merchant QR, null when the text is not a Raast QR. */
        public ?string $kind,
        /** @var list<string> `not-a-raast-qr`, `bad-checksum`, `no-iban`, `invalid-iban`, `expired` or `missing-expiry`. */
        public array $errors,
        /** @var list<string> `amount-ignored`, `expires-soon` or `no-iban` (a merchant QR that names no IBAN). */
        public array $warnings,
        /** The parsed QR, or null if it could not be read. */
        public ?ParsedRaastQr $qr,
    ) {
    }
}
