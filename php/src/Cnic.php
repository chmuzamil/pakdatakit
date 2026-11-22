<?php

declare(strict_types=1);

namespace PakDataKit;

use PakDataKit\Internal\Js;

/**
 * CNIC (Computerized National Identity Card) validation and decoding.
 */
final class Cnic
{
    // 13 digits, optionally grouped as #####-#######-# with a consistent separator.
    private const PATTERN = '/^[1-8][0-9]{4}([-‐‑‒–—. ]?)[0-9]{7}\1[0-9]\z/u';

    /** One digit: ASCII, Urdu (U+06F0-06F9) or Arabic-Indic (U+0660-0669). */
    private const ANY_DIGIT = '[0-9\x{06F0}-\x{06F9}\x{0660}-\x{0669}]';

    /** A province digit (1-8) in any of the three scripts. */
    private const PROVINCE_DIGIT = '[1-8\x{06F1}-\x{06F8}\x{0661}-\x{0668}]';

    /**
     * Horizontal space between digit groups: a space, a tab, a no-break space
     * (U+00A0) or a narrow no-break space (U+202F). Never a line break.
     */
    private const SPACE = '[ \t\x{00A0}\x{202F}]';

    /** One separator mark: a hyphen or Unicode dash (U+2010-2014), a dot, a slash or an underscore. */
    private const MARK = '[\-\x{2010}-\x{2014}.\/_]';

    /**
     * What may join two digit groups: any run of spaces, or one mark with any
     * spaces around it (`35202  1234567  1`, `35202 -1234567- 1`,
     * `35202_1234567_1`, `35202 - 1234567 - 1`). A line break never joins them.
     */
    private const JOIN = '(?:' . self::SPACE . '++|' . self::SPACE . '*+' . self::MARK . self::SPACE . '*+)';

    /** One digit group: an unbroken run of digits. */
    private const GROUP = '/' . self::ANY_DIGIT . '++/u';

    /** Digit groups joined as above, as long as the run goes. */
    private const DIGIT_RUN = '/' . self::ANY_DIGIT . '++(?:' . self::JOIN . self::ANY_DIGIT . '++)*+/u';

    private const PROVINCES = [
        '1' => 'Khyber Pakhtunkhwa',
        '2' => 'Khyber Pakhtunkhwa',
        '3' => 'Punjab',
        '4' => 'Sindh',
        '5' => 'Balochistan',
        '6' => 'Islamabad Capital Territory',
        '7' => 'Gilgit-Baltistan',
        '8' => 'Azad Jammu and Kashmir',
    ];

    /**
     * Validates a Pakistani CNIC number (structure only; NADRA publishes no
     * check-digit algorithm). Accepts `3520212345671`, `35202-1234567-1`,
     * `35202 1234567 1` and Urdu digits. Never throws.
     */
    public static function validate(?string $cnic): bool
    {
        return Js::test(self::PATTERN, Js::toAsciiDigits(Js::trim($cnic ?? '')));
    }

    /**
     * Reads the province of first registration and the gender encoded in a
     * CNIC. Returns null if the CNIC is invalid.
     */
    public static function getInfo(?string $cnic): ?CnicInfo
    {
        if (!self::validate($cnic)) {
            return null;
        }
        $digits = Js::replace('/[^0-9]/u', '', Js::toAsciiDigits($cnic ?? ''));
        return new CnicInfo(
            digits: $digits,
            formatted: substr($digits, 0, 5) . '-' . substr($digits, 5, 7) . '-' . $digits[12],
            province: self::PROVINCES[$digits[0]],
            gender: ((int) $digits[12]) % 2 === 1 ? 'male' : 'female',
        );
    }

    /** One digit, for counting and masking. */
    private const ONE_DIGIT = '/' . self::ANY_DIGIT . '/u';

    /** A run whose first digit is a province digit. */
    private const FIRST_IS_PROVINCE = '/^' . self::PROVINCE_DIGIT . '/u';

    /**
     * Where CNICs are in a (valid UTF-8) text: `[start, end]` byte offsets,
     * in order. In each run of digit groups, consecutive whole groups that
     * add up to exactly 13 digits, starting with a province digit, are a
     * CNIC; the search goes on after it. A group is never split, so 13
     * digits inside a longer unbroken number are never matched.
     *
     * @return list<array{int, int}>
     */
    private static function spans(string $text): array
    {
        if (!@preg_match_all(self::DIGIT_RUN, $text, $runs, PREG_OFFSET_CAPTURE)) {
            return [];
        }
        $spans = [];
        foreach ($runs[0] as [$raw, $start]) {
            if (!@preg_match_all(self::GROUP, $raw, $found, PREG_OFFSET_CAPTURE)) {
                continue;
            }
            $groups = [];
            foreach ($found[0] as [$group, $at]) {
                $groups[] = [
                    'start' => $start + $at,
                    'end' => $start + $at + strlen($group),
                    'digits' => mb_strlen($group, 'UTF-8'),
                    'first' => $group,
                ];
            }
            $count = count($groups);
            for ($i = 0; $i < $count; $i++) {
                $digits = 0;
                for ($j = $i; $j < $count; $j++) {
                    $digits += $groups[$j]['digits'];
                    if ($digits < 13) {
                        continue;
                    }
                    if ($digits === 13 && @preg_match(self::FIRST_IS_PROVINCE, $groups[$i]['first']) === 1) {
                        $spans[] = [$groups[$i]['start'], $groups[$j]['end']];
                        $i = $j;
                    }
                    break;
                }
            }
        }
        return $spans;
    }

