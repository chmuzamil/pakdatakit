<?php

declare(strict_types=1);

namespace PakDataKit;

use DateTimeImmutable;
use PakDataKit\Internal\Data;
use PakDataKit\Internal\Date;
use PakDataKit\Internal\Js;
use PakDataKit\Internal\Money;

/**
 * Standard sales tax rates with the dates they applied, from 1 July 2019:
 * federal sales tax on goods (FBR), and sales tax on services in Punjab
 * (PRA), Sindh (SRB), Khyber Pakhtunkhwa (KPRA), Balochistan (BRA) and
 * Islamabad Capital Territory (FBR). Reduced, higher and sector rates are
 * not included. Amounts are computed exactly in whole paisa.
 */
final class SalesTax
{
    /** Kind of supply: goods, taxed federally. */
    public const GOODS = 'goods';

    /** Kind of supply: services, taxed by the province or ICT. */
    public const SERVICES = 'services';

    private const PROVINCES = [
        'punjab' => 'Punjab',
        'sindh' => 'Sindh',
        'khyber pakhtunkhwa' => 'Khyber Pakhtunkhwa',
        'kp' => 'Khyber Pakhtunkhwa',
        'kpk' => 'Khyber Pakhtunkhwa',
        'balochistan' => 'Balochistan',
        'baluchistan' => 'Balochistan',
        'islamabad capital territory' => 'Islamabad Capital Territory',
        'ict' => 'Islamabad Capital Territory',
        'islamabad' => 'Islamabad Capital Territory',
        'azad jammu and kashmir' => 'Azad Jammu and Kashmir',
        'ajk' => 'Azad Jammu and Kashmir',
        'gilgit-baltistan' => 'Gilgit-Baltistan',
        'gilgit baltistan' => 'Gilgit-Baltistan',
        'gb' => 'Gilgit-Baltistan',
    ];

    /** Provinces outside the federal Sales Tax Act's territory. */
    private const OUTSIDE_FEDERAL = ['Azad Jammu and Kashmir', 'Gilgit-Baltistan'];

    /** @var list<SalesTaxRate>|null */
    private static ?array $rates = null;

    /**
     * Returns the standard sales tax rate for goods (federal, Sales Tax Act
     * 1990) or for services in a province or Islamabad Capital Territory,
     * on a given date.
     *
     * Query:
     * - `kind` (string, required): `goods` or `services` (SalesTax::GOODS, SalesTax::SERVICES)
     * - `province` (string): for services, Punjab, Sindh, Khyber Pakhtunkhwa
     *   (`KP`, `KPK`), Balochistan or Islamabad Capital Territory (`ICT`,
     *   `Islamabad`). For goods it may be left out; Azad Jammu and Kashmir
     *   and Gilgit-Baltistan give null.
     * - `date` (string `YYYY-MM-DD` or DateTimeInterface, its own calendar
     *   date): defaults to today in the default time zone
     *
     * Returns null for an unknown province or kind, an invalid date, or a
     * date before 1 July 2019. Never throws.
     *
     * @param array{kind?: mixed, province?: mixed, date?: mixed}|null $query
     */
    public static function getRate(?array $query): ?SalesTaxRate
    {
        if ($query === null) {
            return null;
        }
        $kind = $query['kind'] ?? null;
        if ($kind !== self::GOODS && $kind !== self::SERVICES) {
            return null;
        }
        $date = Date::iso($query['date'] ?? new DateTimeImmutable());
        if ($date === null) {
            return null;
        }

        $province = null;
        if (isset($query['province'])) {
            $province = self::provinceName($query['province']);
            if ($province === null) {
                return null;
            }
        }
        if ($kind === self::GOODS) {
            if ($province !== null && in_array($province, self::OUTSIDE_FEDERAL, true)) {
                return null;
            }
        } elseif ($province === null) {
            return null;
        }

        foreach (self::rates() as $rate) {
            if (
                $rate->kind === $kind
                && ($kind === self::GOODS || $rate->province === $province)
                && strcmp($rate->from, $date) <= 0
                && ($rate->to === null || strcmp($date, $rate->to) <= 0)
            ) {
                return $rate;
            }
        }
        return null;
    }

