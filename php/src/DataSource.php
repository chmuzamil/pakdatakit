<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * The source of the dated record a result was calculated from: which
 * dataset, the period that record applies to, and the law or notification
 * behind it.
 */
final readonly class DataSource
{
    use Internal\ToArray;

    public function __construct(
        /** The dataset's id, as in PakData::getDataInfo(), e.g. `income-tax-slabs`. */
        public string $id,
        /** First date the record applies to (`YYYY-MM-DD`). */
        public string $effectiveFrom,
        /** Last date it applies to (`YYYY-MM-DD`), or null while it is current. */
        public ?string $effectiveTo,
        /** The law, SRO, circular or notification, as written in the source. */
        public string $sourceReference,
        /** The official document. */
        public string $sourceUrl,
    ) {
    }
}
