<?php

declare(strict_types=1);

namespace PakDataKit\Laravel\Rules;

use PakDataKit\Numbers;

/**
 * Validates a Pakistani landline number. The same check as the `pk_landline`
 * rule; `new Landline(services: true)` is `pk_landline:services`.
 */
final class Landline extends PakRule
{
    /**
     * @param bool $services Also accept UAN, toll-free and premium-rate
     *   numbers (see Numbers::validateLandline()). Default false.
     */
    public function __construct(private readonly bool $services = false)
    {
    }

    protected function rule(): string
    {
        return 'pk_landline';
    }

    protected function passes(string $value): bool
    {
        return Numbers::validateLandline($value, services: $this->services);
    }
}
