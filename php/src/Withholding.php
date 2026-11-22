<?php

declare(strict_types=1);

namespace PakDataKit;

use PakDataKit\Internal\Data;
use PakDataKit\Internal\Js;
use PakDataKit\Internal\Money;
use PakDataKit\Internal\Unicode;

/**
 * Withholding income tax for persons on and not on FBR's Active Taxpayers
 * List (ATL), from FBR's Withholding Tax Rate Card for tax years 2025 to
 * 2027: 231AB cash withdrawal, 236C sale and 236K purchase of immovable
 * property, 151 profit on debt, 150 dividends, 153 goods, services and
 * contracts, 154B social media income (from 2027) and 149 salary. Amounts
 * are computed exactly in whole paisa.
 */
final class Withholding
{
    /** @var list<array<string, mixed>>|null */
    private static ?array $rows = null;

    /**
     * Every case FBR's Withholding Tax Rate Card lists for the covered
     * sections in a tax year (2025 to 2027), with its rates for persons on
     * and not on the Active Taxpayers List and its references.
     *
     * ```php
     * count(Withholding::getRates(2027, '153')); // 17
     * ```
     *
     * @param mixed $taxYear The tax year (int), e.g. `2027`
     * @param mixed $section Only this section, e.g. `'153'` (any case); null
     *   for every section
     * @return list<WithholdingRate> The cases in the rate card's order, or
     *   `[]` for a year that is not covered. Never throws.
     */
    public static function getRates(mixed $taxYear, mixed $section = null): array
    {
        $year = self::integer($taxYear);
        if ($year === null) {
            return [];
        }
        if ($section !== null) {
            if (is_string($section)) {
                $section = Unicode::upper($section);
            } elseif (is_int($section) || is_float($section)) {
                $section = Js::numberToString($section);
            } else {
                return [];
            }
        }
        $rates = [];
        foreach (self::rows() as $row) {
            if ($row['taxYear'] !== $year || ($section !== null && $row['section'] !== $section)) {
                continue;
            }
            $rates[] = new WithholdingRate(
                taxYear: $row['taxYear'],
                section: $row['section'],
                subType: $row['subType'],
                description: $row['description'],
                atlRate: $row['atl']['rate'] ?? null,
                atlSlabs: self::slabs($row['atl']['slabs'] ?? null),
                nonAtlRule: $row['nonAtl']['rule'],
                nonAtlRate: $row['nonAtl']['rate'] ?? null,
                nonAtlSlabs: self::slabs($row['nonAtl']['slabs'] ?? null),
                lateFilerSlabs: self::slabs($row['lateFiler']['slabs'] ?? null),
                threshold: isset($row['threshold'])
                    ? new WithholdingThreshold($row['threshold']['amount'], $row['threshold']['per'])
                    : null,
                cardRef: $row['cardRef'],
                lawRef: $row['lawRef'],
                statuteOverride: $row['statuteOverride'] ?? null,
                note: $row['note'] ?? null,
                source: self::source($row),
            );
        }
        return $rates;
    }

