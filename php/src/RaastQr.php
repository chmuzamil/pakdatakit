<?php

declare(strict_types=1);

namespace PakDataKit;

use DateInterval;
use DateTimeImmutable;
use DateTimeInterface;
use InvalidArgumentException;
use PakDataKit\Internal\Js;
use PakDataKit\Internal\Unicode;
use Throwable;

/**
 * Raast QR codes: SBP person-to-person and EMVCo merchant QR payloads, per
 * SBP's "Standard for Interoperable QR Code for Person-to-Person and
 * Merchant Payments" v1.0. Encode the returned string with any QR library.
 */
final class RaastQr
{
    // Scheme identifier for P2P QR codes. SBP's standard lists "30" for
    // Raast, but banking apps generate "00", and the Easypaisa and JazzCash
    // apps reject "30".
    private const DEFAULT_P2P_SCHEME = '00';

    private const PK_IBAN = '/^PK[0-9]{2}[A-Z]{4}[A-Z0-9]{16}\z/u';
    private const PLAIN_AMOUNT = '/^[0-9]+(?:\.[0-9]+)?\z/u';
    private const DURATION_UNITS = ['m' => 60_000, 'h' => 3_600_000, 'd' => 86_400_000];

    /**
     * Creates a Raast person-to-person QR payload (SBP P2P format `02`). It
     * matches the QR codes banking apps generate, so Easypaisa, JazzCash and
     * other apps can scan it.
     *
     * Options:
     * - `iban` (string, required): the payee's Pakistani IBAN
     * - `amount` (int|float): fixed amount; makes the QR dynamic, which needs an expiry
     * - `expiresAt` (DateTimeInterface): expiry of a dynamic QR, as local time
     * - `expiresIn` (int|float|string): milliseconds, or `30m`, `12h`, `7d`, counted from `now`
     * - `bankName` (string, at most 25 characters), `particulars` (at most 30)
     * - `scheme` (string): defaults to `00`
     * - `now` (DateTimeInterface): defaults to the current time
     *
     * @param array<string, mixed> $options
     * @throws InvalidArgumentException if the IBAN is invalid, a field is too
     *     long, or an amount is given without an expiry
     */
    public static function createP2P(array $options): string
    {
        $amount = $options['amount'] ?? null;
        $expiry = self::resolveExpiry($options['expiresAt'] ?? null, $options['expiresIn'] ?? null, $options['now'] ?? null);
        $iban = self::normalizeIban($options['iban'] ?? null);
        $bankName = $options['bankName'] ?? null;
        $particulars = $options['particulars'] ?? null;

        $payload = self::encodeField('00', '02')
            . self::encodeField('01', $amount === null ? '11' : '12')
            . self::encodeField('02', self::text($options['scheme'] ?? self::DEFAULT_P2P_SCHEME, 'scheme'));
        if ($bankName !== null && $bankName !== '') {
            $payload .= self::encodeField('03', self::checkLength(self::text($bankName, 'bankName'), 25, 'bankName'));
        }
        $payload .= self::encodeField('04', $iban);
        if ($amount !== null) {
            $payload .= self::encodeField('05', self::formatP2PAmount($amount));
        }
        if ($particulars !== null && $particulars !== '') {
            $payload .= self::encodeField('06', self::checkLength(self::text($particulars, 'particulars'), 30, 'particulars'));
        }
        if ($amount !== null) {
            if ($expiry === false) {
                throw new InvalidArgumentException('expiresAt is invalid');
            }
            if ($expiry === null) {
                throw new InvalidArgumentException('A QR with an amount needs expiresAt or expiresIn');
            }
            $payload .= self::encodeField('07', $expiry->format('dmY') . $expiry->format('Hi'));
        }

        $data = $payload . '1004';
        return $data . self::crc16($data);
    }

