<?php

declare(strict_types=1);

namespace PakDataKit;

use PakDataKit\Internal\Data;
use PakDataKit\Internal\Js;
use PakDataKit\Internal\Money;

/**
 * FBR Digital Invoicing (DI): a builder that works out the sales tax on the
 * invoice JSON posted to PRAL's gateway, and an offline validator for the
 * rules that can be checked without FBR's reference APIs.
 *
 * Built from PRAL's "Technical Specification for DI API", version 1.12 (last
 * updated 24 July 2025), and PRAL's "Error Message Guide (Sales)". Nothing
 * here talks to FBR: there is no HTTP client and no token handling. Values
 * that only FBR's reference APIs can confirm (provinces, HS codes, units,
 * rates, sale types, SRO numbers) are checked for presence, not against
 * FBR's lists, unless the app passes the lists it synced from those APIs
 * (`validate($invoice, ['reference' => [...]])`).
 *
 * An invoice is the JSON object FBR expects, with its camelCase keys: an
 * associative array (as `json_decode($json, true)` gives) or a `stdClass`
 * (as `json_decode($json)` gives). `items` is a list. An empty PHP array is
 * read as an empty list, not as an object.
 */
final class FbrInvoice
{
    /** Version of PRAL's technical specification this class follows. */
    public const SPEC_VERSION = '1.12';

    /** `invoiceType` values in the specification. */
    public const SALE_INVOICE = 'Sale Invoice';
    public const DEBIT_NOTE = 'Debit Note';

    /** `buyerRegistrationType` values in the specification. */
    public const REGISTERED = 'Registered';
    public const UNREGISTERED = 'Unregistered';

    private const NTN_OR_CNIC = '/^(?:[0-9]{7}|[0-9]{13})\z/u';
    /** An FBR invoice number: the seller's NTN (7) or CNIC (13), "DI", 13 digits. */
    private const FBR_INVOICE_NUMBER = '/^(?:[0-9]{7}|[0-9]{13})DI[0-9]{13}\z/u';
    private const SCENARIO = '/^SN0(?:0[1-9]|1[0-9]|2[0-8])\z/u';
    private const PERCENT_RATE = '/^([0-9]+(?:\.[0-9]+)?)%\z/u';
    // Not /i: with /u, PCRE would also match "ſ" for "s", which JavaScript's /i does not.
    private const PER_UNIT_RATE = '/^[rR][sS]\.?[' . Js::WS . ']*([0-9]+(?:\.[0-9]+)?)\z/u';
    private const DATE = '/^([0-9]{4})-([0-9]{2})-([0-9]{2})\z/u';

    /** Amount columns of a line, as in the totals. */
    private const NUMBER_FIELDS = [
        'quantity',
        'valueSalesExcludingST',
        'salesTaxApplicable',
        'salesTaxWithheldAtSource',
        'extraTax',
        'furtherTax',
        'fedPayable',
        'discount',
    ];

    /** Required amounts of a line and their error code when missing. */
    private const MISSING_CODES = [
        'quantity' => '0098',
        'valueSalesExcludingST' => '0021',
        'salesTaxApplicable' => '0023',
        'salesTaxWithheldAtSource' => '0024',
        'totalValues' => null,
        'fixedNotifiedValueOrRetailPrice' => null,
    ];

    /** Optional amounts of a line. */
    private const OPTIONAL_NUMBERS = ['extraTax', 'furtherTax', 'fedPayable', 'discount'];

    /** @var list<FbrSaleType>|null */
    private static ?array $saleTypes = null;

    /**
     * The sale types named in PRAL's DI specification (v1.12, section 9,
     * "Scenarios for Sandbox Testing"), with the scenarios that use each.
     * FBR's full, current list comes from its reference API; this is a
     * convenience for building forms and tests, and validate() does not
     * reject a sale type that is not in it.
     *
     * ```php
     * FbrInvoice::getSaleTypes()[0];
     * // FbrSaleType(saleType: 'Goods at Standard Rate (default)',
     * //   scenarioIds: ['SN001', 'SN002', 'SN026'])
     * ```
     *
     * @return list<FbrSaleType> In the specification's order.
     */
    public static function getSaleTypes(): array
    {
        if (self::$saleTypes === null) {
            self::$saleTypes = array_map(
                static fn (array $entry): FbrSaleType => new FbrSaleType(
                    saleType: $entry['saleType'],
                    scenarioIds: $entry['scenarioIds'],
                ),
                Data::load('fbr-sale-types'),
            );
        }
        return self::$saleTypes;
    }

