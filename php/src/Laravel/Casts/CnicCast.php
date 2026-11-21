<?php

declare(strict_types=1);

namespace PakDataKit\Laravel\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;
use PakDataKit\Cnic;

/**
 * Eloquent cast for a CNIC. Stores the 13 digits; reads back as `35202-1234567-1`.
 *
 * A value that is not valid is stored and returned unchanged: validate it
 * with the matching rule before saving.
 *
 * @implements CastsAttributes<string|null, string|null>
 */
final class CnicCast implements CastsAttributes
{
    /**
     * Reads the stored CNIC back as `35202-1234567-1`. A value that is not valid is returned unchanged.
     * A value that is not a string is returned as a string if it is scalar,
     * and as null otherwise.
     *
     * @param array<string, mixed> $attributes
     */
    public function get(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if (!is_string($value)) {
            return is_scalar($value) ? (string) $value : null;
        }
        return Cnic::getInfo($value)?->formatted ?? $value;
    }

    /**
     * Stores a CNIC as its 13 digits. A value that is not valid is stored unchanged.
     * A value that is not a string is stored as a string if it is scalar,
     * and as null otherwise.
     *
     * @param array<string, mixed> $attributes
     */
    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if (!is_string($value)) {
            return is_scalar($value) ? (string) $value : null;
        }
        return Cnic::getInfo($value)?->digits ?? $value;
    }
}
