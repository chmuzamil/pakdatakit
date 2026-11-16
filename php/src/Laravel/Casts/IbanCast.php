<?php

declare(strict_types=1);

namespace PakDataKit\Laravel\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;
use PakDataKit\Iban;

/**
 * Eloquent cast for a Pakistani IBAN. Stores and reads the IBAN in uppercase without spaces.
 *
 * A value that is not valid is stored and returned unchanged: validate it
 * with the matching rule before saving.
 *
 * @implements CastsAttributes<string|null, string|null>
 */
final class IbanCast implements CastsAttributes
{
    /** @param array<string, mixed> $attributes */
    public function get(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if (!is_string($value)) {
            return is_scalar($value) ? (string) $value : null;
        }
        return Iban::validate($value) ? Iban::normalize($value) : $value;
    }

    /** @param array<string, mixed> $attributes */
    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if (!is_string($value)) {
            return is_scalar($value) ? (string) $value : null;
        }
        return Iban::validate($value) ? Iban::normalize($value) : $value;
    }
}
