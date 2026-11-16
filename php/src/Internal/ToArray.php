<?php

declare(strict_types=1);

namespace PakDataKit\Internal;

/**
 * Adds toArray() to the result value classes: public properties as an array
 * with the same keys as the npm package's objects.
 *
 * @internal
 */
trait ToArray
{
    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return self::plain(get_object_vars($this));
    }

    private static function plain(mixed $value): mixed
    {
        if (is_array($value)) {
            return array_map(self::plain(...), $value);
        }
        if (is_object($value) && method_exists($value, 'toArray')) {
            return $value->toArray();
        }
        return $value;
    }
}
