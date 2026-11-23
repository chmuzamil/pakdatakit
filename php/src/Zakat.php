<?php

declare(strict_types=1);

namespace PakDataKit;

use DateTimeImmutable;
use DateTimeZone;
use PakDataKit\Internal\Data;
use PakDataKit\Internal\Date;
use PakDataKit\Internal\Js;
use PakDataKit\Internal\Money;

/**
 * Zakat deduction at source in Pakistan: the nisab notified each year by the
 * Administrator-General Zakat (Ministry of Poverty Alleviation & Social
 * Safety) and conveyed to banks by SBP, Zakat years 1433 to 1447 AH
 * (2012-2026), and the 2.5% deducted from accounts at or above it.
 *
 * This is the nisab for deduction from savings and similar bank accounts
 * under the Zakat and Ushr Ordinance 1980, not a religious ruling on
 * personal Zakat.
 */
final class Zakat
{
    /** Days after the last notified year's 1 Ramazan that it still certainly covers. */
    private const LUNAR_YEAR_DAYS = 353;

    /** @var list<ZakatNisab>|null */
    private static ?array $years = null;

    /**
     * The nisab for compulsory Zakat deduction at source for a Zakat year.
     *
     * Give the year (`1447`, `'1447'`, or the notification's `'1446-47'`) or
     * a date; `$zakatYear` takes precedence. A Zakat year starts on 1
     * Ramazan (`ramazan1`, as the Central Ruet-e-Hilal Committee announced
     * it), and a date belongs to the last year whose 1 Ramazan is on or
     * before it.
     *
     * ```php
     * Zakat::getNisab(zakatYear: 1447)?->nisab; // 503529
     * Zakat::getNisab(zakatYear: '1445-46')?->zakatYear; // 1446
     * Zakat::getNisab(date: '2025-06-01')?->nisab; // 179689
     * ```
     *
     * @param mixed $zakatYear The Hijri year (int, or a string such as
     *   `'1447'`), or the label as the notification writes it (`'1446-47'`)
     * @param mixed $date A day in the Zakat year: `YYYY-MM-DD` or a
     *   DateTimeInterface (its own calendar date)
     * @return ZakatNisab|null The year's nisab, dates and sources, or null
     *   for a year that is not covered (a date before 1 Ramazan 1433, or 353
     *   days or more after the last year's 1 Ramazan), or an invalid or
     *   missing year or date. Never throws.
     */
    public static function getNisab(mixed $zakatYear = null, mixed $date = null): ?ZakatNisab
    {
        return self::find($zakatYear, $date);
    }

    /**
     * Every notified Zakat year, oldest first.
     *
     * @return list<int>
     */
    public static function getYears(): array
    {
        return array_map(static fn (ZakatNisab $year): int => $year->zakatYear, self::years());
    }

    /**
     * Zakat deducted at source from one account on the valuation date (1
     * Ramazan): 2.5% of the whole balance, rounded to the nearest rupee
     * (First Schedule, Note 2: less than a rupee is not charged, 50 paisa or
     * more counts as a rupee), when it is at or above that year's nisab, and
     * nothing when it is below or the holder has a valid exemption
     * declaration (Form CZ-50). Give the year or a date as for getNisab().
     *
     * A balance exactly equal to the nisab is deducted: every notification
     * says no deduction where the balance is "less than" the nisab, and the
     * Ordinance (s. 2(xxiii)) defines a sahib-e-nisab as owning "not less
     * than nisab". The First Schedule's own wording ("does not exceed")
     * would not deduct it. In Punjab the Punjab Zakat and Ushr Act 2018
     * replaced the Ordinance, with the same First Schedule wording.
     *
     * It applies to the accounts the Ordinance subjects to deduction at
     * source: savings, profit-and-loss sharing and similar accounts (asset
     * code 101). Current accounts and foreign currency accounts are not
     * deducted. It is not a religious ruling on how much Zakat a person owes.
     *
     * ```php
     * Zakat::deduction(600000, zakatYear: 1447);
     * // ZakatDeduction(zakatYear: 1447, nisab: 503529, balance: 600000.0,
     * //   deductible: true, reason: null, rate: 2.5, zakat: 15000, source: …)
     * Zakat::deduction(600000, zakatYear: 1447, exempt: true)?->zakat; // 0
     * ```
     *
     * @param mixed $balance The account balance in rupees (int|float) at the
     *   start of the valuation date, 0 to one trillion
     * @param mixed $zakatYear As for getNisab()
     * @param mixed $date As for getNisab()
     * @param bool $exempt True if the holder has a valid exemption
     *   declaration (Form CZ-50) with the bank: filed at least 30 days before
     *   the valuation date, sworn before a magistrate, oath commissioner,
     *   notary public or other person authorised to administer oaths, in the
     *   presence of two witnesses (Zakat and Ushr Ordinance 1980, s. 1(3),
     *   proviso (a)). The declaration is not checked. Default false.
     * @return ZakatDeduction|null The deduction and its source, or null for
     *   an invalid balance or a year that is not covered. Never throws.
     */
    public static function deduction(
        mixed $balance,
        mixed $zakatYear = null,
        mixed $date = null,
        bool $exempt = false,
    ): ?ZakatDeduction {
        $paisa = Money::toUnits($balance, 2);
        if ($paisa === null) {
            return null;
        }
        $year = self::find($zakatYear, $date);
        if ($year === null) {
            return null;
        }
        $below = $paisa < $year->nisab * 100;
        $deductible = !$exempt && !$below;
        return new ZakatDeduction(
            zakatYear: $year->zakatYear,
            nisab: $year->nisab,
            balance: Money::fromPaisa($paisa),
            deductible: $deductible,
            reason: $exempt ? 'exempt' : ($below ? 'below-nisab' : null),
            rate: 2.5,
            zakat: $deductible ? self::zakatRupees($paisa) : 0,
            source: $year->source,
        );
    }