    /**
     * The sales tax FBR expects on a line, in rupees, or null when the rate
     * is not a plain percentage or per-unit amount (spec §7, errors 0102,
     * 0104, 0105):
     *
     * - `N%` on Third Schedule goods: retail price × rate (0102);
     * - `N%` otherwise: value excluding sales tax × rate (0104);
     * - `Rs.N`: quantity × N (0105).
     *
     * Rounded half up to the paisa (the specification allows 2 decimals and
     * gives no rounding rule).
     *
     * @param mixed $item A line of the invoice (array or object) with `rate`
     *   and `saleType`, `quantity`, `valueSalesExcludingST` or
     *   `fixedNotifiedValueOrRetailPrice`
     * @return float|null Null for anything else. Never throws.
     */
    public static function expectedSalesTax(mixed $item): ?float
    {
        $fields = self::fields($item);
        return $fields === null ? null : self::expected($fields);
    }

    /**
     * Builds an FBR digital invoice from your own fields, working out
     * `salesTaxApplicable` on each line where you leave it out (see
     * expectedSalesTax(); uses SalesTax::calculate()). Lines with a rate that
     * is neither `N%` nor `Rs.N` (`Exempt`, combined rates) get 0 unless you
     * give the tax.
     *
     * `salesTaxWithheldAtSource`, `totalValues` and
     * `fixedNotifiedValueOrRetailPrice` default to 0, and `invoiceRefNo` and
     * `buyerNTNCNIC` to `''`, as in FBR's samples. Nothing else is filled in
     * or changed (other keys are kept); check the result with validate().
     *
     * Also returns column totals in rupees (`quantity`,
     * `valueSalesExcludingST`, `salesTaxApplicable`,
     * `salesTaxWithheldAtSource`, `extraTax`, `furtherTax`, `fedPayable`,
     * `discount`), which are for your own records: the specification has no
     * invoice-level totals.
     *
     * @param mixed $input The invoice fields (array or object) with an `items` list
     * @return array{invoice: array<string, mixed>, totals: array<string, float>}|null
     *   Null if `$input` is not an object with an `items` list of objects. Never throws.
     */
    public static function build(mixed $input): ?array
    {
        $fields = self::fields($input);
        if ($fields === null || !self::isList($fields['items'] ?? null)) {
            return null;
        }
        $items = [];
        foreach ($fields['items'] as $raw) {
            $line = self::fields($raw);
            if ($line === null) {
                return null;
            }
            $item = $line;
            $item['totalValues'] = $line['totalValues'] ?? 0;
            $item['fixedNotifiedValueOrRetailPrice'] = $line['fixedNotifiedValueOrRetailPrice'] ?? 0;
            $item['salesTaxWithheldAtSource'] = $line['salesTaxWithheldAtSource'] ?? 0;
            $item['salesTaxApplicable'] = $line['salesTaxApplicable'] ?? self::expected($item) ?? 0;
            $items[] = $item;
        }
        $invoice = $fields;
        $invoice['buyerNTNCNIC'] = $fields['buyerNTNCNIC'] ?? '';
        $invoice['invoiceRefNo'] = $fields['invoiceRefNo'] ?? '';
        $invoice['items'] = $items;

        $totals = [];
        foreach (self::NUMBER_FIELDS as $key) {
            $totals[$key] = self::columnTotal($items, $key);
        }
        return ['invoice' => $invoice, 'totals' => $totals];
    }

