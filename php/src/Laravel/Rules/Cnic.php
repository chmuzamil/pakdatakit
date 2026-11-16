<?php

declare(strict_types=1);

namespace PakDataKit\Laravel\Rules;

use PakDataKit\Cnic as CoreCnic;

/**
 * Validates a CNIC. The same check as the `pk_cnic` rule.
 */
final class Cnic extends PakRule
{
    protected function rule(): string
    {
        return 'pk_cnic';
    }

    protected function passes(string $value): bool
    {
        return CoreCnic::validate($value);
    }
}
