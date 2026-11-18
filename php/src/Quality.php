<?php

declare(strict_types=1);

namespace PakDataKit;

use PakDataKit\Internal\Js;
use PakDataKit\Internal\Unicode;

/**
 * Delivery-quality checks for cash on delivery and other courier use: how
 * complete an address is, and whether a phone number looks reachable.
 */
final class Quality
{
    /**
     * Points for each part of an address (an AddressPart: `city`,
     * `houseNumber`, `street`, `area`, `postalCode`, `landmark`). They add up
     * to 100. A postal code scores in full only when it is a known post
     * office code; an unknown one scores 5.
     */
    public const ADDRESS_WEIGHTS = [
        'city' => 30,
        'houseNumber' => 20,
        'street' => 15,
        'area' => 10,
        'postalCode' => 15,
        'landmark' => 10,
    ];

    private const UNKNOWN_POSTAL_CODE_POINTS = 5;

    /** Taken off when the post office and the city are in different provinces. */
    private const MISMATCH_PENALTY = 15;

    /** Words that introduce a landmark, in English and Roman Urdu. */
    private const LANDMARK_WORDS = [
        'near', 'nr', 'opposite', 'opp', 'behind', 'beside', 'besides', 'adjacent', 'next to', 'in front of',
        'facing', 'nazd', 'nazdeek', 'nazdik', 'qareeb', 'qarib', 'kareeb', 'samne', 'saamne', 'samnay',
        'peeche', 'peechay', 'pichay', 'bil muqabil', 'bilmuqabil', 'muttasil', 'mutasil',
    ];

    /** The same, in Urdu script. */
    private const URDU_LANDMARK_WORDS = ['نزد', 'نزدیک', 'قریب', 'سامنے', 'پیچھے', 'بالمقابل', 'متصل'];

    /** Words that name a street or lane. */
    private const STREET_WORDS = [
        'street', 'st', 'road', 'rd', 'lane', 'gali', 'avenue', 'ave', 'boulevard', 'blvd', 'chowk', 'bazar',
        'bazaar', 'mohalla', 'muhalla',
    ];

    private const URDU_STREET_WORDS = ['گلی', 'سڑک', 'روڈ', 'محلہ', 'چوک', 'بازار'];

    /** Words that name an area within a city. */
    private const AREA_WORDS = [
        'block', 'sector', 'phase', 'town', 'colony', 'society', 'scheme', 'housing', 'garden', 'gardens', 'park',
        'estate', 'abad', 'nagar', 'cantt', 'cantonment',
    ];

    private const URDU_AREA_WORDS = ['بلاک', 'سیکٹر', 'فیز', 'ٹاؤن', 'کالونی', 'سوسائٹی'];

    private const ASCENDING = '01234567890';
    private const DESCENDING = '09876543210';

