<?php

declare(strict_types=1);

namespace PakDataKit\Laravel\Rules;

use PakDataKit\Tax;

/**
 * Validates the format of a National Tax Number. The same check as the `pk_ntn` rule.
 */
final class Ntn extends PakRule
{
    protected function rule(): string
    {
        return 'pk_ntn';
    }

    protected function passes(string $value): bool
    {
        return Tax::validateNtn($value);
    }
}
