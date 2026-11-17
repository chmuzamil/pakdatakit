<?php

declare(strict_types=1);

namespace PakDataKit\Laravel\Rules;

use PakDataKit\Bills;

/**
 * Validates an electricity bill reference number, customer ID or K-Electric account number. The same check as the
 * `pk_electricity_ref` rule.
 */
final class ElectricityRef extends PakRule
{
    protected function rule(): string
    {
        return 'pk_electricity_ref';
    }

    protected function passes(string $value): bool
    {
        return Bills::validateElectricityRef($value);
    }
}
