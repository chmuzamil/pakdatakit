<?php

declare(strict_types=1);

namespace PakDataKit\Laravel\Rules;

use PakDataKit\Quality;

/**
 * Validates a mobile number a courier can call: a valid Pakistani mobile
 * number with no Quality::phoneRiskSignals() flags. The same check as the
 * `pk_cod_phone` rule.
 */
final class CodPhone extends PakRule
{
    protected function rule(): string
    {
        return 'pk_cod_phone';
    }

    protected function passes(string $value): bool
    {
        return Quality::phoneRiskSignals($value) === [];
    }
}