    /**
     * Checks an FBR digital invoice against the rules of PRAL's specification
     * (v1.12) and Error Message Guide that need no call to FBR, and returns
     * every problem with FBR's error code.
     *
     * Checked: invoice type (0003, 0011), date format (0005, 0042, 0113) and,
     * with `today`, a future date (0043); seller and buyer NTN/CNIC (0401,
     * 0402, 0009), self-invoicing (0058), names, provinces (0073, 0074),
     * addresses, buyer registration type (0012), the reference number of a
     * debit note (0026), the sandbox scenario, and on each line: HS code
     * (0044), rate (0020), unit, sale type (0013), required and valid amounts
     * (0021, 0023, 0024, 0098, 0300, 0302), SRO schedule and serial (0077,
     * 0078), Third Schedule retail price (0090), extra tax on reduced-rate
     * goods (0091) and the sales tax arithmetic (0102, 0104, 0105, to within
     * one paisa).
     *
     * Not checked, because they need FBR's data: registration status, whether
     * a province, HS code, unit, rate, sale type or SRO is in FBR's lists or
     * fits the others, and the original invoice of a debit note. Pass the
     * lists your app syncs from FBR's reference APIs as `reference` to check
     * provinces, sale types, units and HS code/unit pairs against them; FBR's
     * APIs are authoritative.
     *
     * Options:
     * - `today` (string): `YYYY-MM-DD`, to reject invoices dated later (error
     *   0043); not checked when left out
     * - `reference` (array or object): lists synced from FBR's reference APIs
     *   (PRAL's `/pdi/v1/provinces`, `/pdi/v1/uom`, `/pdi/v2/HS_UOM`, sale
     *   types from `/pdi/v2/SaleTypeToRate` …). Each list given is checked,
     *   ignoring case and extra spaces; lists left out are not:
     *   - `provinces` (list of strings), e.g. `['PUNJAB', 'SINDH']`: the
     *     seller (0073) and buyer (0074) province
     *   - `saleTypes` (list of strings): each line's sale type (0013)
     *   - `uoms` (list of strings): each line's unit of measure (0099)
     *   - `hsUom` (map of HS code to a list of units), as FBR's HS_UOM API
     *     returns them, e.g. `['0101.2100' => ['Numbers, pieces, units']]`:
     *     each line's HS code must be listed (an error with no code) and its
     *     unit allowed for it (0099)
     *
     * ```php
     * FbrInvoice::validate($invoice, ['reference' => ['provinces' => ['PUNJAB', 'SINDH']]]);
     * ```
     *
     * @param mixed $invoice The invoice (array or object), e.g. decoded JSON
     * @param array{today?: mixed, reference?: mixed}|null $options See above
     * @return FbrInvoiceValidation Never throws.
     */
    public static function validate(mixed $invoice, ?array $options = null): FbrInvoiceValidation
    {
        $errors = [];
        $add = static function (?string $code, string $field, string $message) use (&$errors): void {
            $errors[] = new FbrInvoiceError($code, $field, $message);
        };
        $inv = self::fields($invoice);
        if ($inv === null) {
            $add(null, 'invoice', 'The invoice must be an object');
            return new FbrInvoiceValidation(false, $errors);
        }
        $get = static fn (string $key): mixed => $inv[$key] ?? null;

        // Invoice type
        $type = $get('invoiceType');
        if (!self::filled($type)) {
            $add('0011', 'invoiceType', 'Invoice type is empty');
        } elseif ($type !== self::SALE_INVOICE && $type !== self::DEBIT_NOTE) {
            $add('0003', 'invoiceType', 'Invoice type must be "Sale Invoice" or "Debit Note"');
        }

        // Date
        $date = $get('invoiceDate');
        $today = $options['today'] ?? null;
        if (!self::filled($date)) {
            $add('0042', 'invoiceDate', 'Invoice date is empty');
        } elseif (!Js::test(self::DATE, $date)) {
            $add('0005', 'invoiceDate', 'Invoice date must be in YYYY-MM-DD format');
        } elseif (!self::validDate($date)) {
            $add('0113', 'invoiceDate', 'Invoice date is not a valid date');
        } elseif (is_string($today) && self::validDate($today) && strcmp($date, $today) > 0) {
            $add('0043', 'invoiceDate', 'Invoice date is later than today');
        }

        // Seller
        $seller = $get('sellerNTNCNIC');
        if (!is_string($seller) || !Js::test(self::NTN_OR_CNIC, $seller)) {
            $add('0401', 'sellerNTNCNIC', 'Seller NTN or CNIC must be 7 or 13 digits');
        }
        if (!self::filled($get('sellerBusinessName'))) {
            $add(null, 'sellerBusinessName', 'Seller business name is required');
        }
        if (!self::filled($get('sellerProvince'))) {
            $add('0073', 'sellerProvince', 'Seller province is empty');
        }
        if (!self::filled($get('sellerAddress'))) {
            $add(null, 'sellerAddress', 'Seller address is required');
        }

        // Buyer
        $registration = $get('buyerRegistrationType');
        if ($registration !== self::REGISTERED && $registration !== self::UNREGISTERED) {
            $add('0012', 'buyerRegistrationType', 'Buyer registration type must be "Registered" or "Unregistered"');
        }
        $buyerId = $get('buyerNTNCNIC');
        if (!self::filled($buyerId)) {
            if ($registration !== self::UNREGISTERED) {
                $add('0009', 'buyerNTNCNIC', 'Buyer NTN or CNIC is empty');
            }
        } elseif (!Js::test(self::NTN_OR_CNIC, $buyerId)) {
            $add('0402', 'buyerNTNCNIC', 'Buyer NTN or CNIC must be 7 or 13 digits');
        } elseif ($buyerId === $seller) {
            $add('0058', 'buyerNTNCNIC', 'Buyer and seller must be different (self-invoicing is not allowed)');
        }
        if (!self::filled($get('buyerBusinessName'))) {
            $add('0010', 'buyerBusinessName', 'Buyer business name is empty');
        }
        if (!self::filled($get('buyerProvince'))) {
            $add('0074', 'buyerProvince', 'Buyer province is empty');
        }
        if (!self::filled($get('buyerAddress'))) {
            $add(null, 'buyerAddress', 'Buyer address is required');
        }

        // Reference number and scenario
        $refNo = $get('invoiceRefNo');
        if (self::filled($refNo)) {
            if (!Js::test(self::FBR_INVOICE_NUMBER, Js::trim($refNo))) {
                $add(
                    null,
                    'invoiceRefNo',
                    'Invoice reference number must be an FBR invoice number (NTN or CNIC, "DI", 13 digits)',
                );
            }
        } elseif ($type === self::DEBIT_NOTE) {
            $add('0026', 'invoiceRefNo', 'Invoice reference number is required for a debit note');
        }
        $scenario = $get('scenarioId');
        if ($scenario !== null && $scenario !== '') {
            if (!is_string($scenario) || !Js::test(self::SCENARIO, $scenario)) {
                $add(null, 'scenarioId', 'Scenario ID must be SN001 to SN028');
            }
        }

        // Reference lists synced from FBR's APIs (options.reference), if given.
        $reference = self::fields($options['reference'] ?? null) ?? [];
        $provinces = self::keySet($reference['provinces'] ?? null);
        if ($provinces !== null) {
            foreach ([['sellerProvince', '0073', 'Seller'], ['buyerProvince', '0074', 'Buyer']] as [$field, $code, $who]) {
                $value = $get($field);
                if (self::filled($value) && !isset($provinces[Js::normalizeKey($value)])) {
                    $add($code, $field, $who . " province is not in FBR's province list");
                }
            }
        }

        // Items
        $items = $get('items');
        if (!self::isList($items) || $items === []) {
            $add(null, 'items', 'The invoice needs at least one item');
            return new FbrInvoiceValidation($errors === [], $errors);
        }
        foreach ($items as $index => $raw) {
            $item = self::fields($raw);
            if ($item === null) {
                $add(null, 'items[' . $index . ']', 'Each item must be an object');
                continue;
            }
            self::validateItem($item, 'items[' . $index . '].', $add);
        }

        $saleTypes = self::keySet($reference['saleTypes'] ?? null);
        $uoms = self::keySet($reference['uoms'] ?? null);
        $hsUom = null;
        $hsFields = self::mapFields($reference['hsUom'] ?? null);
        if ($hsFields !== null) {
            $hsUom = [];
            foreach ($hsFields as $hs => $units) {
                $hsUom[Js::normalizeKey((string) $hs)] = self::keySet($units) ?? [];
            }
        }
        if ($saleTypes !== null || $uoms !== null || $hsUom !== null) {
            foreach ($items as $index => $raw) {
                $item = self::fields($raw);
                if ($item === null) {
                    continue;
                }
                $at = 'items[' . $index . '].';
                $saleType = $item['saleType'] ?? null;
                if ($saleTypes !== null && self::filled($saleType) && !isset($saleTypes[Js::normalizeKey($saleType)])) {
                    $add('0013', $at . 'saleType', "Sale type is not in FBR's sale type list");
                }
                $uom = $item['uoM'] ?? null;
                $unit = self::filled($uom) ? Js::normalizeKey($uom) : null;
                if ($uoms !== null && $unit !== null && !isset($uoms[$unit])) {
                    $add('0099', $at . 'uoM', "Unit of measure is not in FBR's unit list");
                }
                $hsCode = $item['hsCode'] ?? null;
                if ($hsUom !== null && self::filled($hsCode)) {
                    $allowed = $hsUom[Js::normalizeKey($hsCode)] ?? null;
                    if ($allowed === null) {
                        $add(null, $at . 'hsCode', "HS code is not in FBR's HS code list");
                    } elseif ($unit !== null && !isset($allowed[$unit])) {
                        $add('0099', $at . 'uoM', 'Unit of measure is not allowed for this HS code');
                    }
                }
            }
        }

        return new FbrInvoiceValidation($errors === [], $errors);
    }

