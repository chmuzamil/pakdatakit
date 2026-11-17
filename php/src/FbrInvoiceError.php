<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * One problem found by FbrInvoice::validate().
 */
final readonly class FbrInvoiceError
{
    use Internal\ToArray;

    public function __construct(
        /**
         * FBR's error code (spec §7 and the Error Message Guide), e.g. `0401`,
         * or null for a required field the specification gives no code for.
         */
        public ?string $code,
        /** Where: `invoiceDate`, `items[0].rate` … */
        public string $field,
        public string $message,
    ) {
    }
}
