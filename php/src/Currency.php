<?php

declare(strict_types=1);

namespace PakDataKit;

use InvalidArgumentException;
use PakDataKit\Internal\Js;

/**
 * Pakistani Rupee and lakh/crore formatting. Does not use number_format,
 * sprintf or the locale.
 */
final class Currency
{
    private const LAKH = 100_000.0;
    private const CRORE = 10_000_000.0;

    /**
     * Formats an amount as `Rs. 150,000`, rounded to whole rupees.
     *
     * @throws InvalidArgumentException if the amount is NaN or infinite
     */
    public static function formatPkr(int|float $amount): string
    {
        $amount = self::finite($amount);
        $rounded = Js::round(abs($amount));
        $sign = $amount < 0 && $rounded != 0.0 ? '-' : '';
        return $sign . 'Rs. ' . Js::groupInteger($rounded);
    }

    /**
     * Formats an amount with lakh/crore units (`25 Lakh`, `1 Crore`). Values
     * are rounded to two decimals before the unit is chosen, so `9999999`
     * gives `1 Crore`. Smaller amounts fall back to formatPkr().
     *
     * @throws InvalidArgumentException if the amount is NaN or infinite
     */
    public static function formatLakh(int|float $amount): string
    {
        $amount = self::finite($amount);
        $sign = $amount < 0 ? '-' : '';
        $absolute = abs($amount);
        $crores = self::roundTo2($absolute / self::CRORE);
        if ($crores >= 1) {
            return $sign . Js::numberToString($crores) . ' Crore';
        }
        $lakhs = self::roundTo2($absolute / self::LAKH);
        return $lakhs >= 1 ? $sign . Js::numberToString($lakhs) . ' Lakh' : self::formatPkr($amount);
    }

    /** formatPkr() without throwing: null for NaN or an infinite amount. */
    public static function tryFormatPkr(int|float $amount): ?string
    {
        return is_finite((float) $amount) ? self::formatPkr($amount) : null;
    }

    /** formatLakh() without throwing: null for NaN or an infinite amount. */
    public static function tryFormatLakh(int|float $amount): ?string
    {
        return is_finite((float) $amount) ? self::formatLakh($amount) : null;
    }

    private static function roundTo2(float $value): float
    {
        return Js::round($value * 100) / 100;
    }

    private static function finite(int|float $amount): float
    {
        $amount = (float) $amount;
        if (!is_finite($amount)) {
            throw new InvalidArgumentException('Amount must be a finite number');
        }
        return $amount;
    }
}
