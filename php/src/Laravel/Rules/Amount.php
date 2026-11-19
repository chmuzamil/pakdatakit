<?php

declare(strict_types=1);

namespace PakDataKit\Laravel\Rules;

use PakDataKit\Currency;

/**
 * Validates a rupee amount as people type it (`150,000`, `Rs. 1,50,000/-`,
 * `1.5 lakh`): Currency::parseAmount() must read it. The same check as the
 * `pk_amount` rule.
 */
final class Amount extends PakRule
{
    protected function rule(): string
    {
        return 'pk_amount';
    }

    protected function passes(string $value): bool
    {
        return Currency::parseAmount($value) !== null;
    }
}