    /**
     * Finds CNIC numbers in free text, such as a chat message, a note or an
     * uploaded document, for example to mask them before logging.
     *
     * Digits are read in groups (unbroken runs of digits). Groups may be
     * joined by any run of spaces or tabs, or by one mark (a hyphen or
     * Unicode dash, a dot, a slash or an underscore) with any spaces around
     * it: `35202 1234567 1`, `35202  1234567  1`, `35202 -1234567- 1`,
     * `35202_1234567_1`, `35202 - 1234567 - 1`, `352 0212 3456 71`,
     * `35202/1234567/1`. A line break never joins groups. A match is
     * consecutive whole groups that add up to exactly 13 digits, starting
     * with a province code (1-8); the search goes on after each match, so
     * `0300-1234567 35202-1234567-1` finds the CNIC. A group is never split,
     * so 13 digits inside a longer unbroken number (an IBAN, a card number)
     * never match. Digits may be ASCII, Urdu or Arabic-Indic, even mixed.
     * This matches everything Jaanch's own CNIC redaction does, except
     * across line breaks.
     *
     * Accepting any grouping catches CNICs as people really type them, but
     * matches more that is not a CNIC: any 13 digits starting with 1-8 split
     * into groups this way (an account, order or tracking number, table
     * columns, a price list such as `8260 - 8048 - 2804 - 0`, a file name
     * such as `IMG_20261123_12345`, or two shorter numbers written together)
     * are found. validate() stays strict.
     *
     * Offsets are in code points, so `mb_substr($text, $m->start, $m->end -
     * $m->start)` is `$m->raw`. Invalid UTF-8 bytes are first replaced as
     * `mb_scrub()` does.
     *
     * ```php
     * Cnic::findAll('CNIC: 35202-1234567-1, phone 0300-1234567');
     * // [CnicMatch(raw: '35202-1234567-1', digits: '3520212345671',
     * //   formatted: '35202-1234567-1', start: 6, end: 21)]
     * Cnic::findAll('id 352 0212 3456 71')[0]->digits; // '3520212345671'
     * ```
     *
     * @param mixed $text Any text
     * @return list<CnicMatch> The matches in order, or `[]` (also for a value
     *   that is not a string). Never throws.
     */
    public static function findAll(mixed $text): array
    {
        if (!is_string($text)) {
            return [];
        }
        $text = mb_scrub($text, 'UTF-8');
        $found = [];
        foreach (self::spans($text) as [$from, $to]) {
            $raw = substr($text, $from, $to - $from);
            $digits = Js::replace('/[^0-9]/', '', Js::toAsciiDigits($raw));
            $start = mb_strlen(substr($text, 0, $from), 'UTF-8');
            $found[] = new CnicMatch(
                raw: $raw,
                digits: $digits,
                formatted: substr($digits, 0, 5) . '-' . substr($digits, 5, 7) . '-' . $digits[12],
                start: $start,
                end: $start + mb_strlen($raw, 'UTF-8'),
            );
        }
        return $found;
    }

    /**
     * Masks every CNIC in free text, as found by findAll(): each digit
     * becomes the mask and the separators stay, so `35202-1234567-1`
     * becomes `XXXXX-XXXXXXX-X`. The rest of the text is unchanged (invalid
     * UTF-8 bytes are replaced as `mb_scrub()` does).
     *
     * With `$replacement`, each whole CNIC is replaced by that text instead.
     *
     * Like findAll(), it also masks any other 13 digits that start with 1-8,
     * however they are grouped.
     *
     * ```php
     * Cnic::mask('My CNIC is 35202-1234567-1');
     * // MaskedText(text: 'My CNIC is XXXXX-XXXXXXX-X', count: 1)
     * Cnic::mask('35202 1234567 1', '*');
     * // MaskedText(text: '***** ******* *', count: 1)
     * Cnic::mask('CNIC 352 0212 3456 71', replacement: '[CNIC removed]');
     * // MaskedText(text: 'CNIC [CNIC removed]', count: 1)
     * ```
     *
     * @param mixed $text Any text
     * @param mixed $mask The string that replaces each digit, keeping the
     *   separators; anything that is not a string means `'X'`
     * @param mixed $replacement The string that replaces each whole CNIC,
     *   separators included, e.g. `'[CNIC removed]'`. Takes precedence over
     *   `$mask`; anything that is not a string is ignored.
     * @return MaskedText The masked text and the number of CNICs masked. A
     *   value that is not a string gives `text: ''`, `count: 0`. Never throws.
     */
    public static function mask(mixed $text, mixed $mask = 'X', mixed $replacement = null): MaskedText
    {
        if (!is_string($text)) {
            return new MaskedText('', 0);
        }
        $mask = is_string($mask) ? $mask : 'X';
        $replacement = is_string($replacement) ? $replacement : null;
        $text = mb_scrub($text, 'UTF-8');
        $spans = self::spans($text);
        $out = '';
        $at = 0;
        foreach ($spans as [$from, $to]) {
            $raw = substr($text, $from, $to - $from);
            $out .= substr($text, $at, $from - $at)
                . ($replacement ?? (string) @preg_replace_callback(self::ONE_DIGIT, static fn (): string => $mask, $raw));
            $at = $to;
        }
        return new MaskedText($out . substr($text, $at), count($spans));
    }
}
