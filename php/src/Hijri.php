<?php

declare(strict_types=1);

namespace PakDataKit;

use DateTimeImmutable;
use DateTimeInterface;
use InvalidArgumentException;
use PakDataKit\Internal\Js;

/**
 * Tabular Islamic (Hijri) calendar conversions: the arithmetic
 * "islamic-civil" calendar, the same algorithm as the npm package. It does
 * not use the intl extension or IntlCalendar.
 */
final class Hijri
{
    private const MONTHS = [
        'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 'Jumada al-Awwal', 'Jumada al-Thani',
        'Rajab', 'Shaaban', 'Ramadan', 'Shawwal', 'Dhu al-Qadah', 'Dhu al-Hijjah',
    ];

    /**
     * Converts a Gregorian date to a tabular Hijri date. Actual dates in
     * Pakistan follow moon sighting and can differ by a day or two; pass
     * `$offset` (whole days) to adjust. The calendar date of `$date` in its
     * own time zone is used.
     */
    public static function toHijri(DateTimeInterface $date, int $offset = 0): HijriDate
    {
        $jdn = self::gregorianToJdn((int) $date->format('Y'), (int) $date->format('n'), (int) $date->format('j'));
        return self::jdnToHijri($jdn + $offset);
    }

    /**
     * Converts a Hijri date to a Gregorian date (midnight, default time zone).
     *
     * @throws InvalidArgumentException if the Hijri date is out of range
     */
    public static function fromHijri(HijriDate $hijri, int $offset = 0): DateTimeImmutable
    {
        if ($hijri->year < 1 || $hijri->month < 1 || $hijri->month > 12 || $hijri->day < 1 || $hijri->day > 30) {
            throw new InvalidArgumentException(
                "Invalid Hijri date: {$hijri->year}-{$hijri->month}-{$hijri->day}",
            );
        }
        [$y, $m, $d] = self::jdnToGregorian(self::hijriToJdn($hijri->year, $hijri->month, $hijri->day) - $offset);
        return (new DateTimeImmutable('today'))->setDate($y, $m, $d);
    }

    /** fromHijri() without throwing: null if the Hijri date is out of range. */
    public static function tryFromHijri(HijriDate $hijri, int $offset = 0): ?DateTimeImmutable
    {
        try {
            return self::fromHijri($hijri, $offset);
        } catch (InvalidArgumentException) {
            return null;
        }
    }

    /** Formats a Gregorian date as a Hijri string, e.g. `15 Ramadan 1447`. */
    public static function format(DateTimeInterface $date, int $offset = 0): string
    {
        $hijri = self::toHijri($date, $offset);
        return $hijri->day . ' ' . self::MONTHS[$hijri->month - 1] . ' ' . $hijri->year;
    }

    /** Returns the English name of a Hijri month (1-12), or null. */
    public static function getMonthName(int $month): ?string
    {
        return $month < 1 || $month > 12 ? null : self::MONTHS[$month - 1];
    }

    /** Returns whether a Gregorian date falls in Ramadan. */
    public static function isRamadan(DateTimeInterface $date, int $offset = 0): bool
    {
        return self::toHijri($date, $offset)->month === 9;
    }

    /** @internal */
    public static function gregorianToJdn(int $year, int $month, int $day): int
    {
        $a = Js::floorDiv(14 - $month, 12);
        $y = $year + 4800 - $a;
        $m = $month + 12 * $a - 3;
        return $day + Js::floorDiv(153 * $m + 2, 5) + 365 * $y + Js::floorDiv($y, 4) - Js::floorDiv($y, 100)
            + Js::floorDiv($y, 400) - 32045;
    }

    /**
     * @internal
     * @return array{0: int, 1: int, 2: int} Year, month, day.
     */
    public static function jdnToGregorian(int $jdn): array
    {
        $a = $jdn + 32044;
        $b = Js::floorDiv(4 * $a + 3, 146097);
        $c = $a - Js::floorDiv(146097 * $b, 4);
        $d = Js::floorDiv(4 * $c + 3, 1461);
        $e = $c - Js::floorDiv(1461 * $d, 4);
        $m = Js::floorDiv(5 * $e + 2, 153);
        return [
            100 * $b + $d - 4800 + Js::floorDiv($m, 10),
            $m + 3 - 12 * Js::floorDiv($m, 10),
            $e - Js::floorDiv(153 * $m + 2, 5) + 1,
        ];
    }

    /** @internal */
    public static function jdnToHijri(int $jdn): HijriDate
    {
        $l = $jdn - 1948440 + 10632;
        $n = Js::floorDiv($l - 1, 10631);
        $l2 = $l - 10631 * $n + 354;
        $j = Js::floorDiv(10985 - $l2, 5316) * Js::floorDiv(50 * $l2, 17719)
            + Js::floorDiv($l2, 5670) * Js::floorDiv(43 * $l2, 15238);
        $l3 = $l2 - Js::floorDiv(30 - $j, 15) * Js::floorDiv(17719 * $j, 50)
            - Js::floorDiv($j, 16) * Js::floorDiv(15238 * $j, 43) + 29;
        $month = Js::floorDiv(24 * $l3, 709);
        $day = $l3 - Js::floorDiv(709 * $month, 24);
        return new HijriDate(30 * $n + $j - 30, $month, $day);
    }

    /** @internal */
    public static function hijriToJdn(int $year, int $month, int $day): int
    {
        return Js::floorDiv(11 * $year + 3, 30) + 354 * $year + 30 * $month - Js::floorDiv($month - 1, 2) + $day
            + 1948440 - 385;
    }
}
