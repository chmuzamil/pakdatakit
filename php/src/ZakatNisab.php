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
        /** The valuation date in the Hijri calendar, e.g. `1 Ramazan 1447 AH`. */
        public string $valuationDateHijri,
        /**
         * The valuation date: 1 Ramazan in the Gregorian calendar
         * (`YYYY-MM-DD`), as announced by the Central Ruet-e-Hilal Committee.
         * Zakat years are assigned to dates by it.
         */
        public string $ramazan1,
        /** Who announced 1 Ramazan, and where the announcement was reported. */
        public ZakatRamazan1Source $ramazan1Source,
        /**
         * The deduction day: the bank holiday SBP declares for it
         * (`YYYY-MM-DD`). It is `ramazan1`, or the next working day when 1
         * Ramazan falls on a weekend or public holiday (for example 24 March
         * 2023, after Pakistan Day). Null where no SBP holiday circular was
         * found.
         */
        public ?string $bankHolidayDate,
        /** The Ministry of Poverty Alleviation & Social Safety notification. */
        public ZakatDocument $notification,
        /** The SBP BPRD circular letter that conveys it to banks. */
        public ZakatDocument $sbpCircular,
        /** Notes on the documents, including the notification's "likely to fall on" text, or null. */
        public ?string $note,
        /** The notification and SBP circular, with the period the nisab applies to. */
        public DataSource $source,
    ) {
    }
}
