<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * A sale type as PRAL's DI specification names it, with its sandbox
 * scenarios. See FbrInvoice::getSaleTypes().
 */
final readonly class FbrSaleType
{
    use Internal\ToArray;

    public function __construct(
        /** The sale type, e.g. `Goods at Standard Rate (default)`. */
        public string $saleType,
        /** @var list<string> The specification's sandbox scenarios (SN001-SN028) that use it. */
        public array $scenarioIds,
    ) {
    }
}
