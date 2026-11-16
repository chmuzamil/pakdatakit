<?php

declare(strict_types=1);

namespace PakDataKit\Internal;

/**
 * JavaScript's toUpperCase, toLowerCase and normalize('NFC'), from tables
 * generated from JavaScript's ICU (data/unicode.php). Results do not depend
 * on the PHP version's Unicode data or on the intl extension. ASCII input,
 * which is nearly all real input, takes a fast path.
 *
 * @internal
 */
final class Unicode
{
    private const S_BASE = 0xAC00;
    private const L_BASE = 0x1100;
    private const V_BASE = 0x1161;
    private const T_BASE = 0x11A7;
    private const L_COUNT = 19;
    private const V_COUNT = 21;
    private const T_COUNT = 28;
    private const N_COUNT = self::V_COUNT * self::T_COUNT;
    private const S_COUNT = self::L_COUNT * self::N_COUNT;

    /** @var array<string, array<int, mixed>>|null */
    private static ?array $tables = null;

    /** String.prototype.toUpperCase (full case mapping, e.g. ß to SS). */
    public static function upper(string $value): string
    {
        if (!preg_match('/[\x80-\xff]/', $value)) {
            return strtoupper($value);
        }
        $map = self::tables()['upper'];
        $out = '';
        foreach (Js::codePoints($value) as $char) {
            $out .= strlen($char) === 1 ? strtoupper($char) : ($map[mb_ord($char, 'UTF-8')] ?? $char);
        }
        return $out;
    }

    /** String.prototype.toLowerCase, including the final sigma rule. */
    public static function lower(string $value): string
    {
        if (!preg_match('/[\x80-\xff]/', $value)) {
            return strtolower($value);
        }
        $tables = self::tables();
        $chars = Js::codePoints($value);
        $out = '';
        foreach ($chars as $i => $char) {
            if (strlen($char) === 1) {
                $out .= strtolower($char);
            } elseif ($char === 'Σ' && self::isFinalSigma($chars, $i, $tables)) {
                $out .= 'ς';
            } else {
                $out .= $tables['lower'][mb_ord($char, 'UTF-8')] ?? $char;
            }
        }
        return $out;
    }

    /** String.prototype.normalize('NFC'). Invalid UTF-8 is returned unchanged. */
    public static function nfc(string $text): string
    {
        // Text below U+0300 is always in NFC: no combining marks, and
        // nothing that composes with another character.
        if (!preg_match('/[\xcc-\xff]/', $text)) {
            return $text;
        }
        if (!mb_check_encoding($text, 'UTF-8')) {
            return $text;
        }
        $tables = self::tables();
        $ranks = $tables['classRanks'];

        $decomposed = [];
        foreach (Js::codePoints($text) as $char) {
            self::decompose(mb_ord($char, 'UTF-8'), $tables['decompositions'], $decomposed);
        }

        // Canonical ordering: stable sort of each run of non-starters by class.
        $count = count($decomposed);
        for ($i = 0; $i < $count; $i++) {
            if (!isset($ranks[$decomposed[$i]])) {
                continue;
            }
            $end = $i;
            while ($end < $count && isset($ranks[$decomposed[$end]])) {
                $end++;
            }
            if ($end - $i > 1) {
                $run = array_slice($decomposed, $i, $end - $i);
                usort($run, static fn (int $a, int $b): int => $ranks[$a] <=> $ranks[$b]);
                array_splice($decomposed, $i, $end - $i, $run);
            }
            $i = $end;
        }

        // Canonical composition.
        $result = [];
        $starterIndex = -1;
        $lastRank = 0;
        foreach ($decomposed as $code) {
            $rank = $ranks[$code] ?? 0;
            if ($starterIndex >= 0) {
                $blocked = count($result) - 1 !== $starterIndex && ($lastRank === 0 || $lastRank >= $rank);
                if (!$blocked) {
                    $composite = self::compose($result[$starterIndex], $code, $tables['compositions']);
                    if ($composite !== null) {
                        $result[$starterIndex] = $composite;
                        continue;
                    }
                }
            }
            if ($rank === 0) {
                $starterIndex = count($result);
            }
            $lastRank = $rank;
            $result[] = $code;
        }

        $out = '';
        foreach ($result as $code) {
            $out .= mb_chr($code, 'UTF-8');
        }
        return $out;
    }

    /**
     * @param array<int, string> $decompositions
     * @param list<int> $out
     */
    private static function decompose(int $code, array $decompositions, array &$out): void
    {
        $s = $code - self::S_BASE;
        if ($s >= 0 && $s < self::S_COUNT) {
            $out[] = self::L_BASE + intdiv($s, self::N_COUNT);
            $out[] = self::V_BASE + intdiv($s % self::N_COUNT, self::T_COUNT);
            $t = $s % self::T_COUNT;
            if ($t !== 0) {
                $out[] = self::T_BASE + $t;
            }
            return;
        }
        if (!isset($decompositions[$code])) {
            $out[] = $code;
            return;
        }
        foreach (Js::codePoints($decompositions[$code]) as $char) {
            $out[] = mb_ord($char, 'UTF-8');
        }
    }

    /** @param array<int, int> $compositions */
    private static function compose(int $first, int $second, array $compositions): ?int
    {
        $l = $first - self::L_BASE;
        if ($l >= 0 && $l < self::L_COUNT) {
            $v = $second - self::V_BASE;
            return $v >= 0 && $v < self::V_COUNT ? self::S_BASE + ($l * self::V_COUNT + $v) * self::T_COUNT : null;
        }
        $s = $first - self::S_BASE;
        if ($s >= 0 && $s < self::S_COUNT && $s % self::T_COUNT === 0) {
            $t = $second - self::T_BASE;
            return $t > 0 && $t < self::T_COUNT ? $first + $t : null;
        }
        return $compositions[$first * 0x200000 + $second] ?? null;
    }

    /**
     * @param list<string> $chars
     * @param array<string, array<int, mixed>> $tables
     */
    private static function isFinalSigma(array $chars, int $index, array $tables): bool
    {
        $before = $index - 1;
        while ($before >= 0 && self::inRanges($tables['caseIgnorable'], $chars[$before])) {
            $before--;
        }
        if ($before < 0 || !self::inRanges($tables['cased'], $chars[$before])) {
            return false;
        }
        $after = $index + 1;
        $count = count($chars);
        while ($after < $count && self::inRanges($tables['caseIgnorable'], $chars[$after])) {
            $after++;
        }
        return $after >= $count || !self::inRanges($tables['cased'], $chars[$after]);
    }

    /** @param list<int> $ranges Inclusive (start, end) pairs. */
    private static function inRanges(array $ranges, string $char): bool
    {
        $code = mb_ord($char, 'UTF-8');
        if ($code === false) {
            return false;
        }
        $low = 0;
        $high = intdiv(count($ranges), 2) - 1;
        while ($low <= $high) {
            $mid = intdiv($low + $high, 2);
            if ($code < $ranges[$mid * 2]) {
                $high = $mid - 1;
            } elseif ($code > $ranges[$mid * 2 + 1]) {
                $low = $mid + 1;
            } else {
                return true;
            }
        }
        return false;
    }

    /** @return array<string, array<int, mixed>> */
    private static function tables(): array
    {
        return self::$tables ??= Data::load('unicode');
    }
}
