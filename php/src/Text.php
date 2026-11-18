<?php

declare(strict_types=1);

namespace PakDataKit;

use PakDataKit\Internal\Js;
use PakDataKit\Internal\Unicode;

/**
 * Text normalization, Roman Urdu spelling, Urdu digits, URL slugs, Urdu
 * alphabetical order and bidirectional text.
 */
final class Text
{
    private const URDU_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    private const WORD = 'A-Za-z0-9_';

    /** slugify() script: keep Latin and Urdu letters (the default). */
    public const SCRIPT_ANY = 'any';

    /** slugify() script: keep only `a-z`. */
    public const SCRIPT_LATIN = 'latin';

    /** slugify() script: keep only Urdu letters. */
    public const SCRIPT_URDU = 'urdu';

    /** wrapBidi() direction: FIRST STRONG ISOLATE (the default). */
    public const BIDI_AUTO = 'auto';

    /** wrapBidi() direction: RIGHT-TO-LEFT ISOLATE. */
    public const BIDI_RTL = 'rtl';

    /** wrapBidi() direction: LEFT-TO-RIGHT ISOLATE. */
    public const BIDI_LTR = 'ltr';

    /** Arabic look-alikes written for Urdu letters: ك ي ى to ک ی ی. */
    private const URDU_FOR_ARABIC = ['ك' => 'ک', 'ي' => 'ی', 'ى' => 'ی'];

    /** Latin-1 letters with accents (lower case, by code point), folded to ASCII for slugs. */
    private const LATIN1_FOLD = [
        0xe0 => 'a', 0xe1 => 'a', 0xe2 => 'a', 0xe3 => 'a', 0xe4 => 'a', 0xe5 => 'a', 0xe6 => 'ae', 0xe7 => 'c',
        0xe8 => 'e', 0xe9 => 'e', 0xea => 'e', 0xeb => 'e', 0xec => 'i', 0xed => 'i', 0xee => 'i', 0xef => 'i',
        0xf0 => 'd', 0xf1 => 'n', 0xf2 => 'o', 0xf3 => 'o', 0xf4 => 'o', 0xf5 => 'o', 0xf6 => 'o', 0xf8 => 'o',
        0xf9 => 'u', 0xfa => 'u', 0xfb => 'u', 0xfc => 'u', 0xfd => 'y', 0xff => 'y', 0xfe => 'th', 0xdf => 'ss',
    ];

    /**
     * Urdu letters in alphabetical order, from the CLDR `ur` collation
     * (common/collation/ur.xml, CLDR 49). Each letter followed by ھ (بھ, پھ,
     * …) is a letter of its own, right after it.
     */
    private const URDU_ORDER = [
        'ا', 'آ', 'ب', 'بھ', 'پ', 'پھ', 'ت', 'تھ', 'ٹ', 'ٹھ', 'ث', 'ج', 'جھ', 'چ',
        'چھ', 'ح', 'خ', 'د', 'دھ', 'ڈ', 'ڈھ', 'ذ', 'ر', 'رھ', 'ڑ', 'ڑھ', 'ز', 'ژ',
        'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ک', 'کھ', 'گ', 'گھ',
        'ل', 'لھ', 'م', 'مھ', 'ن', 'نھ', 'ں', 'ںھ', 'و', 'وھ', 'ہ', 'ھ', 'ۃ', 'ء',
        'ی', 'یھ', 'ے',
    ];

    /** Letters with a hamza that sort as their base letter, secondarily after it: أ ؤ ۂ ئ ۓ. */
    private const HAMZA_VARIANTS = [0x0623 => 0x0627, 0x0624 => 0x0648, 0x06c2 => 0x06c1, 0x0626 => 0x06cc, 0x06d3 => 0x06d2];

    /** Diacritics in CLDR's secondary order (ْ < َ < ِ < … < ٓ), code point => index. */
    private const DIACRITICS = [
        0x0652 => 0, 0x064e => 1, 0x0650 => 2, 0x064f => 3, 0x0670 => 4, 0x0656 => 5, 0x0657 => 6,
        0x064b => 7, 0x064d => 8, 0x064c => 9, 0x0654 => 10, 0x0651 => 11, 0x0658 => 12, 0x0653 => 13,
    ];

    // Primary groups, in sorting order.
    private const GROUP_PUNCTUATION = 1;
    private const GROUP_DIGIT = 2;
    private const GROUP_URDU = 3;
    private const GROUP_OTHER_ARABIC = 4;
    private const GROUP_OTHER = 5;

    /** @var array<int|string, int>|null Code points ("1576" or "1576,1726") => rank in URDU_ORDER */
    private static ?array $urduRank = null;

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

