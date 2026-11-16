<?php

declare(strict_types=1);

namespace PakDataKit\Internal;

/**
 * Loads the bundled datasets: PHP arrays in data/, generated from the
 * repository's data/*.json by scripts/generate-php-data.mjs.
 *
 * @internal
 */
final class Data
{
    /** @var array<string, mixed> */
    private static array $cache = [];

    public static function load(string $name): mixed
    {
        return self::$cache[$name] ??= require dirname(__DIR__, 2) . '/data/' . $name . '.php';
    }
}