    /**
     * Adds sales tax to an amount, or splits it out when `inclusive` is set.
     * The tax is rounded half up to the paisa, reading the number as written
     * (`1.005` is Rs 1.01).
     *
     * Options: a `rate`, or a `province` (and `kind`, default `services`,
     * and `date`) to use the standard rate from getRate():
     * - `rate` (int|float): percent, 0 to 100, at most 2 decimals; takes precedence over `province`
     * - `province` (string), `kind` (string), `date` (string|DateTimeInterface): as for getRate()
     * - `inclusive` (bool): true if `$amount` already includes the tax
     *
     * @param mixed $amount Rupees (int|float), 0 to one trillion
     * @param array{rate?: mixed, province?: mixed, kind?: mixed, date?: mixed, inclusive?: mixed}|null $options
     * @return SalesTaxAmounts|null Null if the amount, rate or province is
     *     invalid or no rate applies. Never throws.
     */
    public static function calculate(mixed $amount, ?array $options): ?SalesTaxAmounts
    {
        if ($options === null) {
            return null;
        }
        if (isset($options['rate'])) {
            $rate = $options['rate'];
        } else {
            $kind = $options['kind'] ?? (isset($options['province']) ? self::SERVICES : null);
            if ($kind === null) {
                return null;
            }
            $query = ['kind' => $kind];
            if (isset($options['province'])) {
                $query['province'] = $options['province'];
            }
            if (isset($options['date'])) {
                $query['date'] = $options['date'];
            }
            $found = self::getRate($query);
            if ($found === null) {
                return null;
            }
            $rate = $found->rate;
        }
        if (($options['inclusive'] ?? null) === true) {
            return self::splitInclusive($amount, $rate);
        }

        $netPaisa = Money::toUnits($amount, 2);
        $bp = self::basisPoints($rate);
        if ($netPaisa === null || $bp === null) {
            return null;
        }
        $taxPaisa = Money::divideHalfUp($netPaisa * $bp, 10_000);
        return self::amounts($netPaisa, $taxPaisa, $bp);
    }

    /**
     * Splits an amount that includes sales tax into its value and tax. The
     * value is rounded half up to the paisa, and the tax is the rest, so
     * `net + tax` is always `gross`.
     *
     * @param mixed $gross Amount including tax (int|float), 0 to one trillion rupees
     * @param mixed $rate Percent (int|float), 0 to 100, at most 2 decimals
     * @return SalesTaxAmounts|null Null for an invalid amount or rate. Never throws.
     */
    public static function splitInclusive(mixed $gross, mixed $rate): ?SalesTaxAmounts
    {
        $grossPaisa = Money::toUnits($gross, 2);
        $bp = self::basisPoints($rate);
        if ($grossPaisa === null || $bp === null) {
            return null;
        }
        $netPaisa = Money::divideHalfUp($grossPaisa * 10_000, 10_000 + $bp);
        return self::amounts($netPaisa, $grossPaisa - $netPaisa, $bp);
    }

    /** Basis points (hundredths of a percent) for a rate from 0 to 100 with at most 2 decimals. */
    private static function basisPoints(mixed $rate): ?int
    {
        if (!is_int($rate) && !is_float($rate)) {
            return null;
        }
        if (is_float($rate) && !is_finite($rate)) {
            return null;
        }
        if ($rate < 0 || $rate > 100) {
            return null;
        }
        $exact = Money::toUnits($rate, 4); // ten-thousandths of a percent
        if ($exact === null || $exact % 100 !== 0) {
            return null;
        }
        return intdiv($exact, 100);
    }

    private static function amounts(int $netPaisa, int $taxPaisa, int $bp): SalesTaxAmounts
    {
        return new SalesTaxAmounts(
            net: Money::fromPaisa($netPaisa),
            tax: Money::fromPaisa($taxPaisa),
            gross: Money::fromPaisa($netPaisa + $taxPaisa),
            rate: $bp / 100.0,
        );
    }

    private static function provinceName(mixed $input): ?string
    {
        if (!is_string($input)) {
            return null;
        }
        return self::PROVINCES[Js::normalizeKey($input)] ?? null;
    }

    /** @return list<SalesTaxRate> */
    private static function rates(): array
    {
        if (self::$rates === null) {
            self::$rates = [];
            foreach (Data::load('sales-tax-rates') as $entry) {
                self::$rates[] = new SalesTaxRate(
                    kind: $entry['kind'],
                    authority: $entry['authority'],
                    province: $entry['province'] ?? null,
                    rate: $entry['rate'],
                    from: $entry['from'],
                    to: $entry['to'] ?? null,
                    law: $entry['law'],
                    source: $entry['source'],
                );
            }
        }
        return self::$rates;
    }
}