    // ------------------------------------------- slugs, Urdu sorting, bidi

    /**
     * Turns text into a URL slug: lower-case words joined by `-`.
     *
     * Urdu letters are kept as they are (no transliteration: Urdu does not
     * write short vowels, so there is no single Roman spelling). Diacritics,
     * tatweel and zero-width characters are dropped, the Arabic look-alikes
     * ك ي ى become the Urdu ک ی ی, Urdu and Arabic-Indic digits become
     * `0-9`, and accented Latin-1 letters lose their accents (`é` to `e`,
     * `ß` to `ss`). Anything else separates words.
     *
     * Options: `script` (`any`, the default, keeps Latin and Urdu letters;
     * `latin` keeps only `a-z`; `urdu` keeps only Urdu letters; any other
     * value is `any`). Digits are always kept.
     *
     * @param mixed $input The text; anything that is not a string gives `''`
     * @param mixed $options `['script' => Text::SCRIPT_*]`
     * @return string The slug, or `''` when nothing is left. Never throws.
     */
    public static function slugify(mixed $input, mixed $options = []): string
    {
        if (!is_string($input)) {
            return '';
        }
        $script = is_array($options) ? ($options['script'] ?? null) : (is_object($options) ? ($options->script ?? null) : null);
        $keepLatin = $script !== self::SCRIPT_URDU;
        $keepUrdu = $script !== self::SCRIPT_LATIN;
        $out = '';
        $pending = false;
        foreach (Js::codePoints(Js::toAsciiDigits($input)) as $char) {
            $cp = self::codePoint($char);
            if (self::isSkipped($cp)) {
                continue;
            }
            $piece = null;
            if ($cp >= 0x30 && $cp <= 0x39) {
                $piece = $char;
            } elseif ($keepLatin && $cp >= 0x61 && $cp <= 0x7a) {
                $piece = $char;
            } elseif ($keepLatin && $cp >= 0x41 && $cp <= 0x5a) {
                $piece = chr($cp + 0x20);
            } elseif ($keepLatin && $cp >= 0xc0 && $cp <= 0xff) {
                // À-Þ (except ×) are the capitals of à-þ.
                $lower = $cp <= 0xde && $cp !== 0xd7 ? $cp + 0x20 : $cp;
                $piece = self::LATIN1_FOLD[$lower] ?? null;
            }
            if ($piece === null && $keepUrdu && self::isArabicLetter($cp)) {
                $piece = self::URDU_FOR_ARABIC[$char] ?? $char;
            }
            if ($piece === null) {
                $pending = true;
                continue;
            }
            if ($pending && $out !== '') {
                $out .= '-';
            }
            $pending = false;
            $out .= $piece;
        }
        return $out;
    }

    /**
     * Compares two strings in Urdu alphabetical order, for usort().
     *
     * Letters follow the Unicode CLDR collation for Urdu (`ur`, CLDR 49):
     * ا آ ب بھ پ پھ ت تھ ٹ ٹھ ث ج جھ چ چھ ح خ د دھ ڈ ڈھ ذ ر رھ ڑ ڑھ ز ژ س ش ص
     * ض ط ظ ع غ ف ق ک کھ گ گھ ل لھ م مھ ن نھ ں ںھ و وھ ہ ھ ۃ ء ی یھ ے. A letter
     * joined with ھ is a letter of its own (so بھ comes after every other ب
     * word). أ ؤ ۂ ئ ۓ sort as ا و ہ ی ے and come just after them when words
     * are otherwise equal, and diacritics only break ties, in CLDR's order.
     *
     * Outside the Urdu letters: spaces and punctuation come first, then
     * digits digit by digit (Urdu, Arabic-Indic and ASCII digits are equal;
     * `10` comes before `2`), then Urdu letters, then other Arabic-script
     * characters (the look-alikes ك ي ى ه ة), then everything else by code
     * point, ignoring ASCII case. Strings that are still equal are ordered
     * by code point, so the result is 0 only for identical strings. The
     * order does not depend on intl or ICU.
     *
     * @param mixed $a A string; anything else is treated as `''`
     * @param mixed $b A string; anything else is treated as `''`
     * @return int -1, 0 or 1. Never throws.
     */
    public static function compareUrdu(mixed $a, mixed $b): int
    {
        $x = is_string($a) ? $a : '';
        $y = is_string($b) ? $b : '';
        if ($x === $y) {
            return 0;
        }
        $cx = array_map(self::codePoint(...), Js::codePoints($x));
        $cy = array_map(self::codePoint(...), Js::codePoints($y));
        [$px, $sx] = self::collationKey($cx);
        [$py, $sy] = self::collationKey($cy);
        $result = self::compareLists($px, $py);
        if ($result === 0) {
            $result = self::compareLists($sx, $sy);
        }
        return $result !== 0 ? $result : self::compareLists($cx, $cy);
    }

