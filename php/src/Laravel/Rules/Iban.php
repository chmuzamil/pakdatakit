<?php

declare(strict_types=1);

namespace PakDataKit\Laravel\Rules;

use PakDataKit\Iban as CoreIban;

/**
 * Validates a Pakistani IBAN. The same check as the `pk_iban` rule.
 */
final class Iban extends PakRule
{
    protected function rule(): string
    {
        return 'pk_iban';
    }

    protected function passes(string $value): bool
    {
        return CoreIban::validate($value);
    }
}
