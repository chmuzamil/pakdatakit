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

    /** A CNIC separator: a hyphen or dash (U+2010-2014), a dot, or a space. */
    private const SEPARATOR = '[\-\x{2010}-\x{2014}. ]';

    /**
     * A CNIC in running text: a province digit (1-8), then 4, 7 and 1 more
     * digits with an optional separator between the groups (the two may
     * differ), not touching another digit on either side.
     */
    private const IN_TEXT = '/(?<!' . self::ANY_DIGIT . ')[1-8\x{06F1}-\x{06F8}\x{0661}-\x{0668}]'
        . self::ANY_DIGIT . '{4}' . self::SEPARATOR . '?' . self::ANY_DIGIT . '{7}'
        . self::SEPARATOR . '?' . self::ANY_DIGIT . '(?!' . self::ANY_DIGIT . ')/u';

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

    /**
     * Finds CNIC numbers in free text, such as a chat message, a note or an
     * uploaded document, for example to mask them before logging.
     *
     * A match is 13 digits whose first digit is a province code (1-8),
     * written together or in 5-7-1 groups with a hyphen, dash, dot or space
     * between the groups (the two separators may differ). Digits may be
     * ASCII, Urdu or Arabic-Indic, even mixed. A match never starts or ends
     * next to another digit, so a longer number is not cut into a CNIC.
     *
     * This is looser than validate(), which needs the same separator twice:
     * text is written carelessly. It is a pattern match, so any other
     * 13-digit number that starts with 1-8 (an account or order number, say)
     * also matches.
     *
     * Offsets are in code points, so `mb_substr($text, $m->start, $m->end -
     * $m->start)` is `$m->raw`. Invalid UTF-8 bytes are first replaced as
     * `mb_scrub()` does.
     *
     * ```php
     * Cnic::findAll('CNIC: 35202-1234567-1, phone 0300-1234567');
     * // [CnicMatch(raw: '35202-1234567-1', digits: '3520212345671',
     * //   formatted: '35202-1234567-1', start: 6, end: 21)]
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
        if (@preg_match_all(self::IN_TEXT, $text, $matches, PREG_OFFSET_CAPTURE | PREG_SET_ORDER) < 1) {
            return [];
        }
        $found = [];
        foreach ($matches as [[$raw, $offset]]) {
            $digits = Js::replace('/[^0-9]/', '', Js::toAsciiDigits($raw));
            $start = mb_strlen(substr($text, 0, $offset), 'UTF-8');
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
     * Like findAll(), it also masks any other 13-digit number that starts
     * with 1-8.
     *
     * ```php
     * Cnic::mask('My CNIC is 35202-1234567-1');
     * // MaskedText(text: 'My CNIC is XXXXX-XXXXXXX-X', count: 1)
     * Cnic::mask('35202 1234567 1', '*');
     * // MaskedText(text: '***** ******* *', count: 1)
     * ```
     *
     * @param mixed $text Any text
     * @param mixed $mask The string that replaces each digit; anything that
     *   is not a string means `'X'`
     * @return MaskedText The masked text and the number of CNICs masked. A
     *   value that is not a string gives `text: ''`, `count: 0`. Never throws.
     */
    public static function mask(mixed $text, mixed $mask = 'X'): MaskedText
    {
        if (!is_string($text)) {
            return new MaskedText('', 0);
        }
        $mask = is_string($mask) ? $mask : 'X';
        $count = 0;
        $masked = @preg_replace_callback(
            self::IN_TEXT,
            static function (array $match) use ($mask, &$count): string {
                $count++;
                return (string) preg_replace_callback('/' . self::ANY_DIGIT . '/u', static fn (): string => $mask, $match[0]);
            },
            mb_scrub($text, 'UTF-8'),
        );
        return new MaskedText($masked ?? '', $masked === null ? 0 : $count);
    }
}
