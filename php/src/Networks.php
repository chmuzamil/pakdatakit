<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * Mobile network detection from the `03XX` prefix.
 */
final class Networks
{
    /** Value returned when the network cannot be determined. */
    public const UNKNOWN = 'Unknown';

    /**
     * Returns the network a number's prefix was originally allocated to:
     * `Jazz`, `Zong`, `Telenor`, `Ufone`, `SCO` or `Unknown`. With number
     * portability the current carrier can differ. Never throws.
     */
    public static function getNetwork(?string $phone): string
    {
        $prefix = Phone::getPrefix($phone);
        return $prefix === null ? self::UNKNOWN : (Phone::prefixes()[$prefix] ?? self::UNKNOWN);
    }
}