    /**
     * createP2P() without throwing: null where it would throw.
     *
     * @param array<string, mixed> $options
     */
    public static function tryCreateP2P(array $options): ?string
    {
        try {
            return self::createP2P($options);
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * Creates an EMVCo merchant-presented QR payload per SBP's Pakistan QR
     * standard.
     *
     * Options:
     * - `merchantAccount` (array, required): `['tag' => '28', 'fields' => ['00' => 'A000000736', '01' => $iban]]`,
     *   the template sub-fields your bank gives you; `tag` (26-51) defaults to `28`
     * - `merchantName` (string, required, at most 25 characters)
     * - `city` (string, required, at most 15 characters)
     * - `mcc` (4 digits, defaults to `0000`), `amount`, `dynamic` (bool)
     * - `billNumber`, `mobileNumber`, `reference`
     * - `dueDate` (DateTimeInterface) with `amountAfterDueDate`
     *
     * @param array<string, mixed> $options
     * @throws InvalidArgumentException if a field is missing, too long, or out of range
     */
    public static function createMerchant(array $options): string
    {
        $account = $options['merchantAccount'] ?? null;
        if (!is_array($account)) {
            throw new InvalidArgumentException('merchantAccount is required');
        }
        $tag = self::text($account['tag'] ?? '28', 'merchantAccount.tag');
        if (!Js::test('/^(?:2[6-9]|[34][0-9]|5[01])\z/u', $tag)) {
            throw new InvalidArgumentException('merchantAccount.tag must be between 26 and 51');
        }
        $fields = $account['fields'] ?? [];
        if (!is_array($fields) || count($fields) === 0) {
            throw new InvalidArgumentException('merchantAccount.fields must not be empty');
        }
        $mcc = self::text($options['mcc'] ?? '0000', 'mcc');
        if (!Js::test('/^[0-9]{4}\z/u', $mcc)) {
            throw new InvalidArgumentException('mcc must be 4 digits');
        }
        $amount = $options['amount'] ?? null;
        $dueDate = $options['dueDate'] ?? null;
        $amountAfterDueDate = $options['amountAfterDueDate'] ?? null;
        if (($dueDate === null) !== ($amountAfterDueDate === null)) {
            throw new InvalidArgumentException('dueDate and amountAfterDueDate must be used together');
        }
        $isDynamic = $options['dynamic'] ?? ($amount !== null);

        $pairs = [];
        foreach ($fields as $id => $value) {
            // PHP turns array keys like "10" into integers; "00"-"09" stay strings.
            $id = (string) $id;
            if (!Js::test('/^[0-9]{2}\z/u', $id)) {
                throw new InvalidArgumentException('Invalid merchant account sub-field ID: ' . $id);
            }
            $pairs[] = [$id, self::text($value, 'merchantAccount.fields')];
        }
        // Sub-fields are written in ID order (00, 01, ... 10 ...).
        usort($pairs, static fn (array $a, array $b): int => (int) $a[0] <=> (int) $b[0]);
        $accountData = '';
        foreach ($pairs as [$id, $value]) {
            $accountData .= self::encodeField($id, $value);
        }

        $payload = self::encodeField('00', '01')
            . self::encodeField('01', $isDynamic ? '12' : '11')
            . self::encodeField($tag, $accountData)
            . self::encodeField('52', $mcc)
            . self::encodeField('53', '586');
        if ($amount !== null) {
            $payload .= self::encodeField('54', self::formatAmount($amount, 13, 'amount'));
        }
        $payload .= self::encodeField('58', 'PK')
            . self::encodeField('59', self::checkLength(self::text($options['merchantName'] ?? null, 'merchantName'), 25, 'merchantName'))
            . self::encodeField('60', self::checkLength(self::text($options['city'] ?? null, 'city'), 15, 'city'));

        $additional = '';
        foreach ([['billNumber', '01', 25], ['mobileNumber', '02', 15], ['reference', '05', 25]] as [$name, $id, $max]) {
            $value = $options[$name] ?? null;
            if ($value !== null && $value !== '') {
                $additional .= self::encodeField($id, self::checkLength(self::text($value, $name), $max, $name));
            }
        }
        if ($dueDate !== null && $amountAfterDueDate !== null) {
            if (!$dueDate instanceof DateTimeInterface) {
                throw new InvalidArgumentException('dueDate is invalid');
            }
            $additional .= self::encodeField('50', $dueDate->format('dmY'))
                . self::encodeField('51', self::formatAmount($amountAfterDueDate, 13, 'amountAfterDueDate'));
        }
        if ($additional !== '') {
            $payload .= self::encodeField('62', $additional);
        }

        $data = $payload . '6304';
        $result = $data . self::crc16($data);
        if (Js::codePointCount($result) > 512) {
            throw new InvalidArgumentException('QR payload exceeds 512 characters');
        }
        return $result;
    }

    /**
     * createMerchant() without throwing: null where it would throw.
     *
     * @param array<string, mixed> $options
     */
    public static function tryCreateMerchant(array $options): ?string
    {
        try {
            return self::createMerchant($options);
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * Parses a Raast QR payload (P2P format `02` or EMVCo merchant format
     * `01`) and verifies its CRC. Returns null if it is not a well-formed
     * Pakistani QR code. Never throws.
     */
    public static function parse(?string $payload): ?ParsedRaastQr
    {
        $text = Js::trim($payload ?? '');
        if (!mb_check_encoding($text, 'UTF-8')) {
            return null;
        }
        $fields = self::parseFields($text, true);
        if ($fields === null) {
            return null;
        }

        $format = self::fieldValue($fields, '00');
        if ($format !== '02' && $format !== '01') {
            return null;
        }
        $p2p = $format === '02';

        $last = $fields === [] ? null : $fields[count($fields) - 1];
        $crcValid = $last !== null
            && $last->id === ($p2p ? '10' : '63')
            && Js::utf16Length($last->value) === 4
            && self::crc16(Js::dropLastUtf16Units($text, 4)) === Unicode::upper($last->value);

        $iban = null;
        if ($p2p) {
            $iban = self::fieldValue($fields, '04');
        } else {
            foreach ($fields as $field) {
                $id = (int) $field->id;
                if ($id < 26 || $id > 51) {
                    continue;
                }
                foreach ($field->children ?? [] as $child) {
                    if (Js::test(self::PK_IBAN, $child->value)) {
                        $iban = $child->value;
                        break 2;
                    }
                }
            }
        }

        $additional = [];
        foreach ($fields as $field) {
            if ($field->id === '62') {
                $additional = $field->children ?? [];
                break;
            }
        }
        $due = self::fieldValue($additional, '50');

        return new ParsedRaastQr(
            kind: $p2p ? 'p2p' : 'merchant',
            dynamic: self::fieldValue($fields, '01') === '12',
            crcValid: $crcValid,
            iban: $iban,
            ibanValid: $iban !== null && Iban::validate($iban),
            amount: self::toAmount(self::fieldValue($fields, $p2p ? '05' : '54')),
            expiresAt: self::parseExpiry($p2p ? self::fieldValue($fields, '07') : null),
            bankName: $p2p ? self::fieldValue($fields, '03') : null,
            particulars: $p2p ? self::fieldValue($fields, '06') : null,
            merchantName: $p2p ? null : self::fieldValue($fields, '59'),
            city: $p2p ? null : self::fieldValue($fields, '60'),
            mcc: $p2p ? null : self::fieldValue($fields, '52'),
            billNumber: self::fieldValue($additional, '01'),
            dueDate: $due !== null && Js::test('/^[0-9]{8}\z/u', $due)
                ? substr($due, 4) . '-' . substr($due, 2, 2) . '-' . substr($due, 0, 2)
                : null,
            amountAfterDueDate: self::toAmount(self::fieldValue($additional, '51')),
            fields: $fields,
        );
    }

    /**
     * Checks whether a Raast QR code can be paid. Never throws. Errors: not
     * a Pakistani payment QR, checksum mismatch, no IBAN or an invalid IBAN,
     * expired, or a fixed-amount QR without an expiry. Warnings: an amount in
     * a static QR (apps ignore it), or a QR that expires soon.
     *
     * @param DateTimeInterface|null $now The time to check the expiry against; defaults to now
     * @param int|float $expiresSoonMs How close to expiry counts as "soon"; defaults to one hour
     */
    public static function validate(
        ?string $payload,
        ?DateTimeInterface $now = null,
        int|float $expiresSoonMs = 3_600_000,
    ): RaastQrValidation {
        $qr = self::parse($payload);
        if ($qr === null) {
            return new RaastQrValidation(false, ['not-a-raast-qr'], [], null);
        }

        $errors = [];
        $warnings = [];
        $current = self::localParts($now ?? new DateTimeImmutable());

        if (!$qr->crcValid) {
            $errors[] = 'bad-checksum';
        }
        if ($qr->iban === null) {
            $errors[] = 'no-iban';
        } elseif (!$qr->ibanValid) {
            $errors[] = 'invalid-iban';
        }

        if ($qr->kind === 'p2p') {
            if ($qr->dynamic && $qr->expiresAt === null) {
                $errors[] = 'missing-expiry';
            }
            if (!$qr->dynamic && $qr->amount !== null) {
                $warnings[] = 'amount-ignored';
            }
            if ($qr->expiresAt !== null) {
                $remaining = self::expiryMilliseconds($qr->expiresAt) - $current;
                if ($remaining <= 0) {
                    $errors[] = 'expired';
                } elseif ($remaining <= $expiresSoonMs) {
                    $warnings[] = 'expires-soon';
                }
            }
        }

        return new RaastQrValidation($errors === [], $errors, $warnings, $qr);
    }

    // -------------------------------------------------------------------- EMV

    private static function isTemplateId(string $id): bool
    {
        $n = (int) $id;
        return ($n >= 26 && $n <= 51) || $n === 62 || $n === 64 || ($n >= 80 && $n <= 99);
    }

    /** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), as 4 uppercase hex digits. */
    private static function crc16(string $text): string
    {
        $crc = 0xFFFF;
        $length = strlen($text);
        for ($i = 0; $i < $length; $i++) {
            $crc ^= ord($text[$i]) << 8;
            for ($bit = 0; $bit < 8; $bit++) {
                $crc = ($crc & 0x8000) !== 0 ? (($crc << 1) ^ 0x1021) & 0xFFFF : ($crc << 1) & 0xFFFF;
            }
        }
        return str_pad(strtoupper(dechex($crc)), 4, '0', STR_PAD_LEFT);
    }

    /** Encodes one field. Length counts characters, as the EMV spec requires. */
    private static function encodeField(string $id, string $value): string
    {
        $length = Js::codePointCount($value);
        if ($length > 99) {
            throw new InvalidArgumentException("EMV field {$id} is longer than 99 characters");
        }
        return $id . str_pad((string) $length, 2, '0', STR_PAD_LEFT) . $value;
    }

    /**
     * Parses EMV fields, or returns null if the data is malformed.
     *
     * @return list<EmvField>|null
     */
    private static function parseFields(string $data, bool $nested): ?array
    {
        $chars = Js::codePoints($data);
        $count = count($chars);
        $fields = [];
        $i = 0;
        while ($i < $count) {
            if ($i + 4 > $count) {
                return null;
            }
            $header = implode('', array_slice($chars, $i, 4));
            if (!Js::test('/^[0-9]{4}\z/u', $header)) {
                return null;
            }
            $id = substr($header, 0, 2);
            $length = (int) substr($header, 2);
            if ($i + 4 + $length > $count) {
                return null;
            }
            $value = implode('', array_slice($chars, $i + 4, $length));
            $children = null;
            if ($nested && self::isTemplateId($id)) {
                $children = self::parseFields($value, false);
                if ($children === null) {
                    return null;
                }
            }
            $fields[] = new EmvField($id, $value, $children);
            $i += 4 + $length;
        }
        return $fields;
    }

    // ---------------------------------------------------------------- helpers

    /**
     * @return DateTimeInterface|false|null The expiry, null if there is none,
     *     or false if it cannot be represented.
     */
    private static function resolveExpiry(mixed $expiresAt, mixed $expiresIn, mixed $now): DateTimeInterface|false|null
    {
        if ($expiresAt !== null && $expiresIn !== null) {
            throw new InvalidArgumentException('Use either expiresAt or expiresIn, not both');
        }
        if ($expiresIn === null) {
            if ($expiresAt !== null && !$expiresAt instanceof DateTimeInterface) {
                throw new InvalidArgumentException('expiresAt is invalid');
            }
            return $expiresAt;
        }

        if (is_string($expiresIn)) {
            $match = Js::match('/^([0-9]+(?:\.[0-9]+)?)([mhd])\z/u', $expiresIn);
            if ($match === null) {
                throw new InvalidArgumentException(
                    "expiresIn must be milliseconds or like '30m', '12h' or '7d', received " . $expiresIn,
                );
            }
            $ms = (float) $match[1] * self::DURATION_UNITS[(string) $match[2]];
        } elseif (is_int($expiresIn) || is_float($expiresIn)) {
            $ms = (float) $expiresIn;
        } else {
            throw new InvalidArgumentException('expiresIn must be a positive duration');
        }
        if (!is_finite($ms) || $ms <= 0) {
            throw new InvalidArgumentException('expiresIn must be a positive duration');
        }
        if ($now !== null && !$now instanceof DateTimeInterface) {
            throw new InvalidArgumentException('now is invalid');
        }

        // JavaScript Dates have millisecond precision; minutes are all a QR needs.
        $ms = $ms < 0 ? ceil($ms) : floor($ms);
        if ($ms > 8.64e15) {
            return false;
        }
        $start = DateTimeImmutable::createFromInterface($now ?? new DateTimeImmutable());
        try {
            $seconds = intdiv((int) $ms, 1000);
            $micro = ((int) $ms % 1000) * 1000;
            $result = $start
                ->add(new DateInterval('PT' . $seconds . 'S'))
                ->modify('+' . $micro . ' microseconds');
        } catch (Throwable) {
            return false;
        }
        return $result === false || (int) $result->format('Y') > 275760 ? false : $result;
    }

    private static function formatAmount(mixed $amount, int $maxLength, string $label): string
    {
        if ((!is_int($amount) && !is_float($amount)) || !is_finite((float) $amount) || $amount <= 0) {
            throw new InvalidArgumentException($label . ' must be a positive number');
        }
        $text = Js::toFixed($amount, 2);
        if (strlen($text) > $maxLength || !Js::test('/^[0-9]+\.[0-9]{2}\z/u', $text)) {
            throw new InvalidArgumentException($label . ' is too large for a Raast QR code');
        }
        return $text;
    }

    /** Whole rupees as `1500` (as banking apps write them), otherwise `1500.50`. */
    private static function formatP2PAmount(mixed $amount): string
    {
        if ((!is_int($amount) && !is_float($amount)) || !is_finite((float) $amount) || $amount <= 0) {
            throw new InvalidArgumentException('amount must be a positive number');
        }
        $float = (float) $amount;
        $text = floor($float) === $float ? Js::numberToString($float) : Js::toFixed($float, 2);
        // Very large numbers stringify in exponent form ("1e+21"), so check the shape too.
        if (strlen($text) > 10 || !Js::test(self::PLAIN_AMOUNT, $text)) {
            throw new InvalidArgumentException('amount is too large for a Raast QR code');
        }
        return $text;
    }

    private static function text(mixed $value, string $label): string
    {
        if (!is_string($value)) {
            throw new InvalidArgumentException($label . ' must be a string');
        }
        return $value;
    }

    private static function checkLength(string $value, int $maximum, string $label): string
    {
        if (Js::codePointCount($value) > $maximum) {
            throw new InvalidArgumentException("{$label} must be at most {$maximum} characters");
        }
        return $value;
    }

    private static function normalizeIban(mixed $iban): string
    {
        if (!is_string($iban)) {
            throw new InvalidArgumentException('iban is required');
        }
        $normalized = Iban::normalize($iban);
        if (!Iban::validate($normalized)) {
            throw new InvalidArgumentException('Invalid Pakistani IBAN: ' . $iban);
        }
        return $normalized;
    }

    /** @param list<EmvField> $fields */
    private static function fieldValue(array $fields, string $id): ?string
    {
        foreach ($fields as $field) {
            if ($field->id === $id) {
                return $field->value;
            }
        }
        return null;
    }

    /** Reads an amount field: plain digits with optional decimals, else null. */
    private static function toAmount(?string $value): ?float
    {
        return $value !== null && Js::test(self::PLAIN_AMOUNT, $value) ? (float) $value : null;
    }

    /**
     * Reads `DDMMYYYYhhmm` as `YYYY-MM-DDTHH:mm`, or null unless it is a
     * real date and time.
     */
    private static function parseExpiry(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        $m = Js::match('/^([0-9]{2})([0-9]{2})([0-9]{4})([0-9]{2})([0-9]{2})\z/u', $value);
        if ($m === null) {
            return null;
        }
        [$day, $month, $year, $hour, $minute] = [(int) $m[1], (int) $m[2], (int) $m[3], (int) $m[4], (int) $m[5]];
        if ($month < 1 || $month > 12 || $hour > 23 || $minute > 59) {
            return null;
        }
        $leap = $year % 4 === 0 && ($year % 100 !== 0 || $year % 400 === 0);
        $daysInMonth = [31, $leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if ($day < 1 || $day > $daysInMonth[$month - 1]) {
            return null;
        }
        return "{$m[3]}-{$m[2]}-{$m[1]}T{$m[4]}:{$m[5]}";
    }

    /**
     * Milliseconds of a wall-clock time on a time-zone-free scale, so two
     * local times can be compared without daylight-saving or zone effects.
     */
    private static function localParts(DateTimeInterface $date): float
    {
        return self::wallClockMilliseconds(
            (int) $date->format('Y'),
            (int) $date->format('n'),
            (int) $date->format('j'),
            (int) $date->format('G'),
            (int) $date->format('i'),
            (int) $date->format('s'),
        ) + (int) $date->format('v');
    }

    /**
     * `new Date(year, month - 1, day, hour, minute)` as wall-clock
     * milliseconds: years 0-99 mean 1900-1999, and a day past the end of the
     * month rolls into the next.
     */
    private static function expiryMilliseconds(string $value): float
    {
        $year = (int) substr($value, 0, 4);
        if ($year >= 0 && $year <= 99) {
            $year += 1900;
        }
        return self::wallClockMilliseconds(
            $year,
            (int) substr($value, 5, 2),
            (int) substr($value, 8, 2),
            (int) substr($value, 11, 2),
            (int) substr($value, 14, 2),
            0,
        );
    }

    private static function wallClockMilliseconds(int $year, int $month, int $day, int $hour, int $minute, int $second): float
    {
        // Days since the Julian Day Number epoch; the day may overflow the month.
        $days = Hijri::gregorianToJdn($year, $month, 1) + $day - 1;
        return ((($days * 24.0 + $hour) * 60 + $minute) * 60 + $second) * 1000;
    }
}