    /**
     * Income tax to withhold or collect under one section of the Income Tax
     * Ordinance 2001, for a person on or not on FBR's Active Taxpayers List
     * (ATL), from FBR's Withholding Tax Rate Card for tax years 2025 to 2027.
     *
     * Covered: 231AB cash withdrawal, 236C sale and 236K purchase of
     * immovable property, 151 profit on debt, 150 dividends, 153 goods,
     * services and contracts, 154B social media income (from 2027) and 149
     * salary (the salaried rate table, as IncomeTax::calculateSalary()).
     *
     * The rate for a person not on the list follows each case's own rule in
     * the Tenth Schedule: usually double, but a fixed rate (236C, and 151 in
     * 2025), its own value bands (236K), or none (149; 231AB applies only to
     * them). The rate applies to the whole amount. Where FBR's card and the
     * Ordinance differ, the Ordinance is used and `statuteOverride` says so.
     *
     * This is an estimate from the rate card, not tax advice: exemptions,
     * reduced-rate certificates, adjustable or final status and the many
     * cases not listed here are not applied.
     *
     * ```php
     * Withholding::calculate('236K', 60_000_000, atl: false, taxYear: 2027);
     * // WithholdingTax(rate: 14.5, tax: 8700000.0, nonAtlRule: 'slabs', …)
     * Withholding::calculate('231AB', 80_000, atl: false, taxYear: 2027)?->tax; // 640.0
     * Withholding::calculate('151', 10_000, atl: true, subType: 'bank-deposit', taxYear: 2027)?->tax; // 2000.0
     * ```
     *
     * @param mixed $section Section of the Ordinance: `'231AB'`, `'236C'`,
     *   `'236K'`, `'151'`, `'150'`, `'153'`, `'154B'` or `'149'` (any case,
     *   spaces around it ignored)
     * @param mixed $amount The payment (or, for 236C/236K, the value; for
     *   149, the year's taxable salary) in rupees (int|float), 0 to one
     *   trillion
     * @param mixed $atl True if the person is on FBR's Active Taxpayers List
     *   (a bool; anything else gives null)
     * @param mixed $subType Which case of the section, e.g. `'bank-deposit'`
     *   (151) or `'goods-company'` (153); see getRates(). Null (the default)
     *   for a section with one case.
     * @param mixed $taxYear The tax year (int, July to June), e.g. `2027`;
     *   takes precedence over `$date`
     * @param mixed $date A date in the tax year instead: `YYYY-MM-DD` or a
     *   DateTimeInterface
     * @param bool $lateFiler True for a person on the list who filed the
     *   return late. Changes the rate only where the year has a late-filer
     *   rate (236C and 236K in tax years 2025 and 2026). Default false.
     * @return WithholdingTax|null The rate, tax and references, or null for
     *   an unknown section, case or tax year, an invalid amount, no tax year
     *   or date, or an `$atl` that is not a bool. Never throws.
     */
    public static function calculate(
        mixed $section,
        mixed $amount,
        mixed $atl,
        mixed $subType = null,
        mixed $taxYear = null,
        mixed $date = null,
        bool $lateFiler = false,
    ): ?WithholdingTax {
        if (!is_bool($atl) || !is_string($section)) {
            return null;
        }
        $paisa = Money::toUnits($amount, 2);
        if ($paisa === null) {
            return null;
        }
        if ($taxYear !== null) {
            $year = self::integer($taxYear);
        } elseif ($date !== null) {
            $year = IncomeTax::getTaxYear($date);
        } else {
            $year = null;
        }
        if ($year === null) {
            return null;
        }
        $section = Unicode::upper(Js::trim($section));
        $cases = array_values(array_filter(
            self::rows(),
            static fn (array $row): bool => $row['taxYear'] === $year && $row['section'] === $section,
        ));
        $row = null;
        if ($subType === null) {
            if (count($cases) === 1) {
                $row = $cases[0];
            }
        } elseif (is_string($subType)) {
            foreach ($cases as $case) {
                if ($case['subType'] === $subType) {
                    $row = $case;
                    break;
                }
            }
        }
        if ($row === null) {
            return null;
        }

        $lateFiler = $atl && $lateFiler;
        $slab = null;
        $threshold = null;
        if (isset($row['atl']['salarySlabs'])) {
            $salary = IncomeTax::calculateSalary(Money::fromPaisa($paisa), ['taxYear' => $year]);
            if ($salary === null) {
                return null;
            }
            $rate = $salary->effectiveRate;
            $taxPaisa = (int) round($salary->tax * 100);
        } else {
            if (!$atl) {
                $spec = $row['nonAtl'];
            } elseif ($lateFiler && isset($row['lateFiler'])) {
                $spec = $row['lateFiler'];
            } else {
                $spec = $row['atl'];
            }
            if (isset($spec['slabs'])) {
                $slab = self::inSlab($paisa, $spec['slabs']);
                $rate = $slab->rate;
            } else {
                $rate = is_int($spec['rate'] ?? null) || is_float($spec['rate'] ?? null) ? $spec['rate'] : 0;
            }
            $taxPaisa = Money::divideHalfUp($paisa * (int) round($rate * 100), 10_000);
            if (isset($row['threshold'])) {
                $within = $paisa <= $row['threshold']['amount'] * 100;
                $threshold = new WithholdingThresholdCheck(
                    amount: $row['threshold']['amount'],
                    per: $row['threshold']['per'],
                    withinThreshold: $within,
                );
                if ($within) {
                    $taxPaisa = 0;
                }
            }
        }

        return new WithholdingTax(
            section: $row['section'],
            subType: $row['subType'],
            description: $row['description'],
            taxYear: $year,
            atl: $atl,
            lateFiler: $lateFiler,
            rate: $rate,
            tax: Money::fromPaisa($taxPaisa),
            nonAtlRule: $row['nonAtl']['rule'],
            slab: $slab,
            threshold: $threshold,
            cardRef: $row['cardRef'],
            lawRef: $row['lawRef'],
            statuteOverride: $row['statuteOverride'] ?? null,
            source: self::source($row),
        );
    }

    /** An integer (an int, or a float with no fraction, as Number.isInteger), or null. */
    private static function integer(mixed $value): ?int
    {
        if (is_float($value) && is_finite($value) && floor($value) === $value && abs($value) < 1e15) {
            return (int) $value;
        }
        return is_int($value) ? $value : null;
    }

    /**
     * The band the amount falls in, or the first band.
     *
     * @param list<array{over: int|float, upTo: int|float|null, rate: int|float}> $slabs
     */
    private static function inSlab(int $paisa, array $slabs): WithholdingSlab
    {
        $found = $slabs[0];
        foreach ($slabs as $slab) {
            if ($paisa > $slab['over'] * 100 && ($slab['upTo'] === null || $paisa <= $slab['upTo'] * 100)) {
                $found = $slab;
                break;
            }
        }
        return new WithholdingSlab($found['over'], $found['upTo'], $found['rate']);
    }

    /**
     * @param list<array{over: int|float, upTo: int|float|null, rate: int|float}>|null $slabs
     * @return list<WithholdingSlab>|null
     */
    private static function slabs(?array $slabs): ?array
    {
        return $slabs === null ? null : array_map(
            static fn (array $slab): WithholdingSlab => new WithholdingSlab($slab['over'], $slab['upTo'], $slab['rate']),
            $slabs,
        );
    }

    /** @param array<string, mixed> $row */
    private static function source(array $row): DataSource
    {
        return new DataSource(
            id: 'withholding-rates',
            effectiveFrom: $row['from'],
            effectiveTo: $row['to'],
            sourceReference: $row['lawRef'] . ' (FBR Withholding Tax Rate Card, tax year ' . $row['taxYear']
                . ', ' . $row['cardRef'] . ')',
            sourceUrl: $row['card'],
        );
    }

    /** @return list<array<string, mixed>> */
    private static function rows(): array
    {
        return self::$rows ??= Data::load('withholding-rates');
    }
}
