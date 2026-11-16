<?php

declare(strict_types=1);

namespace PakDataKit;

use InvalidArgumentException;
use PakDataKit\Internal\Js;

/**
 * Numbers and rupee amounts in words (English and Urdu, lakh/crore scale).
 */
final class Words
{
    // Pakistani scale words, largest first.
    private const SCALES = [
        [100_000_000_000, 'kharab', 'کھرب'],
        [1_000_000_000, 'arab', 'ارب'],
        [10_000_000, 'crore', 'کروڑ'],
        [100_000, 'lakh', 'لاکھ'],
        [1_000, 'thousand', 'ہزار'],
        [100, 'hundred', 'سو'],
    ];

    private const EN_ONES = [
        'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven',
        'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
    ];

    private const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    // Urdu has a distinct word for every number from 0 to 99.
    private const UR_0_TO_99 = 'صفر ایک دو تین چار پانچ چھ سات آٹھ نو '
        . 'دس گیارہ بارہ تیرہ چودہ پندرہ سولہ سترہ اٹھارہ انیس '
        . 'بیس اکیس بائیس تئیس چوبیس پچیس چھبیس ستائیس اٹھائیس انتیس '
        . 'تیس اکتیس بتیس تینتیس چونتیس پینتیس چھتیس سینتیس اڑتیس انتالیس '
        . 'چالیس اکتالیس بیالیس تینتالیس چوالیس پینتالیس چھیالیس سینتالیس اڑتالیس انچاس '
        . 'پچاس اکاون باون ترپن چون پچپن چھپن ستاون اٹھاون انسٹھ '
        . 'ساٹھ اکسٹھ باسٹھ ترسٹھ چونسٹھ پینسٹھ چھیاسٹھ سڑسٹھ اڑسٹھ انہتر '
        . 'ستر اکہتر بہتر تہتر چوہتر پچھتر چھہتر ستتر اٹھہتر اناسی '
        . 'اسی اکیاسی بیاسی تراسی چوراسی پچاسی چھیاسی ستاسی اٹھاسی نواسی '
        . 'نوے اکانوے بانوے ترانوے چورانوے پچانوے چھیانوے ستانوے اٹھانوے ننانوے';

    /** @var list<string>|null */
    private static ?array $urdu = null;

    /**
     * Converts a whole number to words using hundred, thousand, lakh, crore,
     * arab and kharab: `125000` gives `one lakh twenty-five thousand`.
     *
     * @param string $language `en` (default) or `ur`
     * @throws InvalidArgumentException if the number is not a safe integer
     *     (a whole number between ±9,007,199,254,740,991), or the language is
     *     not `en` or `ur`
     */
    public static function numberToWords(int|float $number, string $language = 'en'): string
    {
        self::assertLanguage($language);
        if (!Js::isSafeInteger($number)) {
            throw new InvalidArgumentException('Expected a safe integer');
        }
        $n = (int) $number;
        if ($n === 0) {
            return self::underHundred(0, $language);
        }
        $words = implode(' ', self::convert(abs($n), $language));
        if ($n > 0) {
            return $words;
        }
        return $language === 'ur' ? 'منفی ' . $words : 'minus ' . $words;
    }

    /**
     * Writes a rupee amount in words, with paisa, rounded to the nearest
     * paisa. With `$cheque`, `125000` gives
     * `Rupees One Lakh Twenty-Five Thousand Only`.
     *
     * @param string $language `en` (default) or `ur`
     * @throws InvalidArgumentException if the amount is negative, not finite
     *     or too large, or the language is not `en` or `ur`
     */
    public static function amountInWords(int|float $amount, string $language = 'en', bool $cheque = false): string
    {
        self::assertLanguage($language);
        $amount = (float) $amount;
        if (!is_finite($amount) || $amount < 0) {
            throw new InvalidArgumentException('Amount must be a finite number of zero or more');
        }
        $totalPaisa = Js::round($amount * 100);
        $rupees = floor($totalPaisa / 100);
        $paisa = fmod($totalPaisa, 100);
        $rupeeWords = self::numberToWords($rupees, $language);
        $paisaWords = $paisa > 0 ? self::numberToWords($paisa, $language) : null;

        if ($language === 'ur') {
            $text = $rupeeWords . ' روپے';
            if ($paisaWords !== null) {
                $text .= ' اور ' . $paisaWords . ' پیسے';
            }
            return $cheque ? $text . ' صرف' : $text;
        }

        if ($cheque) {
            $paisaPart = $paisaWords !== null ? ' and ' . $paisaWords . ' paisa' : '';
            $title = Js::replaceCallback(
                '/(^|[' . Js::WS . '-])([a-z])/u',
                static fn (array $m): string => $m[1] . strtoupper($m[2]),
                'rupees ' . $rupeeWords . $paisaPart . ' only',
            );
            $index = strpos($title, ' And ');
            return $index === false ? $title : substr($title, 0, $index) . ' and ' . substr($title, $index + 5);
        }

        $text = $rupeeWords . ' ' . ($rupees == 1.0 ? 'rupee' : 'rupees');
        if ($paisaWords !== null) {
            $text .= ' and ' . $paisaWords . ' paisa';
        }
        return $text;
    }

    /** numberToWords() without throwing: null where it would throw. */
    public static function tryNumberToWords(int|float $number, string $language = 'en'): ?string
    {
        try {
            return self::numberToWords($number, $language);
        } catch (InvalidArgumentException) {
            return null;
        }
    }

    /** amountInWords() without throwing: null where it would throw. */
    public static function tryAmountInWords(int|float $amount, string $language = 'en', bool $cheque = false): ?string
    {
        try {
            return self::amountInWords($amount, $language, $cheque);
        } catch (InvalidArgumentException) {
            return null;
        }
    }

    private static function assertLanguage(string $language): void
    {
        if ($language !== 'en' && $language !== 'ur') {
            throw new InvalidArgumentException("language must be 'en' or 'ur', received " . $language);
        }
    }

    private static function underHundred(int $n, string $language): string
    {
        if ($language === 'ur') {
            self::$urdu ??= explode(' ', self::UR_0_TO_99);
            return self::$urdu[$n];
        }
        if ($n < 20) {
            return self::EN_ONES[$n];
        }
        $tens = self::EN_TENS[intdiv($n, 10)];
        return $n % 10 === 0 ? $tens : $tens . '-' . self::EN_ONES[$n % 10];
    }

    /** @return list<string> */
    private static function convert(int $n, string $language): array
    {
        foreach (self::SCALES as [$value, $en, $ur]) {
            if ($n < $value) {
                continue;
            }
            $words = self::convert(intdiv($n, $value), $language);
            $words[] = $language === 'ur' ? $ur : $en;
            $rest = $n % $value;
            return $rest > 0 ? array_merge($words, self::convert($rest, $language)) : $words;
        }
        return [self::underHundred($n, $language)];
    }
}
