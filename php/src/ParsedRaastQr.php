<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * Result of RaastQr::parse().
 */
final readonly class ParsedRaastQr
{
    use Internal\ToArray;

    public function __construct(
        /** `p2p` for person-to-person QR codes, `merchant` for EMVCo merchant QR codes. */
        public string $kind,
        /** Whether the QR carries a fixed amount (point of initiation 12). */
        public bool $dynamic,
        /** Whether the CRC checksum matches. */
        public bool $crcValid,
        /** The payee's IBAN, if present. */
        public ?string $iban,
        /** Whether the IBAN is a valid Pakistani IBAN. */
        public bool $ibanValid,
        /** Amount in rupees, if present. */
        public ?float $amount,
        /** P2P: expiry of a dynamic QR as local `YYYY-MM-DDTHH:mm`. */
        public ?string $expiresAt,
        /** P2P: bank name. */
        public ?string $bankName,
        /** P2P: payment description. */
        public ?string $particulars,
        /** Merchant: merchant name. */
        public ?string $merchantName,
        /** Merchant: city. */
        public ?string $city,
        /** Merchant: 4-digit category code. */
        public ?string $mcc,
        /** Bill number, if present. */
        public ?string $billNumber,
        /** Due date as `YYYY-MM-DD`, if present. */
        public ?string $dueDate,
        /** Amount payable after the due date, if present. */
        public ?float $amountAfterDueDate,
        /** @var list<EmvField> All top-level fields, with template fields parsed into children. */
        public array $fields,
    ) {
    }
}
