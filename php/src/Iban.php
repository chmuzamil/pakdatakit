<?php

declare(strict_types=1);

namespace PakDataKit;

use PakDataKit\Internal\Data;
use PakDataKit\Internal\Js;
use PakDataKit\Internal\Unicode;

/**
 * Pakistani IBAN validation and bank lookup.
 */
final class Iban
{
    private const PATTERN = '/^PK[0-9]{2}[A-Z]{4}[A-Z0-9]{16}\z/u';
    private const BANK_CODE = '/^[A-Z]{4}\z/u';

    /** @var array<string, BankInfo>|null */
    private static ?array $banks = null;

    /**
     * Validates a 24-character `PK` IBAN: format and ISO 13616 mod-97
     * checksum. Spaces and dashes are ignored; lowercase is accepted. Never
     * throws.
     */
    public static function validate(?string $iban): bool
    {
        $normalized = self::normalize($iban ?? '');
        if (!Js::test(self::PATTERN, $normalized)) {
            return false;
        }
        // Mod 97 one digit at a time, so the running value stays far below
        // PHP_INT_MAX.
        $remainder = 0;
        foreach (str_split(substr($normalized, 4) . substr($normalized, 0, 4)) as $char) {
            if ($char >= 'A' && $char <= 'Z') {
                $value = ord($char) - 55;
                $remainder = ($remainder * 10 + intdiv($value, 10)) % 97;
                $remainder = ($remainder * 10 + $value % 10) % 97;
            } else {
                $remainder = ($remainder * 10 + (int) $char) % 97;
            }
        }
        return $remainder === 1;
    }

    /** Returns the bank name for a valid IBAN, or null. */
    public static function getBank(?string $iban): ?string
    {
        if (!self::validate($iban)) {
            return null;
        }
        return (self::bankMap()[substr(self::normalize($iban ?? ''), 4, 4)] ?? null)?->name;
    }

    /**
     * Returns details of the bank that issued an IBAN: name, type and whether
     * it still exists. Also accepts a 4-letter bank code such as `MEZN`.
     * Returns null if the IBAN is invalid or the code unknown.
     */
    public static function getBankInfo(?string $ibanOrCode): ?BankInfo
    {
        $value = self::normalize($ibanOrCode ?? '');
        if (Js::test(self::BANK_CODE, $value)) {
            return self::bankMap()[$value] ?? null;
        }
        return self::validate($value) ? (self::bankMap()[substr($value, 4, 4)] ?? null) : null;
    }

    /**
     * Lists every bank code in the dataset, including merged banks and older
     * alias codes. For a bank picker, keep those that are active and have no
     * aliasOf.
     *
     * @return list<BankInfo>
     */
    public static function getBanks(): array
    {
        return array_values(self::bankMap());
    }

    /** @internal */
    public static function normalize(string $iban): string
    {
        return Unicode::upper(Js::stripSeparators($iban));
    }

    /** @return array<string, BankInfo> */
    private static function bankMap(): array
    {
        if (self::$banks === null) {
            self::$banks = [];
            foreach (Data::load('banks') as $entry) {
                self::$banks[$entry['code']] = new BankInfo(
                    code: $entry['code'],
                    name: $entry['name'],
                    type: $entry['type'],
                    active: !isset($entry['mergedInto']) && ($entry['active'] ?? true) !== false,
                    mergedInto: $entry['mergedInto'] ?? null,
                    aliasOf: $entry['aliasOf'] ?? null,
                    status: $entry['status'],
                    website: $entry['website'] ?? null,
                    websiteSbpListed: $entry['websiteSbpListed'] ?? null,
                    swift: $entry['swift'] ?? null,
                    swiftSource: isset($entry['swiftSource']) ? new BankSwiftSource(
                        bicSource: $entry['swiftSource']['bicSource'],
                        printed: $entry['swiftSource']['printed'],
                        sourceUrl: $entry['swiftSource']['sourceUrl'],
                        page: $entry['swiftSource']['page'] ?? null,
                        checkedAt: $entry['swiftSource']['checkedAt'],
                    ) : null,
                    swiftReason: $entry['swiftReason'] ?? null,
                );
            }
        }
        return self::$banks;
    }
}
