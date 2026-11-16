<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * Parsed components of a Pakistani mailing address.
 */
final readonly class ParsedAddress
{
    use Internal\ToArray;

    public function __construct(
        /** The address with whitespace normalized. */
        public ?string $raw = null,
        /** First remaining segment, usually house and street. */
        public ?string $street = null,
        /** Remaining segments, usually the area or sector. */
        public ?string $area = null,
        /** City, when one was recognised. */
        public ?string $city = null,
        /** District, when one was recognised. */
        public ?string $district = null,
        /** Province, stated in the address or inferred from the city. */
        public ?string $province = null,
        /** 5-digit postal code, when present. */
        public ?string $postalCode = null,
        /** @var list<string> Inconsistencies found while parsing, e.g. a city in a different province. */
        public array $warnings = [],
    ) {
    }
}
