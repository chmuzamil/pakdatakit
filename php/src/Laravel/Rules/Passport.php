<?php

declare(strict_types=1);

namespace PakDataKit\Laravel\Rules;

use PakDataKit\Passport as CorePassport;

/**
 * Validates the format of a Pakistani passport number. The same check as the `pk_passport` rule.
 */
final class Passport extends PakRule
{
    protected function rule(): string
    {
        return 'pk_passport';
    }

    protected function passes(string $value): bool
    {
        return CorePassport::validate($value);
    }
}
