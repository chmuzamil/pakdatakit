<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * Who announced 1 Ramazan for a Zakat year, and where the announcement was
 * reported (ZakatNisab::$ramazan1Source).
 */
final readonly class ZakatRamazan1Source
{
    public function __construct(
        /** Who announced it: `Central Ruet-e-Hilal Committee`. */
        public string $announcedBy,
        /** The outlet that reported the announcement, e.g. `Dawn`. */
        public string $reportedBy,
        /** The report's date (`YYYY-MM-DD`), or null if not recorded. */
        public ?string $reportedOn,
        /** The report's URL, or null where none is recorded. */
        public ?string $url = null,
    ) {
    }

    /**
     * The public properties as an array with the npm package's keys; `url`
     * is left out when none is recorded, as the npm package does.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $fields = [
            'announcedBy' => $this->announcedBy,
            'reportedBy' => $this->reportedBy,
            'reportedOn' => $this->reportedOn,
        ];
        if ($this->url !== null) {
            $fields['url'] = $this->url;
        }
        return $fields;
    }
}
