<?php

declare(strict_types=1);

namespace PakDataKit;

use DateTimeImmutable;
use PakDataKit\Internal\Data;
use PakDataKit\Internal\Date;
use PakDataKit\Internal\Money;

/**
 * Income tax on salary: the salaried rate table of the Income Tax Ordinance
 * 2001 (First Schedule, Part I, Division I, clause (2), which applies when
 * salary is more than 75% of taxable income) for tax years 2020 to 2027,
 * each from FBR's consolidated Ordinance. A tax year runs from 1 July to
 * 30 June and is named after the June it ends in. Amounts are computed
 * exactly in whole paisa.
 */
final class IncomeTax
{
    /** @var list<SalaryTaxYear>|null */
    private static ?array $years = null;

    /**
     * Returns the salaried rate table for a tax year.
     *
     * @param mixed $taxYear e.g. `2026` (1 July 2025 to 30 June 2026); null
     *     for the current tax year
     * @return SalaryTaxYear|null Null for a year that is not covered (or not
     *     an integer). Never throws.
     */
    public static function getSalarySlabs(mixed $taxYear = null): ?SalaryTaxYear
    {
        return self::findYear($taxYear === null ? null : ['taxYear' => $taxYear]);
    }

    /**
     * Which tax years getSalarySlabs() covers, oldest first.
     *
     * @return list<int>
     */
    public static function getSalaryYears(): array
    {
        return array_map(static fn (SalaryTaxYear $year): int => $year->taxYear, self::years());
    }

    /**
     * The tax year (July to June) that contains a date: the year, plus one
     * from July on.
     *
     * @param mixed $date `YYYY-MM-DD` or a DateTimeInterface (its own
     *     calendar date); null for today in the default time zone
     * @return int|null Null for an invalid date. Never throws.
     */
    public static function getTaxYear(mixed $date = null): ?int
    {
        $iso = Date::iso($date ?? new DateTimeImmutable());
        if ($iso === null) {
            return null;
        }
        $year = (int) substr($iso, 0, 4);
        return (int) substr($iso, 5, 2) >= 7 ? $year + 1 : $year;
    }

    /**
     * Income tax on a salaried individual's taxable income for a tax year,
     * from the salaried rate table (see getSalarySlabs()). Tax is rounded
     * half up to the paisa, reading the amount as written.
     *
     * With `includeSurcharge => true` it adds the section 4AB surcharge: a
     * percentage of the whole tax once taxable income exceeds Rs 10 million
     * (10% in tax year 2025, 9% for salaried individuals in 2026, none in
     * 2027 or before 2025). Because it applies to the whole tax, one rupee
     * over Rs 10 million adds it in full. It is off by default in 2.x so
     * that existing results do not change, and will be on by default in 3.0.
     *
     * Tax credits, exemptions, the separate pension rate, super tax and
     * withholding adjustments are not applied. This is an estimate, not tax
     * advice.
     *
     * Options:
     * - `taxYear` (int): e.g. `2026`; takes precedence over `date`
     * - `date` (string `YYYY-MM-DD` or DateTimeInterface): a day in the tax year
     * - `includeSurcharge` (bool): add the section 4AB surcharge; default false
     * Without `taxYear` or `date`, today's tax year is used.
     *
     * ```php
     * IncomeTax::calculateSalary(12_000_000, ['taxYear' => 2026, 'includeSurcharge' => true]);
     * // tax 3381000, surcharge 304290, total 3685290, monthly 307107.5
     * IncomeTax::calculateSalary(1_800_000, ['taxYear' => 2026])->source;
     * // DataSource(id: 'income-tax-slabs', effectiveFrom: '2025-07-01', …)
     * ```
     *
     * @param mixed $annualIncome Taxable income for the year in rupees
     *     (int|float), 0 to one trillion
     * @param array{taxYear?: mixed, date?: mixed, includeSurcharge?: mixed}|null $options
     * @return SalaryTax|null Null for an invalid amount or a tax year that
     *     is not covered. Never throws.
     */
    public static function calculateSalary(mixed $annualIncome, ?array $options = null): ?SalaryTax
    {
        $paisa = Money::toUnits($annualIncome, 2);
        if ($paisa === null) {
            return null;
        }
        $year = self::findYear($options);
        return $year === null ? null : self::compute($paisa, $year, ($options['includeSurcharge'] ?? false) === true);
    }