    /**
     * Scores how complete a free-form Pakistani delivery address is, for
     * cash on delivery and other courier use.
     *
     * Built on Address::parse(). It looks for a city, a house, plot or flat
     * number, a street, an area, a postal code and a landmark ("near",
     * "opp", "nazd", "qareeb", "سامنے" …), and adds up ADDRESS_WEIGHTS. A
     * postal code that is a known post office raises the score more than an
     * unknown one, and a post office in a different province from the city
     * lowers it (with a warning in `parsed->warnings`).
     *
     * This is a heuristic: it says how much an address tells a rider, not
     * whether the address exists. Never throws.
     */
    public static function scoreAddress(?string $address): AddressScore
    {
        $text = Js::normalizeWhitespace($address ?? '');
        $parsed = Address::parse($text);
        $found = [];
        $lowered = self::words($text);
        $postal = $parsed->postalCode;
        // The text without the postal code, for the house-number check.
        $rest = $lowered;
        if ($postal !== null) {
            $at = strpos($lowered, ' ' . $postal . ' ');
            if ($at !== false) {
                $rest = substr_replace($lowered, ' ', $at, strlen($postal) + 2);
            }
        }

        if ($parsed->city !== null) {
            $found['city'] = true;
        }
        // A number other than the postal code: house, plot, flat or street
        // number ("12", "12b", "4th").
        if (Js::test('/ [0-9]+[a-z]{0,2} /u', $rest)) {
            $found['houseNumber'] = true;
        }
        if (self::hasWord($lowered, self::STREET_WORDS) || self::hasUrdu($text, self::URDU_STREET_WORDS)) {
            $found['street'] = true;
        }
        if (
            $parsed->area !== null
            || self::hasWord($lowered, self::AREA_WORDS)
            || self::hasUrdu($text, self::URDU_AREA_WORDS)
        ) {
            $found['area'] = true;
        }
        if (self::hasWord($lowered, self::LANDMARK_WORDS) || self::hasUrdu($text, self::URDU_LANDMARK_WORDS)) {
            $found['landmark'] = true;
        }

        $score = 0;
        $warnings = $parsed->warnings;
        foreach (array_keys($found) as $part) {
            $score += self::ADDRESS_WEIGHTS[$part];
        }

        if ($postal !== null) {
            $office = Postal::getPostOffice($postal);
            if ($office === null) {
                $score += self::UNKNOWN_POSTAL_CODE_POINTS;
            } else {
                $found['postalCode'] = true;
                $score += self::ADDRESS_WEIGHTS['postalCode'];
                if ($parsed->province !== null && $office->province !== $parsed->province) {
                    $score -= self::MISMATCH_PENALTY;
                    $warnings[] = 'Postal code ' . $postal . ' is in ' . $office->province
                        . ', but the address is in ' . $parsed->province;
                }
            }
        }

        $missing = [];
        foreach (array_keys(self::ADDRESS_WEIGHTS) as $part) {
            if (!isset($found[$part])) {
                $missing[] = $part;
            }
        }

        return new AddressScore(
            score: max(0, min(100, $score)),
            missing: $missing,
            parsed: new ParsedAddress(
                raw: $parsed->raw,
                street: $parsed->street,
                area: $parsed->area,
                city: $parsed->city,
                district: $parsed->district,
                province: $parsed->province,
                postalCode: $parsed->postalCode,
                warnings: $warnings,
            ),
        );
    }

    /**
     * Flags a phone number that a courier cannot reach by SMS or call, or
     * that looks made up (a PhoneRiskFlag). Pure heuristics on the number
     * itself: no list of real numbers, no personal data, no network call.
     *
     * - `invalid`: not a Pakistani phone number.
     * - `landline`: a fixed-line number (no SMS, often unanswered).
     * - `not-mobile`: a UAN, toll-free or other service number.
     * - `repeated-digits`: the 7-digit subscriber part uses at most two
     *   different digits (`0300-0000000`, `0300-1111112`).
     * - `sequential-digits`: the subscriber part is a run such as `1234567`
     *   or `7654321`.
     * - `test-number`: a placeholder often typed into forms
     *   (`03XX-1234567`, `03XX-7654321`, `0312-3456789`).
     *
     * A valid mobile number with nothing suspicious returns `[]`. Never
     * throws.
     *
     * @return list<string>
     */
    public static function phoneRiskSignals(?string $phone): array
    {
        $info = $phone === null ? null : Numbers::analyze($phone);
        if ($info === null) {
            return ['invalid'];
        }
        if ($info->type === 'landline') {
            return ['landline'];
        }
        if ($info->type !== 'mobile' || $info->e164 === null) {
            return ['not-mobile'];
        }

        $national = substr($info->e164, 3); // 3XXXXXXXXX
        $subscriber = substr($national, 3);
        $flags = [];
        if (count(array_unique(str_split($subscriber))) <= 2) {
            $flags[] = 'repeated-digits';
        }
        if (str_contains(self::ASCENDING, $subscriber) || str_contains(self::DESCENDING, $subscriber)) {
            $flags[] = 'sequential-digits';
        }
        if ($subscriber === '1234567' || $subscriber === '7654321' || $national === '3123456789') {
            $flags[] = 'test-number';
        }
        return $flags;
    }

    /** Lower-cases, folds Urdu digits and collapses everything but letters and digits to single spaces. */
    private static function words(string $text): string
    {
        $lowered = Unicode::lower(Js::toAsciiDigits($text));
        return ' ' . Js::trim(Js::replace('/[^a-z0-9\x{600}-\x{6ff}]+/u', ' ', $lowered)) . ' ';
    }

    /** @param list<string> $list */
    private static function hasWord(string $haystack, array $list): bool
    {
        foreach ($list as $word) {
            if (str_contains($haystack, ' ' . $word . ' ')) {
                return true;
            }
        }
        return false;
    }

    /** @param list<string> $list */
    private static function hasUrdu(string $text, array $list): bool
    {
        foreach ($list as $word) {
            if (str_contains($text, $word)) {
                return true;
            }
        }
        return false;
    }
}
