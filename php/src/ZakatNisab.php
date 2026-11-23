<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * One Zakat year's nisab for deduction at source, as notified. Returned by
 * Zakat::getNisab().
 */
final readonly class ZakatNisab
{
    use Internal\ToArray;

    public function __construct(
        /** The Hijri year of the valuation date (1 Ramazan), e.g. `1447`. */
        public int $zakatYear,
        /** The year as the Ministry's notification writes it, e.g. `1446-47`. */
        public string $label,
        /** Nisab in rupees: accounts with a lower balance are not deducted. */
        public int $nisab,
        /** The valuation (deduction) date in the Hijri calendar, e.g. `1 Ramazan 1447 AH`. */
        public string $valuationDateHijri,
        /**
         * @var array{string, string} The two Gregorian dates the notification
         * says 1 Ramazan is likely to fall on (`YYYY-MM-DD`). The day itself
         * depends on the moon sighting.
         */
        public array $expectedValuationDates,
        /**
         * The confirmed Gregorian date of 1 Ramazan (`YYYY-MM-DD`), where a
         * source states it; otherwise null.
         */
        public ?string $valuationDate,
        /** The source that confirms `valuationDate`, or null. */
        public ?ZakatValuationDateSource $valuationDateSource,
        /**
         * The bank holiday for the deduction (`YYYY-MM-DD`), when SBP's
         * circular names a Gregorian date; otherwise null.
         */
        public ?string $bankHolidayDate,
        /** The Ministry of Poverty Alleviation & Social Safety notification. */
        public ZakatDocument $notification,
        /** The SBP BPRD circular letter that conveys it to banks. */
        public ZakatDocument $sbpCircular,
        /** The notification and SBP circular, with the period the nisab applies to. */
        public DataSource $source,
    ) {
    }
}