    /**
     * 2.5% of a balance in paisa, as the First Schedule's Note 2 rounds it:
     * less than a rupee is not charged; otherwise 50 paisa or more counts as
     * a rupee and less than 50 paisa is dropped. Exact: the balance is at
     * most 10^14 paisa, so the product stays below 2.5 × 10^15.
     */
    private static function zakatRupees(int $balancePaisa): int
    {
        $exact = $balancePaisa * 25; // thousandths of a paisa
        return $exact < 100_000 ? 0 : Money::divideHalfUp($exact, 100_000);
    }

    private static function find(mixed $zakatYear, mixed $date): ?ZakatNisab
    {
        if ($zakatYear !== null) {
            return self::byYear($zakatYear);
        }
        return $date === null ? null : self::byDate($date);
    }

    private static function byYear(mixed $value): ?ZakatNisab
    {
        $year = null;
        if (is_float($value) && is_finite($value) && floor($value) === $value && abs($value) < 1e15) {
            $value = (int) $value;
        }
        if (is_int($value)) {
            $year = $value;
        } elseif (is_string($value)) {
            $text = Js::trim($value);
            if (Js::test('/^[0-9]{4}\z/', $text)) {
                $year = (int) $text;
            } else {
                foreach (self::years() as $entry) {
                    if ($entry->label === $text) {
                        return $entry;
                    }
                }
                return null;
            }
        }
        if ($year === null) {
            return null;
        }
        foreach (self::years() as $entry) {
            if ($entry->zakatYear === $year) {
                return $entry;
            }
        }
        return null;
    }

    /**
     * The Zakat year a date falls in: the last year whose 1 Ramazan is on or
     * before it. A date before the first covered year, or 353 days or more
     * after the last year's 1 Ramazan (next year not yet notified), gives
     * null.
     */
    private static function byDate(mixed $value): ?ZakatNisab
    {
        $date = Date::iso($value);
        if ($date === null) {
            return null;
        }
        $years = self::years();
        for ($i = count($years) - 1; $i >= 0; $i--) {
            if (strcmp($date, $years[$i]->ramazan1) < 0) {
                continue;
            }
            if ($i === count($years) - 1 && strcmp($date, self::addDays($years[$i]->ramazan1, self::LUNAR_YEAR_DAYS)) >= 0) {
                return null;
            }
            return $years[$i];
        }
        return null;
    }

    /** `YYYY-MM-DD` plus a number of days (negative to go back). */
    private static function addDays(string $iso, int $days): string
    {
        return (new DateTimeImmutable($iso, new DateTimeZone('UTC')))
            ->modify(($days < 0 ? '' : '+') . $days . ' days')
            ->format('Y-m-d');
    }

    /** @return list<ZakatNisab> */
    private static function years(): array
    {
        if (self::$years === null) {
            /** @var list<array<string, mixed>> $rows */
            $rows = Data::load('zakat-nisab');
            $starts = [];
            foreach ($rows as $row) {
                $starts[$row['zakatYear']] = $row['ramazan1'];
            }
            $document = static fn (array $doc): ZakatDocument => new ZakatDocument(
                number: $doc['number'],
                date: $doc['date'],
                url: $doc['url'],
            );
            self::$years = [];
            foreach ($rows as $row) {
                $next = $starts[$row['zakatYear'] + 1] ?? null;
                self::$years[] = new ZakatNisab(
                    zakatYear: $row['zakatYear'],
                    label: $row['label'],
                    nisab: $row['nisab'],
                    valuationDateHijri: $row['valuationDateHijri'],
                    ramazan1: $row['ramazan1'],
                    ramazan1Source: new ZakatRamazan1Source(
                        announcedBy: $row['ramazan1Source']['announcedBy'],
                        reportedBy: $row['ramazan1Source']['reportedBy'],
                        reportedOn: $row['ramazan1Source']['reportedOn'] ?? null,
                        url: $row['ramazan1Source']['url'] ?? null,
                    ),
                    bankHolidayDate: $row['bankHolidayDate'],
                    notification: $document($row['notification']),
                    sbpCircular: $document($row['sbpCircular']),
                    note: $row['note'] ?? null,
                    source: new DataSource(
                        id: 'zakat-nisab',
                        // From 1 Ramazan to the day before the next year's; open while
                        // it is the latest year.
                        effectiveFrom: $row['ramazan1'],
                        effectiveTo: $next === null ? null : self::addDays($next, -1),
                        sourceReference: 'Notification No. ' . $row['notification']['number']
                            . ' (' . $row['notification']['date'] . '); SBP ' . $row['sbpCircular']['number']
                            . ' (' . $row['sbpCircular']['date'] . ')',
                        sourceUrl: $row['notification']['url'],
                    ),
                );
            }
        }
        return self::$years;
    }
}
