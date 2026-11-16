<?php

declare(strict_types=1);

namespace PakDataKit\Laravel\Rules;

use PakDataKit\VehiclePlate as CoreVehiclePlate;

/**
 * Validates the format of a vehicle registration number. The same check as the `pk_vehicle_plate` rule.
 */
final class VehiclePlate extends PakRule
{
    protected function rule(): string
    {
        return 'pk_vehicle_plate';
    }

    protected function passes(string $value): bool
    {
        return CoreVehiclePlate::validate($value);
    }
}
