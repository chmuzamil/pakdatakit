<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * Where a bundled dataset comes from and which period it covers: one entry
 * of the repository's `data/manifest.json`. See PakData::getDataInfo().
 */
final readonly class DataInfo
{
    use Internal\ToArray;

    public function __construct(
        /** The dataset's id, e.g. `income-tax-slabs`. */
        public string $id,
        /** Its file in the repository's `data/`, e.g. `income-tax-slabs.json`. */
        public string $file,
        /** What the dataset is, e.g. `Income tax on salary`. */
        public string $title,
        /** The body that publishes the source, e.g. `Federal Board of Revenue (FBR)`. */
        public string $issuer,
        /** The official document or page the data is taken from. */
        public string $sourceUrl,
        /** Its number or title: an SRO, circular, notification or table. */
        public string $sourceReference,
        /** When the source was issued (`YYYY`, `YYYY-MM` or `YYYY-MM-DD`), or null if it is undated. */
        public ?string $sourceDate,
        /** When the source was last downloaded (`YYYY-MM-DD`). */
        public string $retrievedAt,
        /** When the data was last checked against the source (`YYYY-MM-DD`). */
        public string $checkedAt,
        /** First date the data applies to (`YYYY`, `YYYY-MM` or `YYYY-MM-DD`). */
        public string $effectiveFrom,
        /** Last date it applies to, or null while it is current. */
        public ?string $effectiveTo,
        /** What it covers, e.g. `Tax years 2020-2027`. */
        public string $coverage,
        /** Number of records in the file. */
        public int $recordCount,
        /** When the source is next expected to change (`YYYY-MM-DD`). */
        public string $nextExpectedUpdate,
        /** What triggers an update, e.g. `After the Finance Act each July`. */
        public string $updateCadence,
        /** Anything else worth knowing about the data. */
        public string $notes,
    ) {
    }
}
