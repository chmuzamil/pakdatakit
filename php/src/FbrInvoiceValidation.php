<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * Result of FbrInvoice::validate().
 */
final readonly class FbrInvoiceValidation
{
    use Internal\ToArray;

    public function __construct(
        /** True when there are no errors. */
        public bool $valid,
        /** @var list<FbrInvoiceError> Every problem found, in the order the npm package reports them. */
        public array $errors,
    ) {
    }
}
