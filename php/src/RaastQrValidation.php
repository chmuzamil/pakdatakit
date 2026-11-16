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
        /** @var list<string> `not-a-raast-qr`, `bad-checksum`, `no-iban`, `invalid-iban`, `expired` or `missing-expiry`. */
        public array $errors,
        /** @var list<string> `amount-ignored` or `expires-soon`. */
        public array $warnings,
        /** The parsed QR, or null if it could not be read. */
        public ?ParsedRaastQr $qr,
    ) {
    }
}
