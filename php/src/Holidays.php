<?php

declare(strict_types=1);

namespace PakDataKit;

use DateTimeInterface;
use InvalidArgumentException;
use PakDataKit\Internal\Data;
use PakDataKit\Internal\Js;

/**
 * Pakistan's federal public holidays.
 *
 * Options, for every method, are an array with any of:
 * - `includeChristianHolidays` (bool): include 26 December, a holiday for
 *   Christian employees only. Defaults to false.
 * - `announced` (array<string, list<string>>): observed or announced dates
 *   (`YYYY-MM-DD`) for Islamic holidays, keyed by holiday ID such as
 *   `eid-ul-fitr`, used instead of the dataset or estimate. An empty list
 *   removes that holiday for the year.
 * - `hijriOffset` (int): day offset applied to estimated Islamic dates.
 */
final class Holidays
{
    private const ISO_DATE = '/^[0-9]{4}-[0-9]{2}-[0-9]{2}\z/u';

    // id, name, month, day, type, first year / years it applies, christiansOnly
    private const FIXED = [
        ['kashmir-day', 'Kashmir Solidarity Day', 2, 5, 'national', null, false],
        ['pakistan-day', 'Pakistan Day', 3, 23, 'national', null, false],
        ['labour-day', 'Labour Day', 5, 1, 'national', null, false],
        // A one-off holiday in 2024, on the annual list since 2025.
        ['youm-e-takbeer', 'Youm-e-Takbeer', 5, 28, 'national', 'from-2024', false],
        ['independence-day', 'Independence Day', 8, 14, 'national', null, false],
        // Dropped from 2015 to 2021, restored in 2022.
        ['iqbal-day', 'Iqbal Day', 11, 9, 'national', 'not-2015-2021', false],
        ['quaid-e-azam-day', 'Quaid-e-Azam Day / Christmas', 12, 25, 'national', null, false],
        ['day-after-christmas', 'Day after Christmas', 12, 26, 'religious', null, true],
    ];

    // id, dataset key, name, Hijri month, Hijri day, usual number of days
    private const ISLAMIC = [
        ['eid-ul-fitr', 'eidUlFitr', 'Eid ul Fitr', 10, 1, 3],
        ['eid-ul-adha', 'eidUlAdha', 'Eid ul Adha', 12, 10, 3],
        ['ashura', 'ashura', 'Ashura', 1, 9, 2],
        ['eid-milad-un-nabi', 'eidMiladUnNabi', 'Eid Milad un Nabi', 3, 12, 1],
    ];

    /**
     * Lists Pakistan's federal public holidays for a year, sorted by date.
     * Islamic holidays use the dates observed after moon sighting (2020
     * onwards). For years not in the dataset they are estimated from the
     * tabular Hijri calendar and marked `estimated`; pass `announced` to use
     * official dates instead.
     *
     * @param array{includeChristianHolidays?: bool, announced?: array<string, list<string>>|null, hijriOffset?: int} $options
     * @return list<Holiday>
     * @throws InvalidArgumentException if the year is outside 1948-9999, or
     *     an announced date is not `YYYY-MM-DD`
     */
    public static function getHolidays(int $year, array $options = []): array
    {
        if ($year < 1948 || $year > 9999) {
            throw new InvalidArgumentException('Expected a year from 1948 to 9999, received ' . $year);
        }
        $includeChristian = (bool) ($options['includeChristianHolidays'] ?? false);
        $announced = $options['announced'] ?? null;
        $offset = (int) ($options['hijriOffset'] ?? 0);
        $holidays = [];

        foreach (self::FIXED as [$id, $name, $month, $day, $type, $applies, $christiansOnly]) {
            if ($applies === 'from-2024' && $year < 2024) {
                continue;
            }
            if ($applies === 'not-2015-2021' && $year >= 2015 && $year <= 2021) {
                continue;
            }
            if ($christiansOnly && !$includeChristian) {
                continue;
            }
            $holidays[] = new Holiday($id, $name, self::iso($year, $month, $day), $type, false, $christiansOnly ? true : null);
        }

        $observed = Data::load('holidays')[(string) $year] ?? null;
        foreach (self::ISLAMIC as [$id, $key, $name, $hijriMonth, $hijriDay, $days]) {
            $estimated = false;
            $source = null;
            if (is_array($announced) && isset($announced[$id]) && is_array($announced[$id])) {
                foreach ($announced[$id] as $value) {
                    if (!is_string($value) || !Js::test(self::ISO_DATE, $value)) {
                        throw new InvalidArgumentException(
                            'Expected a YYYY-MM-DD date, received ' . (is_scalar($value) ? (string) $value : gettype($value)),
                        );
                    }
                }
                $dates = array_values($announced[$id]);
            } elseif (isset($observed[$key])) {
                $dates = $observed[$key]['dates'];
                $source = $observed[$key]['source'] ?? null;
            } else {
                $dates = self::estimate($hijriMonth, $hijriDay, $days, $year, $offset);
                $estimated = true;
            }
            foreach ($dates as $date) {
                $holidays[] = new Holiday($id, $name, $date, 'religious', $estimated, null, $source ?: null);
            }
        }

        // usort is stable (PHP 8), like Array.prototype.sort.
        usort($holidays, static fn (Holiday $a, Holiday $b): int => strcmp($a->date, $b->date));
        return $holidays;
    }