    /**
     * A reference list as a set of normalized keys (the strings in it), or
     * null if it is not a list.
     *
     * @return array<string, true>|null
     */
    private static function keySet(mixed $list): ?array
    {
        if (!self::isList($list)) {
            return null;
        }
        $keys = [];
        foreach ($list as $value) {
            if (is_string($value)) {
                $keys[Js::normalizeKey($value)] = true;
            }
        }
        return $keys;
    }

    /**
     * The entries of a JSON object used as a map, such as `hsUom`: an
     * object's public properties, or an array that is not a non-empty list
     * (so an empty array is an empty map). Null for anything else.
     *
     * @return array<array-key, mixed>|null
     */
    private static function mapFields(mixed $value): ?array
    {
        if (is_array($value) && $value === []) {
            return [];
        }
        return self::fields($value);
    }

    /**
     * @param array<array-key, mixed> $item
     * @param callable(?string, string, string): void $add
     */
    private static function validateItem(array $item, string $at, callable $add): void
    {
        $get = static fn (string $key): mixed => $item[$key] ?? null;
        if (!self::filled($get('hsCode'))) {
            $add('0044', $at . 'hsCode', 'HS code is empty');
        }
        if (!is_string($get('productDescription'))) {
            $add(null, $at . 'productDescription', 'Product description is required');
        }
        if (!self::filled($get('rate'))) {
            $add('0020', $at . 'rate', 'Rate is empty');
        }
        if (!self::filled($get('uoM'))) {
            $add(null, $at . 'uoM', 'Unit of measure is required');
        }
        if (!self::filled($get('saleType'))) {
            $add('0013', $at . 'saleType', 'Sale type is empty');
        }

        $numbersOk = [];
        foreach ([...array_keys(self::MISSING_CODES), ...self::OPTIONAL_NUMBERS] as $key) {
            $value = $get($key);
            $required = array_key_exists($key, self::MISSING_CODES);
            if ($value === null || (!$required && $value === '')) {
                if ($required) {
                    $add(self::MISSING_CODES[$key], $at . $key, $key . ' is required');
                }
                continue;
            }
            if (!self::isNumber($value) || !is_finite((float) $value) || $value < 0) {
                $add('0300', $at . $key, $key . ' must be a number, not negative');
                continue;
            }
            $limit = $key === 'quantity' ? 4 : 2;
            if (self::decimalPlaces($value) > $limit) {
                $add('0302', $at . $key, $key . ' has more than ' . $limit . ' decimal places');
                continue;
            }
            $numbersOk[$key] = true;
        }

        $rateValue = $get('rate');
        $rate = is_string($rateValue) ? Js::trim($rateValue) : '';
        $sroScheduleNo = $get('sroScheduleNo');
        if (self::filled($rateValue) && $rate !== '18%' && !self::filled($sroScheduleNo)) {
            $add('0077', $at . 'sroScheduleNo', 'SRO/schedule number is required when the rate is not 18%');
        }
        if (self::filled($sroScheduleNo) && !self::filled($get('sroItemSerialNo'))) {
            $add('0078', $at . 'sroItemSerialNo', 'Item serial number is required when an SRO/schedule number is given');
        }
        $saleType = self::saleTypeKey($get('saleType'));
        $retailPrice = $get('fixedNotifiedValueOrRetailPrice');
        if (
            $saleType === '3rd schedule goods'
            && ($numbersOk['fixedNotifiedValueOrRetailPrice'] ?? false)
            && self::isNumber($retailPrice)
            && $retailPrice == 0
        ) {
            $add('0090', $at . 'fixedNotifiedValueOrRetailPrice', 'Retail price is required for Third Schedule goods');
        }
        $extraTax = $get('extraTax');
        if ($saleType === 'goods at reduced rate' && $extraTax !== null && $extraTax !== '') {
            $add('0091', $at . 'extraTax', 'Extra tax must be empty for goods at a reduced rate');
        }

        // Sales tax arithmetic
        if (!($numbersOk['salesTaxApplicable'] ?? false)) {
            return;
        }
        $percent = Js::test(self::PERCENT_RATE, $rate);
        $perUnit = Js::test(self::PER_UNIT_RATE, $rate);
        $baseKey = $perUnit
            ? 'quantity'
            : ($saleType === '3rd schedule goods' ? 'fixedNotifiedValueOrRetailPrice' : 'valueSalesExcludingST');
        if (!($percent || $perUnit) || !($numbersOk[$baseKey] ?? false)) {
            return;
        }
        $expected = self::expected($item);
        if ($expected === null) {
            return;
        }
        $actual = Money::toUnits($get('salesTaxApplicable'), 2);
        $wanted = Money::toUnits($expected, 2);
        if ($actual !== null && $wanted !== null && abs($actual - $wanted) > 1) {
            $code = $perUnit ? '0105' : ($saleType === '3rd schedule goods' ? '0102' : '0104');
            $add(
                $code,
                $at . 'salesTaxApplicable',
                'Sales tax should be ' . Js::toFixed($expected, 2) . ' for this rate',
            );
        }
    }

