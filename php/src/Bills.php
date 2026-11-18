<?php

declare(strict_types=1);

namespace PakDataKit;

use PakDataKit\Internal\Js;
use PakDataKit\Internal\Unicode;

/**
 * Electricity and gas bill numbers.
 */
final class Bills
{
    /** ElectricityRef::$type of a 14-digit DISCO (WAPDA) reference number. */
    public const REFERENCE = 'reference';
    /** ElectricityRef::$type of a DISCO customer ID (10 digits, 11 for LESCO). */
    public const CUSTOMER_ID = 'customer-id';
    /** ElectricityRef::$type of a 13-digit K-Electric account number. */
    public const K_ELECTRIC = 'k-electric';

    /** Sui Northern Gas Pipelines: 11-digit consumer numbers. */
    public const SNGPL = 'SNGPL';
    /** Sui Southern Gas Company: 10-digit consumer numbers. */
    public const SSGC = 'SSGC';

    private const GAS_DIGITS = [self::SNGPL => 11, self::SSGC => 10];

    /** Separators people type inside bill numbers (JavaScript's [\s\-‐‑‒–—./]). */
    private const SEPARATORS = '/[' . Js::WS . '\-‐‑‒–—.\/]/u';

    /**
     * Parses a Pakistani electricity bill identifier: a DISCO reference
     * number (14 digits, optionally followed by `U` or `R`), a DISCO
     * customer ID (10 digits, 11 for LESCO) or a K-Electric account number
     * (13 digits starting `04000`).
     *
     * Formats are those the utilities' own bill pages ask for; see DATA.md
     * in the repository. No check digit is published, so only the format is
     * checked. Spaces, dashes and dots are ignored, and Urdu digits are
     * accepted. Returns null if the input matches none of the formats.
     * Never throws.
     */
    public static function parseElectricityRef(?string $input): ?ElectricityRef
    {
        if ($input === null) {
            return null;
        }
        $text = Unicode::upper(Js::replace(self::SEPARATORS, '', Js::toAsciiDigits($input)));
        $urbanRural = null;
        $letter = Js::match('/^([0-9]{14})([UR])\z/u', $text);
        if ($letter !== null) {
            $text = (string) $letter[1];
            $urbanRural = (string) $letter[2];
        }
        if (!Js::test('/^[0-9]+\z/u', $text)) {
            return null;
        }

        $length = strlen($text);
        if ($length === 14) {
            $formatted = substr($text, 0, 2) . ' ' . substr($text, 2, 5) . ' ' . substr($text, 7);
            return new ElectricityRef(
                self::REFERENCE,
                $text,
                $urbanRural !== null ? $formatted . ' ' . $urbanRural : $formatted,
                $urbanRural,
                null,
            );
        }
        if ($urbanRural !== null) {
            return null;
        }
        if ($length === 13 && str_starts_with($text, '04000')) {
            return new ElectricityRef(self::K_ELECTRIC, $text, $text, null, 'K-Electric');
        }
        if ($length === 10 || $length === 11) {
            return new ElectricityRef(self::CUSTOMER_ID, $text, $text, null, null);
        }
        return null;
    }

    /** Validates a Pakistani electricity bill identifier. See parseElectricityRef(). Never throws. */
    public static function validateElectricityRef(?string $input): bool
    {
        return self::parseElectricityRef($input) !== null;
    }

    /**
     * Validates a gas bill consumer number: 11 digits for SNGPL, 10 digits
     * for SSGC, as their bill pages ask for (see DATA.md in the repository).
     * No check digit is published, so only the format is checked. The
     * company is `SNGPL` or `SSGC` (any case); anything else returns false.
     * Never throws.
     */
    public static function validateGasConsumerNumber(?string $input, ?string $company): bool
    {
        if ($input === null || $company === null) {
            return false;
        }
        $digits = self::GAS_DIGITS[Unicode::upper($company)] ?? null;
        if ($digits === null) {
            return false;
        }
        $text = Js::replace(self::SEPARATORS, '', Js::toAsciiDigits($input));
        return strlen($text) === $digits && Js::test('/^[0-9]+\z/u', $text);
    }
}
