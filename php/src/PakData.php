<?php

declare(strict_types=1);

namespace PakDataKit;

use PakDataKit\Internal\Data;

/**
 * Information about the bundled datasets.
 */
final class PakData
{
    /** Version of this package. */
    public const PACKAGE_VERSION = '2.8.0';

    /** @var array<string, DataInfo>|null The manifest entries by id, in id order. */
    private static ?array $manifest = null;

    /**
     * Date (`YYYY-MM-DD`) the bundled datasets were last checked against
     * their sources. Same value as `dataVersion` in the npm package; see
     * DATA.md in the repository.
     */
    public static function version(): string
    {
        return Data::load('data-version');
    }

    /**
     * Where a bundled dataset comes from: the issuer, the official source and
     * its reference and date, when it was checked, the period it covers, its
     * record count and when it is next expected to change.
     *
     * ```php
     * PakData::getDataInfo('income-tax-slabs')?->coverage; // 'Tax years 2020-2027'
     * PakData::getDataInfo('income-tax-slabs')?->nextExpectedUpdate; // '2027-07-15'
     * ```
     *
     * @param mixed $id A dataset id, such as `banks`, `income-tax-slabs` or
     *   `sales-tax-rates` (see listDataInfo()); matched exactly
     * @return DataInfo|null The manifest entry, or null for an unknown id or
     *   a value that is not a string. Never throws.
     */
    public static function getDataInfo(mixed $id): ?DataInfo
    {
        if (!is_string($id)) {
            return null;
        }
        return self::manifest()[$id] ?? null;
    }

    /**
     * Every bundled dataset's manifest entry, as getDataInfo() returns them,
     * in id order.
     *
     * ```php
     * array_map(fn ($d) => $d->id, PakData::listDataInfo()); // ['area-codes', 'banks', …]
     * ```
     *
     * @return list<DataInfo>
     */
    public static function listDataInfo(): array
    {
        return array_values(self::manifest());
    }

    /** @return array<string, DataInfo> */
    private static function manifest(): array
    {
        if (self::$manifest === null) {
            $entries = [];
            foreach (Data::load('manifest') as $entry) {
                $entries[(string) $entry['id']] = new DataInfo(
                    id: $entry['id'],
                    file: $entry['file'],
                    title: $entry['title'],
                    issuer: $entry['issuer'],
                    sourceUrl: $entry['sourceUrl'],
                    sourceReference: $entry['sourceReference'],
                    sourceDate: $entry['sourceDate'],
                    retrievedAt: $entry['retrievedAt'],
                    checkedAt: $entry['checkedAt'],
                    effectiveFrom: $entry['effectiveFrom'],
                    effectiveTo: $entry['effectiveTo'],
                    coverage: $entry['coverage'],
                    recordCount: $entry['recordCount'],
                    nextExpectedUpdate: $entry['nextExpectedUpdate'],
                    updateCadence: $entry['updateCadence'],
                    notes: $entry['notes'],
                );
            }
            uksort($entries, strcmp(...));
            self::$manifest = $entries;
        }
        return self::$manifest;
    }
}
