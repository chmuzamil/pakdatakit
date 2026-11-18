<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * One standard sales tax rate and the period it applied.
 */
final readonly class SalesTaxRate
{
    use Internal\ToArray;

    public function __construct(
        /** `goods` (federal sales tax) or `services` (provincial or ICT). */
        public string $kind,
        /** `FBR`, `PRA`, `SRB`, `KPRA` or `BRA`. FBR also collects ICT's tax on services. */
        public string $authority,
        /** For services: the province or `Islamabad Capital Territory`. Null for goods. */
        public ?string $province,
        /** Percent, e.g. `18`. */
        public int|float $rate,
        /** First day it applied (`YYYY-MM-DD`). Coverage starts on 1 July 2019. */
        public string $from,
        /** Last day it applied (`YYYY-MM-DD`), or null if it still applies. */
        public ?string $to,
        /** The law that sets it. */
        public string $law,
        /** Official document. */
        public string $source,
    ) {
    }
}