    /** @param array<array-key, mixed> $item */
    private static function expected(array $item): ?float
    {
        $rateValue = $item['rate'] ?? null;
        if (!is_string($rateValue)) {
            return null;
        }
        $rate = Js::trim($rateValue);
        $percent = Js::match(self::PERCENT_RATE, $rate);
        if ($percent !== null) {
            $base = self::saleTypeKey($item['saleType'] ?? null) === '3rd schedule goods'
                ? ($item['fixedNotifiedValueOrRetailPrice'] ?? null)
                : ($item['valueSalesExcludingST'] ?? null);
            if (!self::isNumber($base)) {
                return null;
            }
            return SalesTax::calculate($base, ['rate' => (float) $percent[1]])?->tax;
        }
        $perUnit = Js::match(self::PER_UNIT_RATE, $rate);
        if ($perUnit !== null) {
            $quantity = $item['quantity'] ?? null;
            if (!self::isNumber($quantity)) {
                return null;
            }
            $units = Money::toUnits($quantity, 4);
            $price = Money::toUnits((float) $perUnit[1], 2);
            if ($units === null || $price === null) {
                return null;
            }
            return self::perUnitPaisa($units, $price) / 100;
        }
        return null;
    }

    /**
     * `quantity × price / 10000`, rounded half up, as the nearest float (as
     * JavaScript's Number(bigint)). Exact even when the product does not fit
     * in an int: quantity is at most 10^16 and price at most 10^14.
     */
    private static function perUnitPaisa(int $quantity, int $price): float
    {
        if ($price === 0 || $quantity <= intdiv(PHP_INT_MAX, $price)) {
            return (float) Money::divideHalfUp($quantity * $price, 10_000);
        }
        // Decimal digits of the product, schoolbook (each step stays below 10^16).
        $digits = '';
        $carry = 0;
        $text = (string) $quantity;
        for ($i = strlen($text) - 1; $i >= 0; $i--) {
            $step = (int) $text[$i] * $price + $carry;
            $digits = ($step % 10) . $digits;
            $carry = intdiv($step, 10);
        }
        $product = ($carry > 0 ? (string) $carry : '') . $digits;
        $quotient = substr($product, 0, -4);
        if ((int) substr($product, -4) >= 5000) {
            // Add one to the decimal string.
            $i = strlen($quotient) - 1;
            while ($i >= 0 && $quotient[$i] === '9') {
                $quotient[$i] = '0';
                $i--;
            }
            $quotient = $i < 0 ? '1' . $quotient : substr_replace($quotient, (string) ((int) $quotient[$i] + 1), $i, 1);
        }
        return (float) $quotient;
    }

