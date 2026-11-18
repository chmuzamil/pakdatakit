<?php

declare(strict_types=1);

namespace PakDataKit;

use PakDataKit\Internal\Data;
use PakDataKit\Internal\Js;

/**
 * Helpers for orders shipped with Pakistani couriers: one status vocabulary
 * for the couriers' own statuses, and city names as customers and couriers
 * write them. There are no API clients: nothing is sent anywhere.
 */
final class Courier
{
    /** Courier names, as mapStatus() accepts them. */
    public const TCS = 'TCS';
    public const LEOPARDS = 'Leopards';
    public const POSTEX = 'PostEx';
    public const MNP = 'M&P';
    public const TRAX = 'Trax';
    public const BLUEEX = 'BlueEx';

    /**
     * Statuses mapStatus() returns, from order to delivery or return.
     * Experimental: the values may change in a minor release while more
     * couriers' status lists are added.
     */
    public const PENDING = 'pending';
    public const BOOKED = 'booked';
    public const PICKED_UP = 'picked-up';
    public const IN_TRANSIT = 'in-transit';
    public const OUT_FOR_DELIVERY = 'out-for-delivery';
    public const ATTEMPTED = 'attempted';
    public const UNDER_REVIEW = 'under-review';
    public const DELIVERED = 'delivered';
    public const RETURNING = 'returning';
    public const RETURNED = 'returned';
    public const CANCELLED = 'cancelled';

    /**
     * Status values each courier documents publicly, by normalised key
     * (lower case, single spaces, straight apostrophes). Only documented
     * values are listed; anything else maps to null.
     *
     * - PostEx: "Merchant API Integration Guide" M- v4.1.9, order status IDs
     *   (§3.15) and tracking history codes (§3.8).
     * - Leopards: "Returned to Shipper", from its e-commerce FAQ.
     * - TCS, M&P, Trax and BlueEx publish no status list outside their
     *   merchant portals, so nothing is mapped for them.
     */
    private const STATUSES = [
        self::POSTEX => [
            // Order status IDs and names (§3.15).
            '1' => self::PENDING,
            'unbooked' => self::PENDING,
            '2' => self::BOOKED,
            'booked' => self::BOOKED,
            '3' => self::IN_TRANSIT,
            'postex warehouse' => self::IN_TRANSIT,
            '4' => self::OUT_FOR_DELIVERY,
            'out for delivery' => self::OUT_FOR_DELIVERY,
            '5' => self::DELIVERED,
            'delivered' => self::DELIVERED,
            '6' => self::RETURNED,
            'returned' => self::RETURNED,
            '7' => self::CANCELLED,
            'un-assigned by me' => self::CANCELLED,
            '8' => self::CANCELLED,
            'expired' => self::CANCELLED,
            '9' => self::UNDER_REVIEW,
            'delivery under review' => self::UNDER_REVIEW,
            '15' => self::PICKED_UP,
            'picked by postex' => self::PICKED_UP,
            '16' => self::RETURNING,
            'out for return' => self::RETURNING,
            '17' => self::ATTEMPTED,
            'attempted' => self::ATTEMPTED,
            '18' => self::IN_TRANSIT,
            'en-route to postex warehouse' => self::IN_TRANSIT,
            // Tracking history codes and messages (§3.8).
            '0001' => self::BOOKED,
            "at merchant's warehouse" => self::BOOKED,
            '0002' => self::RETURNED,
            '0003' => self::IN_TRANSIT,
            'at postex warehouse' => self::IN_TRANSIT,
            '0004' => self::IN_TRANSIT,
            'package on root' => self::IN_TRANSIT,
            'package on route' => self::IN_TRANSIT,
            '0005' => self::DELIVERED,
            '0006' => self::RETURNED,
            '0007' => self::RETURNED,
            '0008' => self::UNDER_REVIEW,
            '0013' => self::ATTEMPTED,
        ],
        self::LEOPARDS => [
            'returned to shipper' => self::RETURNED,
        ],
        self::TCS => [],
        self::MNP => [],
        self::TRAX => [],
        self::BLUEEX => [],
    ];

    /** Accepted spellings of each courier's name. */
    private const COURIER_NAMES = [
        'tcs' => self::TCS,
        'leopards' => self::LEOPARDS,
        'leopards courier' => self::LEOPARDS,
        'lcs' => self::LEOPARDS,
        'postex' => self::POSTEX,
        'm&p' => self::MNP,
        'mnp' => self::MNP,
        'm and p' => self::MNP,
        'muller & phipps' => self::MNP,
        'muller and phipps' => self::MNP,
        'trax' => self::TRAX,
        'blueex' => self::BLUEEX,
        'blue ex' => self::BLUEEX,
        'blue-ex' => self::BLUEEX,
    ];

