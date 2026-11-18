<?php

declare(strict_types=1);

namespace PakDataKit;

use PakDataKit\Internal\Data;

/**
 * Information about the bundled datasets.
 */
final class PakData
{
    /** Version of this package. */
    public const PACKAGE_VERSION = '2.5.0';

    /**
     * Date (`YYYY-MM-DD`) the bundled datasets were last checked against
     * their sources. Same value as `dataVersion` in the npm package; see
     * DATA.md in the repository.
     */
    public static function version(): string
    {
        return Data::load('data-version');
    }
}