    /**
     * Returns the public holidays that fall on a date. Never throws for the
     * date: text that is not a usable `YYYY-MM-DD` date gives an empty list
     * (see tryGetHolidaysOn()).
     *
     * @param array<string, mixed> $options Same options as getHolidays()
     * @return list<Holiday>
     * @throws InvalidArgumentException if an announced date in the options is not `YYYY-MM-DD`
     */
    public static function getHolidaysOn(DateTimeInterface|string|null $date, array $options = []): array
    {
        return self::tryGetHolidaysOn($date, $options) ?? [];
    }

    /**
     * Returns the public holidays that fall on a date, or null if the date
     * text is not `YYYY-MM-DD` or its year is outside 1948-9999 (the npm
     * package throws in that case).
     *
     * @param array<string, mixed> $options Same options as getHolidays()
     * @return list<Holiday>|null
     * @throws InvalidArgumentException if an announced date in the options is not `YYYY-MM-DD`
     */
    public static function tryGetHolidaysOn(DateTimeInterface|string|null $date, array $options = []): ?array
    {
        if ($date instanceof DateTimeInterface) {
            $date = $date->format('Y-m-d');
        }
        if ($date === null || !Js::test(self::ISO_DATE, $date)) {
            return null;
        }
        $year = (int) substr($date, 0, 4);
        if ($year < 1948 || $year > 9999) {
            return null;
        }
        return array_values(array_filter(
            self::getHolidays($year, $options),
            static fn (Holiday $holiday): bool => $holiday->date === $date,
        ));
    }

    /**
     * Returns whether a date is a Pakistani federal public holiday. Never
     * throws for the date: text that is not a usable date gives false.
     *
     * @param array<string, mixed> $options Same options as getHolidays()
     * @throws InvalidArgumentException if an announced date in the options is not `YYYY-MM-DD`
     */
    public static function isHoliday(DateTimeInterface|string|null $date, array $options = []): bool
    {
        return count(self::getHolidaysOn($date, $options)) > 0;
    }

    private static function iso(int $year, int $month, int $day): string
    {
        return str_pad((string) $year, 4, '0', STR_PAD_LEFT) . '-' . str_pad((string) $month, 2, '0', STR_PAD_LEFT)
            . '-' . str_pad((string) $day, 2, '0', STR_PAD_LEFT);
    }

    /**
     * Estimates the dates of an Islamic holiday in a Gregorian year.
     *
     * @return list<string>
     */
    private static function estimate(int $hijriMonth, int $hijriDay, int $days, int $year, int $offset): array
    {
        $firstHijriYear = Hijri::jdnToHijri(Hijri::gregorianToJdn($year, 1, 1))->year;
        $dates = [];
        for ($hijriYear = $firstHijriYear; $hijriYear <= $firstHijriYear + 1; $hijriYear++) {
            $start = Hijri::hijriToJdn($hijriYear, $hijriMonth, $hijriDay) - $offset;
            for ($i = 0; $i < $days; $i++) {
                [$y, $m, $d] = Hijri::jdnToGregorian($start + $i);
                if ($y === $year) {
                    $dates[] = self::iso($y, $m, $d);
                }
            }
        }
        return $dates;
    }
}
