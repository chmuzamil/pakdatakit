<?php

declare(strict_types=1);

namespace PakDataKit\Laravel\Rules;

use PakDataKit\Phone as CorePhone;

/**
 * Validates a Pakistani mobile number. The same check as the `pk_phone` rule.
 */
final class Phone extends PakRule
{
    protected function rule(): string
    {
        return 'pk_phone';
    }

    protected function passes(string $value): bool
    {
        return CorePhone::validate($value);
    }
}
