<?php

declare(strict_types=1);

namespace PakDataKit\Laravel\Rules;

use PakDataKit\Numbers;

/**
 * Validates a Pakistani landline number. The same check as the `pk_landline` rule.
 */
final class Landline extends PakRule
{
    protected function rule(): string
    {
        return 'pk_landline';
    }

    protected function passes(string $value): bool
    {
        return Numbers::validateLandline($value);
    }
}