    /**
     * Adds up a column in paisa (quantity in ten-thousandths) so the sum is
     * exact, accumulating as JavaScript does (in floats).
     *
     * @param list<array<array-key, mixed>> $items
     */
    private static function columnTotal(array $items, string $key): float
    {
        $scale = $key === 'quantity' ? 4 : 2;
        $sum = 0.0;
        foreach ($items as $item) {
            $value = $item[$key] ?? null;
            if (!self::isNumber($value)) {
                continue;
            }
            $units = Money::toUnits($value, $scale);
            if ($units !== null) {
                $sum += $units;
            }
        }
        return $sum / ($scale === 4 ? 10_000 : 100);
    }

    /** Decimal places in a finite non-negative number's shortest decimal form. */
    private static function decimalPlaces(int|float $value): int
    {
        $match = Js::match('/^-?[0-9]+(?:\.([0-9]+))?(?:e([+-][0-9]+))?\z/', Js::numberToString($value));
        if ($match === null) {
            return 0;
        }
        $places = strlen($match[1] ?? '') - (int) ($match[2] ?? '0');
        return max($places, 0);
    }

    private static function validDate(string $text): bool
    {
        $match = Js::match(self::DATE, $text);
        if ($match === null) {
            return false;
        }
        [$y, $m, $d] = [(int) $match[1], (int) $match[2], (int) $match[3]];
        $leap = ($y % 4 === 0 && $y % 100 !== 0) || $y % 400 === 0;
        $days = [31, $leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        return $m >= 1 && $m <= 12 && $d >= 1 && $d <= $days[$m - 1];
    }

    /** A JSON number: an int or float (not a bool or numeric string). */
    private static function isNumber(mixed $value): bool
    {
        return is_int($value) || is_float($value);
    }

    /** A string with something other than whitespace (JavaScript's trim()). */
    private static function filled(mixed $value): bool
    {
        return is_string($value) && Js::trim($value) !== '';
    }

    private static function saleTypeKey(mixed $value): string
    {
        return is_string($value) ? Js::normalizeKey($value) : '';
    }

    /** A JSON array: a PHP list (an empty array included). */
    private static function isList(mixed $value): bool
    {
        return is_array($value) && array_is_list($value);
    }

    /**
     * The keys and values of a JSON object: an object's public properties
     * (e.g. a stdClass), or an array that is not a list. Null for anything
     * else, including a list and the empty array.
     *
     * @return array<array-key, mixed>|null
     */
    private static function fields(mixed $value): ?array
    {
        if (is_object($value)) {
            return get_object_vars($value);
        }
        if (is_array($value) && !array_is_list($value)) {
            return $value;
        }
        return null;
    }
}
