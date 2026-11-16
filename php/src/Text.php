<?php

declare(strict_types=1);

namespace PakDataKit;

use PakDataKit\Internal\Js;
use PakDataKit\Internal\Unicode;

/**
 * Text normalization, Roman Urdu spelling and Urdu digits.
 */
final class Text
{
    private const URDU_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    private const WORD = 'A-Za-z0-9_';

    // Common Roman Urdu spelling normalizations (informal to preferred). Only
    // unambiguous variants are listed.
    private const ROMAN_URDU = [
        'kia' => 'kya',
        'ker' => 'kar',
        'kr' => 'kar',
        'hy' => 'hai',
        'mujhay' => 'mujhe',
        'ap' => 'aap',
        'shukria' => 'shukriya',
        'nhi' => 'nahi',
        'assalamu alaikum' => 'assalamualaikum',
        'assalam o alaikum' => 'assalamualaikum',
    ];

    /** Trims, collapses whitespace and applies Unicode NFC. Never throws. */
    public static function normalize(?string $text): string
    {
        return Js::normalizeWhitespace(Unicode::nfc($text ?? ''));
    }

    /**
     * Normalizes informal Roman Urdu spellings (`kia` to `kya`). Also applies
     * normalize() and converts Urdu and Arabic-Indic digits to English. A
     * capitalized word keeps its capital; all-caps words are left alone.
     */
    public static function normalizeRomanUrdu(?string $text): string
    {
        $result = self::normalize(self::toEnglishDigits($text));
        foreach (self::ROMAN_URDU as $informal => $preferred) {
            // ASCII-only word boundaries and case-insensitivity, as in JavaScript.
            $pattern = '/(?<![' . self::WORD . '])' . self::caseInsensitive($informal) . '(?![' . self::WORD . '])/u';
            $result = Js::replaceCallback(
                $pattern,
                static fn (array $m): string => self::matchCase($m[0], $preferred),
                $result,
            );
        }
        return $result;
    }

    /** Converts English and Arabic-Indic digits to Urdu digits (۰-۹). */
    public static function toUrduDigits(?string $text): string
    {
        return strtr(Js::toAsciiDigits($text ?? ''), array_map('strval', self::URDU_DIGITS));
    }

    /** Converts Urdu and Arabic-Indic digits to English digits (0-9). */
    public static function toEnglishDigits(?string $text): string
    {
        return Js::toAsciiDigits($text ?? '');
    }

    private static function matchCase(string $original, string $replacement): string
    {
        if (strlen($original) > 1 && $original === strtoupper($original)) {
            return $original;
        }
        $first = $original[0];
        return $first !== strtolower($first) ? strtoupper($replacement[0]) . substr($replacement, 1) : $replacement;
    }

    /** Turns `abc` into `[Aa][Bb][Cc]`. */
    private static function caseInsensitive(string $letters): string
    {
        $out = '';
        foreach (str_split($letters) as $char) {
            $out .= ctype_lower($char) ? '[' . strtoupper($char) . $char . ']' : $char;
        }
        return $out;
    }
}