    /**
     * Whether text reads right to left: its first letter is from a
     * right-to-left script such as Urdu or Arabic. Digits, punctuation and
     * spaces are skipped, as in the Unicode bidirectional algorithm's
     * paragraph rule.
     *
     * @param mixed $text The text; anything that is not a string gives false
     * @return bool False when there is no letter. Never throws.
     */
    public static function isRtl(mixed $text): bool
    {
        if (!is_string($text)) {
            return false;
        }
        foreach (Js::codePoints($text) as $char) {
            if (@preg_match('/^\p{L}\z/u', $char) === 1) {
                return self::isRtlCodePoint(self::codePoint($char));
            }
        }
        return false;
    }

    /**
     * Wraps text in Unicode directional isolates, so a name or number in
     * one direction does not reorder the sentence around it (for example an
     * English order number inside an Urdu message).
     *
     * Uses FIRST STRONG ISOLATE (U+2068) by default, RIGHT-TO-LEFT ISOLATE
     * (U+2067) for `rtl` and LEFT-TO-RIGHT ISOLATE (U+2066) for `ltr`,
     * closed with POP DIRECTIONAL ISOLATE (U+2069). Any other direction is
     * `auto`.
     *
     * @param mixed $text The text; anything that is not a string gives `''`
     * @param mixed $direction Text::BIDI_AUTO, Text::BIDI_RTL or Text::BIDI_LTR
     * @return string The wrapped text. Never throws.
     */
    public static function wrapBidi(mixed $text, mixed $direction = self::BIDI_AUTO): string
    {
        if (!is_string($text)) {
            return '';
        }
        $open = match ($direction) {
            self::BIDI_RTL => "\u{2067}",
            self::BIDI_LTR => "\u{2066}",
            default => "\u{2068}",
        };
        return $open . $text . "\u{2069}";
    }

    /** The code point of one character from Js::codePoints(); a malformed byte sequence is decoded as far as it goes. */
    private static function codePoint(string $char): int
    {
        $b = array_values(unpack('C*', $char) ?: [0]);
        $n = count($b);
        if ($n === 1) {
            return $b[0] < 0x80 ? $b[0] : 0xfffd;
        }
        if ($n === 2) {
            return (($b[0] & 0x1f) << 6) | ($b[1] & 0x3f);
        }
        if ($n === 3) {
            return (($b[0] & 0x0f) << 12) | (($b[1] & 0x3f) << 6) | ($b[2] & 0x3f);
        }
        return (($b[0] & 0x07) << 18) | (($b[1] & 0x3f) << 12) | (($b[2] & 0x3f) << 6) | ($b[3] & 0x3f);
    }

    /** Marks and invisible characters that slugs and sorting skip. */
    private static function isSkipped(int $cp): bool
    {
        return ($cp >= 0x0300 && $cp <= 0x036f)
            || ($cp >= 0x0610 && $cp <= 0x061a)
            || ($cp >= 0x064b && $cp <= 0x065f)
            || $cp === 0x0670
            || ($cp >= 0x06d6 && $cp <= 0x06ed)
            || $cp === 0x061c
            || $cp === 0x0640
            || ($cp >= 0x200b && $cp <= 0x200f)
            || ($cp >= 0x202a && $cp <= 0x202e)
            || ($cp >= 0x2066 && $cp <= 0x2069)
            || $cp === 0xfeff;
    }

    /** Arabic-script letters (Urdu letters and their Arabic look-alikes). */
    private static function isArabicLetter(int $cp): bool
    {
        return ($cp >= 0x0621 && $cp <= 0x064a && $cp !== 0x0640)
            || ($cp >= 0x066e && $cp <= 0x06d3)
            || $cp === 0x06d5
            || ($cp >= 0x06fa && $cp <= 0x06ff);
    }

    private static function isPunctuation(int $cp): bool
    {
        return $cp <= 0x2f
            || ($cp >= 0x3a && $cp <= 0x40)
            || ($cp >= 0x5b && $cp <= 0x60)
            || ($cp >= 0x7b && $cp <= 0xbf)
            || ($cp >= 0x2000 && $cp <= 0x206f)
            || ($cp >= 0x0600 && $cp <= 0x060f)
            || $cp === 0x061b
            || ($cp >= 0x061d && $cp <= 0x061f)
            || ($cp >= 0x066a && $cp <= 0x066d)
            || $cp === 0x06d4;
    }