    /**
     * Short forms and old names of cities, as people and courier forms write
     * them: airport and dialling-style codes, Roman Urdu spellings, the
     * former name Lyallpur, and Urdu script.
     */
    private const CITY_ALIASES = [
        'lhr' => 'Lahore',
        'lhe' => 'Lahore',
        'lahor' => 'Lahore',
        'لاہور' => 'Lahore',
        'khi' => 'Karachi',
        'krachi' => 'Karachi',
        'کراچی' => 'Karachi',
        'pindi' => 'Rawalpindi',
        'rwp' => 'Rawalpindi',
        'rawal pindi' => 'Rawalpindi',
        'راولپنڈی' => 'Rawalpindi',
        'isb' => 'Islamabad',
        'isl' => 'Islamabad',
        'اسلام آباد' => 'Islamabad',
        'lyallpur' => 'Faisalabad',
        'lyp' => 'Faisalabad',
        'fsd' => 'Faisalabad',
        'faisal abad' => 'Faisalabad',
        'فیصل آباد' => 'Faisalabad',
        'mux' => 'Multan',
        'mtn' => 'Multan',
        'ملتان' => 'Multan',
        'pew' => 'Peshawar',
        'psh' => 'Peshawar',
        'پشاور' => 'Peshawar',
        'uet' => 'Quetta',
        'qta' => 'Quetta',
        'کوئٹہ' => 'Quetta',
        'hyd' => 'Hyderabad',
        'حیدرآباد' => 'Hyderabad',
        'حیدر آباد' => 'Hyderabad',
        'skt' => 'Sialkot',
        'سیالکوٹ' => 'Sialkot',
        'grw' => 'Gujranwala',
        'گوجرانوالہ' => 'Gujranwala',
        'dgk' => 'Dera Ghazi Khan',
        'dg khan' => 'Dera Ghazi Khan',
        'd g khan' => 'Dera Ghazi Khan',
        'dik' => 'Dera Ismail Khan',
        'di khan' => 'Dera Ismail Khan',
        'd i khan' => 'Dera Ismail Khan',
        'ryk' => 'Rahim Yar Khan',
        'bwp' => 'Bahawalpur',
        'sgd' => 'Sargodha',
        'mzd' => 'Muzaffarabad',
    ];

    /** @var array<string, string>|null City names by normalized key. */
    private static ?array $cityByKey = null;

    /**
     * Maps a courier's own status (its name, numeric ID or code, as the
     * courier documents it) to one status (Courier::PENDING, BOOKED,
     * PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY, ATTEMPTED, UNDER_REVIEW,
     * DELIVERED, RETURNING, RETURNED or CANCELLED).
     *
     * Matching ignores case and extra spaces. PostEx's "Attempt Made:
     * <reason>" history messages map to `attempted`. A numeric status may be
     * given as a string or as a non-negative whole number (`5` or `5.0`).
     *
     * Only statuses the courier documents publicly are mapped: PostEx's API
     * guide and one Leopards status. TCS, M&P, Trax and BlueEx publish no
     * list, so they always return null, as does any status not in the list.
     * No API is called.
     *
     * Experimental: only PostEx and one Leopards status are mapped so far. The
     * mapping and the status values may change in a minor release as other
     * couriers' lists are added.
     *
     * @param mixed $courier `TCS`, `Leopards`, `PostEx`, `M&P`, `Trax` or
     *   `BlueEx` (case-insensitive; `LCS`, `MnP` and `Blue Ex` are accepted)
     * @param mixed $raw The status as the courier returned it (string or number)
     * @return string|null The status, or null. Never throws.
     */
    public static function mapStatus(mixed $courier, mixed $raw): ?string
    {
        if (!is_string($courier)) {
            return null;
        }
        $name = self::COURIER_NAMES[self::statusKey($courier)] ?? null;
        if ($name === null) {
            return null;
        }
        if (is_int($raw)) {
            if ($raw < 0) {
                return null;
            }
            $key = (string) $raw;
        } elseif (is_float($raw)) {
            // Number.isInteger: finite with no fraction; -0 counts as 0.
            if (!is_finite($raw) || floor($raw) !== $raw || $raw < 0) {
                return null;
            }
            $key = Js::numberToString($raw);
        } elseif (is_string($raw)) {
            $key = self::statusKey($raw);
        } else {
            return null;
        }
        $status = self::STATUSES[$name][$key] ?? null;
        if ($status !== null) {
            return $status;
        }
        // JavaScript's /^attempt made\b/: \b is an ASCII word boundary.
        if ($name === self::POSTEX && preg_match('/^attempt made(?![A-Za-z0-9_])/', $key) === 1) {
            return self::ATTEMPTED;
        }
        return null;
    }

    /**
     * Maps the way a customer or a courier writes a city to the city's name
     * in the city list, so orders can be matched against a courier's service
     * list.
     *
     * Accepts the exact name in any case, short forms (`LHR`, `Khi`, `Pindi`,
     * `Isb`, `FSD`), the old name Lyallpur, a trailing "city", and the main
     * cities in Urdu script.
     *
     * Courier::normalizeCity('LHR');          // "Lahore"
     * Courier::normalizeCity('lyallpur');     // "Faisalabad"
     * Courier::normalizeCity('Karachi City'); // "Karachi"
     * Courier::normalizeCity('Atlantis');     // null
     *
     * @return string|null A city from the city list, or null. Never throws.
     */
    public static function normalizeCity(?string $input): ?string
    {
        if ($input === null) {
            return null;
        }
        // Lower case, with dots and commas removed and spaces collapsed.
        $key = Js::normalizeKey(strtr($input, '.,', '  '));
        if ($key === '') {
            return null;
        }
        $cities = self::cityByKey();
        for ($pass = 0; $pass < 2; $pass++) {
            $city = $cities[$key] ?? self::CITY_ALIASES[$key] ?? null;
            if ($city !== null) {
                return $city;
            }
            if (!str_ends_with($key, ' city')) {
                break;
            }
            $key = Js::trim(substr($key, 0, -strlen(' city')));
        }
        return null;
    }

    private static function statusKey(string $text): string
    {
        return Js::normalizeKey(str_replace(['‘', '’', '`'], "'", $text));
    }

    /** @return array<string, string> */
    private static function cityByKey(): array
    {
        if (self::$cityByKey === null) {
            $map = [];
            foreach (Data::load('cities') as $entry) {
                $map[Js::normalizeKey($entry['city'])] = $entry['city'];
            }
            self::$cityByKey = $map;
        }
        return self::$cityByKey;
    }
}
