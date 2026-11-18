<?php

declare(strict_types=1);

namespace PakDataKit\Internal;

use DateTimeInterface;

/**
 * Calendar dates shared by the sales tax and income tax modules.
 *
 * @internal
 */
final class Date
{
    /** `YYYY-MM-DD` for a valid calendar date (a string or a DateTimeInterface's own date), otherwise null. */
    public static function iso(mixed $input): ?string
    {
        if ($input instanceof DateTimeInterface) {
            $year = (int) $input->format('Y');
            if ($year < 0 || $year > 9999) {
                return null;
            }
            return $input->format('Y-m-d');
        }
        if (!is_string($input)) {
            return null;
        }
        $match = Js::match('/^([0-9]{4})-([0-9]{2})-([0-9]{2})\z/u', Js::trim($input));
        if ($match === null) {
            return null;
        }
        [$y, $m, $d] = [(int) $match[1], (int) $match[2], (int) $match[3]];
        $leap = ($y % 4 === 0 && $y % 100 !== 0) || $y % 400 === 0;
        $days = [31, $leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if ($m < 1 || $m > 12 || $d < 1 || $d > $days[$m - 1]) {
            return null;
        }
        return $match[1] . '-' . $match[2] . '-' . $match[3];
    }
}