    /**
     * calculateSalary() for a monthly salary: the income is `monthlySalary
     * × 12`, and `monthly` is the tax to withhold each month.
     *
     * @param mixed $monthlySalary Rupees (int|float), 0 to one trillion
     * @param array{taxYear?: mixed, date?: mixed, includeSurcharge?: mixed}|null $options As for calculateSalary()
     * @return SalaryTax|null Null for an invalid amount or a tax year that
     *     is not covered. Never throws.
     */
    public static function calculateMonthlySalary(mixed $monthlySalary, ?array $options = null): ?SalaryTax
    {
        $paisa = Money::toUnits($monthlySalary, 2);
        if ($paisa === null) {
            return null;
        }
        $year = self::findYear($options);
        return $year === null ? null : self::compute($paisa * 12, $year, ($options['includeSurcharge'] ?? false) === true);
    }

    /** @param array<string, mixed>|null $options */
    private static function findYear(?array $options): ?SalaryTaxYear
    {
        $given = $options['taxYear'] ?? null;
        $date = $options['date'] ?? null;
        if ($given !== null) {
            // An integer: an int, or a float with no fraction (as Number.isInteger).
            if (is_float($given) && is_finite($given) && floor($given) === $given && abs($given) < 1e15) {
                $given = (int) $given;
            }
            if (!is_int($given)) {
                return null;
            }
            $taxYear = $given;
        } else {
            $taxYear = $date === null ? self::getTaxYear() : self::getTaxYear($date);
        }
        foreach (self::years() as $year) {
            if ($year->taxYear === $taxYear) {
                return $year;
            }
        }
        return null;
    }

    private static function compute(int $incomePaisa, SalaryTaxYear $year, bool $includeSurcharge): SalaryTax
    {
        $slab = $year->slabs[0];
        foreach ($year->slabs as $candidate) {
            if ($incomePaisa > $candidate->over * 100) {
                $slab = $candidate;
            }
        }
        $rateBp = (int) round($slab->rate * 100);
        $taxPaisa = $slab->fixed * 100;
        if ($incomePaisa > $slab->over * 100) {
            $taxPaisa += self::mulDivHalfUp($incomePaisa - $slab->over * 100, $rateBp, 10_000);
        }
        $surcharge = $year->surcharge;
        $surchargePaisa = $includeSurcharge
            && $surcharge !== null
            && $surcharge->rate > 0
            && $incomePaisa > $surcharge->over * 100
            ? self::mulDivHalfUp($taxPaisa, (int) round($surcharge->rate * 100), 10_000)
            : 0;
        $totalPaisa = $taxPaisa + $surchargePaisa;
        return new SalaryTax(
            tax: Money::fromPaisa($taxPaisa),
            surcharge: Money::fromPaisa($surchargePaisa),
            total: Money::fromPaisa($totalPaisa),
            monthly: Money::fromPaisa(Money::divideHalfUp($totalPaisa, 12)),
            // The tax is at most 35% of an income of at most 1.2 × 10^15
            // paisa and the surcharge at most 10% of the tax, so
            // `totalPaisa × 10000` stays below 4.7 × 10^18.
            effectiveRate: $incomePaisa === 0 ? 0.0 : Money::divideHalfUp($totalPaisa * 10_000, $incomePaisa) / 100,
            slab: $slab,
            taxYear: $year->taxYear,
            source: new DataSource(
                id: 'income-tax-slabs',
                effectiveFrom: $year->from,
                effectiveTo: $year->to,
                sourceReference: $year->law,
                sourceUrl: $year->source,
            ),
        );
    }

    /**
     * `a × b / d` rounded half up, exact without forming the product: `a` is
     * split into `q × d + r`, so no step goes beyond 64-bit integers (`a` at
     * most 1.2 × 10^15 paisa, `b` and `d` at most 10^4).
     */
    private static function mulDivHalfUp(int $a, int $b, int $d): int
    {
        return intdiv($a, $d) * $b + Money::divideHalfUp(($a % $d) * $b, $d);
    }

    /** @return list<SalaryTaxYear> */
    private static function years(): array
    {
        if (self::$years === null) {
            self::$years = [];
            foreach (Data::load('income-tax-slabs') as $entry) {
                self::$years[] = new SalaryTaxYear(
                    taxYear: $entry['taxYear'],
                    from: $entry['from'],
                    to: $entry['to'],
                    law: $entry['law'],
                    source: $entry['source'],
                    slabs: array_map(
                        static fn (array $slab): SalaryTaxSlab => new SalaryTaxSlab(
                            over: $slab['over'],
                            upTo: $slab['upTo'] ?? null,
                            fixed: $slab['fixed'],
                            rate: $slab['rate'],
                        ),
                        $entry['slabs'],
                    ),
                    surcharge: isset($entry['surcharge']) ? new SalaryTaxSurcharge(
                        rate: $entry['surcharge']['rate'],
                        over: $entry['surcharge']['over'],
                        law: $entry['surcharge']['law'],
                        source: $entry['surcharge']['source'],
                    ) : null,
                );
            }
        }
        return self::$years;
    }
}
