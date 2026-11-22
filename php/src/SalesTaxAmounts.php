<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * Result of SalesTax::calculate() and SalesTax::splitInclusive(), in rupees.
 * `net + tax` is always `gross`, to the paisa.
 */
final readonly class SalesTaxAmounts
{
    use Internal\ToArray {
        toArray as private allFields;
    }

    public function __construct(
        /** Value excluding tax, in rupees (2 decimals at most). */
        public float $net,
        /** The tax, in rupees. */
        public float $tax,
        /** Value including tax, in rupees. */
        public float $gross,
        /** Percent used. */
        public float $rate,
        /**
         * The rate's period, law and official source, when SalesTax::calculate()
         * looked the rate up from a province or kind. Null when you passed the
         * `rate` yourself, and from splitInclusive().
         */
        public ?DataSource $source = null,
    ) {
    }

    /**
     * The public properties as an array with the npm package's keys;
     * `source` is left out when it is null, as the npm package does.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $fields = $this->allFields();
        if ($this->source === null) {
            unset($fields['source']);
        }
        return $fields;
    }
}
