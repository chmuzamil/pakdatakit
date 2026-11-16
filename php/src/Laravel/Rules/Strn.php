<?php

declare(strict_types=1);

namespace PakDataKit\Laravel\Rules;

use PakDataKit\Tax;

/**
 * Validates the format of a Sales Tax Registration Number. The same check as the `pk_strn` rule.
 */
final class Strn extends PakRule
{
    protected function rule(): string
    {
        return 'pk_strn';
    }

    protected function passes(string $value): bool
    {
        return Tax::validateStrn($value);
    }
}