    private static function digitValue(int $cp): int
    {
        if ($cp >= 0x30 && $cp <= 0x39) {
            return $cp - 0x30;
        }
        if ($cp >= 0x0660 && $cp <= 0x0669) {
            return $cp - 0x0660;
        }
        if ($cp >= 0x06f0 && $cp <= 0x06f9) {
            return $cp - 0x06f0;
        }
        return -1;
    }

    private static function isArabicScript(int $cp): bool
    {
        return ($cp >= 0x0600 && $cp <= 0x06ff)
            || ($cp >= 0x0750 && $cp <= 0x077f)
            || ($cp >= 0x08a0 && $cp <= 0x08ff)
            || ($cp >= 0xfb50 && $cp <= 0xfdff)
            || ($cp >= 0xfe70 && $cp <= 0xfeff);
    }

    /** Letters of right-to-left scripts (Hebrew, Arabic, Syriac, Thaana, …). */
    private static function isRtlCodePoint(int $cp): bool
    {
        return ($cp >= 0x0590 && $cp <= 0x08ff)
            || ($cp >= 0xfb1d && $cp <= 0xfdff)
            || ($cp >= 0xfe70 && $cp <= 0xfeff)
            || ($cp >= 0x10800 && $cp <= 0x10fff)
            || ($cp >= 0x1e800 && $cp <= 0x1efff);
    }

    /** A primary weight: the group times 2^21, plus the rank within the group. */
    private static function weight(int $group, int $rank): int
    {
        return $group * 0x200000 + $rank;
    }

    /**
     * @param list<int> $chars Code points
     * @return array{0: list<int>, 1: list<int>} Primary and secondary weights
     */
    private static function collationKey(array $chars): array
    {
        if (self::$urduRank === null) {
            self::$urduRank = [];
            foreach (self::URDU_ORDER as $index => $letter) {
                $key = implode(',', array_map(self::codePoint(...), Js::codePoints($letter)));
                self::$urduRank[$key] = $index;
            }
        }
        $ranks = self::$urduRank;
        $hamzaAbove = 1 + self::DIACRITICS[0x0654];
        $primary = [];
        $secondary = [];
        $count = count($chars);
        for ($i = 0; $i < $count; $i++) {
            $cp = $chars[$i];
            $next = $chars[$i + 1] ?? null;
            if (isset(self::DIACRITICS[$cp])) {
                $secondary[] = 1 + self::DIACRITICS[$cp];
                continue;
            }
            if (self::isSkipped($cp)) {
                continue;
            }
            $base = self::HAMZA_VARIANTS[$cp] ?? null;
            $letter = $base ?? $cp;
            if ($letter === 0x0627 && $next === 0x0653) {
                $letter = 0x0622; // ا + ٓ is آ
                $i++;
                $next = $chars[$i + 1] ?? null;
            }
            $rank = $ranks[(string) $letter] ?? null;
            if ($rank !== null) {
                $joined = $ranks[$letter . ',' . 0x06be] ?? null;
                if ($next === 0x06be && $joined !== null) {
                    $primary[] = self::weight(self::GROUP_URDU, $joined);
                    $i++;
                } else {
                    $primary[] = self::weight(self::GROUP_URDU, $rank);
                }
                $secondary[] = 0;
                if ($base !== null) {
                    $secondary[] = $hamzaAbove;
                }
                continue;
            }
            $digit = self::digitValue($cp);
            if ($digit >= 0) {
                $primary[] = self::weight(self::GROUP_DIGIT, $digit);
            } elseif (self::isPunctuation($cp)) {
                $primary[] = self::weight(self::GROUP_PUNCTUATION, $cp);
            } elseif (self::isArabicScript($cp)) {
                $primary[] = self::weight(self::GROUP_OTHER_ARABIC, $cp);
            } else {
                $primary[] = self::weight(self::GROUP_OTHER, $cp >= 0x41 && $cp <= 0x5a ? $cp + 0x20 : $cp);
            }
            $secondary[] = 0;
        }
        return [$primary, $secondary];
    }

    /**
     * @param list<int> $a
     * @param list<int> $b
     */
    private static function compareLists(array $a, array $b): int
    {
        $length = min(count($a), count($b));
        for ($i = 0; $i < $length; $i++) {
            if ($a[$i] !== $b[$i]) {
                return $a[$i] < $b[$i] ? -1 : 1;
            }
        }
        return count($a) <=> count($b);
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
