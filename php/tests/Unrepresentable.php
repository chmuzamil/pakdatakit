<?php

declare(strict_types=1);

namespace PakDataKit\Tests;

use RuntimeException;

/**
 * Thrown by the vector harness when a vector's input cannot be expressed
 * with the PHP API's types, e.g. `1.5` for an `int` parameter. PHP's type
 * declarations reject such input; TypeScript rejects it at run time, so the
 * vector must expect a throw (or null). The exception is an option
 * TypeScript only validates when it uses it: then the call must give the
 * expected result without that option.
 */
final class Unrepresentable extends RuntimeException
{
    public function __construct(string $message, public readonly ?string $option = null)
    {
        parent::__construct($message);
    }
}
