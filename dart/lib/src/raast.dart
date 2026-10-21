// Implements SBP's "Standard for Interoperable QR Code for Person-to-Person
// and Merchant Payments" v1.0 (DI&SD Circular Letter No. 1 of 2022, Annex-I).

import 'iban.dart';
import 'internal/emv.dart';
import 'internal/equality.dart';
import 'internal/js.dart';
import 'internal/normalize.dart';

export 'internal/emv.dart' show EmvField;

final RegExp _pkIbanPattern = RegExp(r'^PK\d{2}[A-Z]{4}[A-Z0-9]{16}$');
final RegExp _duration = RegExp(r'^(\d+(?:\.\d+)?)([mhd])$');
final RegExp _fixedAmount = RegExp(r'^\d+\.\d{2}$');
final RegExp _plainAmount = RegExp(r'^\d+(\.\d+)?$');
final RegExp _merchantTag = RegExp(r'^(2[6-9]|[34]\d|5[01])$');
final RegExp _fourDigits = RegExp(r'^\d{4}$');
final RegExp _twoDigits = RegExp(r'^\d{2}$');
final RegExp _eightDigits = RegExp(r'^\d{8}$');
final RegExp _expiry = RegExp(r'^(\d{2})(\d{2})(\d{4})(\d{2})(\d{2})$');

/// Scheme identifier written in person-to-person QR codes. SBP's standard
/// lists `30` for Raast, but banking apps (Faysal Bank, easypaisa) generate QR
/// codes with `00`, and the Easypaisa and JazzCash apps reject `30`.
const String _defaultP2PScheme = '00';

const Map<String, int> _durationUnits = {
  'm': 60000,
  'h': 3600000,
  'd': 86400000,
};

/// Resolves `expiresAt` / `expiresIn` to a date.
DateTime? _resolveExpiry(DateTime? expiresAt, Object? expiresIn, DateTime now) {
  if (expiresAt != null && expiresIn != null) {
    throw ArgumentError('Use either expiresAt or expiresIn, not both');
  }
  if (expiresIn == null) return expiresAt;
  double ms;
  if (expiresIn is Duration) {
    ms = expiresIn.inMicroseconds / 1000;
  } else if (expiresIn is num) {
    ms = expiresIn.toDouble();
  } else if (expiresIn is String) {
    final match = _duration.firstMatch(expiresIn);
    if (match == null) {
      throw ArgumentError.value(
        expiresIn,
        'expiresIn',
        "Must be milliseconds or like '30m', '12h' or '7d'",
      );
    }
    ms = double.parse(match[1]!) * _durationUnits[match[2]!]!;
  } else {
    throw ArgumentError.value(
      expiresIn,
      'expiresIn',
      'Must be a Duration, milliseconds or a String',
    );
  }
  if (!ms.isFinite || ms <= 0) {
    throw ArgumentError.value(
      expiresIn,
      'expiresIn',
      'Must be a positive duration',
    );
  }
  return DateTime.fromMillisecondsSinceEpoch(
    now.millisecondsSinceEpoch + ms.truncate(),
  );
}

/// Kind of Raast QR code.
enum RaastQrKind {
  /// Person-to-person QR (payload format `02`).
  p2p('p2p'),

  /// EMVCo merchant QR (payload format `01`).
  merchant('merchant');

  const RaastQrKind(this.value);

  /// The value used by the npm package.
  final String value;

  /// Returns [value].
  String toJson() => value;
}

/// A problem that stops a Raast QR from working or makes it unsafe to pay.
enum RaastQrError {
  /// Not a Pakistani payment QR.
  notARaastQr('not-a-raast-qr'),

  /// The CRC does not match: the QR is damaged or was edited.
  badChecksum('bad-checksum'),

  /// No IBAN in the QR.
  noIban('no-iban'),

  /// The IBAN fails its checksum.
  invalidIban('invalid-iban'),

  /// The QR has expired.
  expired('expired'),

  /// A fixed-amount QR without the expiry banking apps require.
  missingExpiry('missing-expiry');

  const RaastQrError(this.value);

  /// The value used by the npm package, e.g. `"bad-checksum"`.
  final String value;

  /// Returns [value].
  String toJson() => value;
}

/// Something worth telling the payer, but which does not stop payment.
enum RaastQrWarning {
  /// An amount in a static QR: apps ignore it, so the payer must type it.
  amountIgnored('amount-ignored'),

  /// The QR expires soon.
  expiresSoon('expires-soon');

  const RaastQrWarning(this.value);

  /// The value used by the npm package, e.g. `"expires-soon"`.
  final String value;

  /// Returns [value].
  String toJson() => value;
}

/// Account details for a merchant QR, as issued by the merchant's bank.
class MerchantAccountInfo {
  /// Creates merchant account details.
  const MerchantAccountInfo({required this.fields, this.tag = '28'});

  /// Template tag. SBP reserves `28`–`30` for Raast. Defaults to `28`.
  final String tag;

  /// Sub-fields of the template, keyed by 2-digit ID. They are written in ID
  /// order.
  final Map<String, String> fields;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {'tag': tag, 'fields': Map.of(fields)};

  @override
  bool operator ==(Object other) =>
      other is MerchantAccountInfo &&
      other.tag == tag &&
      other.fields.length == fields.length &&
      fields.entries.every((e) => other.fields[e.key] == e.value);

  @override
  int get hashCode => Object.hash(
        tag,
        Object.hashAllUnordered(
          fields.entries.map((e) => Object.hash(e.key, e.value)),
        ),
      );

  @override
  String toString() => 'MerchantAccountInfo${toJson()}';
}

/// Result of [parseRaastQr].
class ParsedRaastQr {
  /// Creates a parsed QR value.
  const ParsedRaastQr({
    required this.kind,
    required this.isDynamic,
    required this.crcValid,
    required this.iban,
    required this.ibanValid,
    required this.amount,
    required this.expiresAt,
    required this.bankName,
    required this.particulars,
    required this.merchantName,
    required this.city,
    required this.mcc,
    required this.billNumber,
    required this.dueDate,
    required this.amountAfterDueDate,
    required this.fields,
  });

  /// Person-to-person or merchant QR.
  final RaastQrKind kind;

  /// Whether the QR carries a fixed amount (point of initiation 12).
  /// `dynamic` in the npm package.
  final bool isDynamic;

  /// Whether the CRC checksum matches.
  final bool crcValid;

  /// Payee IBAN, if one is present.
  final String? iban;

  /// Whether [iban] passes the IBAN checksum.
  final bool ibanValid;

  /// Amount in PKR.
  final double? amount;

  /// P2P: expiry of a dynamic QR as local `YYYY-MM-DDTHH:mm`.
  final String? expiresAt;

  /// P2P: bank name.
  final String? bankName;

  /// P2P: payment description.
  final String? particulars;

  /// Merchant: merchant name.
  final String? merchantName;

  /// Merchant: city.
  final String? city;

  /// Merchant: merchant category code.
  final String? mcc;

  /// Bill or invoice number.
  final String? billNumber;

  /// Due date as `YYYY-MM-DD`.
  final String? dueDate;

  /// Amount payable after the due date.
  final double? amountAfterDueDate;

  /// All top-level fields, with template fields parsed into
  /// [EmvField.children].
  final List<EmvField> fields;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'kind': kind.value,
        'dynamic': isDynamic,
        'crcValid': crcValid,
        'iban': iban,
        'ibanValid': ibanValid,
        'amount': amount,
        'expiresAt': expiresAt,
        'bankName': bankName,
        'particulars': particulars,
        'merchantName': merchantName,
        'city': city,
        'mcc': mcc,
        'billNumber': billNumber,
        'dueDate': dueDate,
        'amountAfterDueDate': amountAfterDueDate,
        'fields': [for (final field in fields) field.toJson()],
      };

  @override
  bool operator ==(Object other) =>
      other is ParsedRaastQr &&
      other.kind == kind &&
      other.isDynamic == isDynamic &&
      other.crcValid == crcValid &&
      other.iban == iban &&
      other.ibanValid == ibanValid &&
      other.amount == amount &&
      other.expiresAt == expiresAt &&
      other.bankName == bankName &&
      other.particulars == particulars &&
      other.merchantName == merchantName &&
      other.city == city &&
      other.mcc == mcc &&
      other.billNumber == billNumber &&
      other.dueDate == dueDate &&
      other.amountAfterDueDate == amountAfterDueDate &&
      listEquals(other.fields, fields);

  @override
  int get hashCode => Object.hash(
        kind,
        isDynamic,
        crcValid,
        iban,
        ibanValid,
        amount,
        expiresAt,
        bankName,
        particulars,
        merchantName,
        city,
        mcc,
        billNumber,
        dueDate,
        amountAfterDueDate,
        listHash(fields),
      );

  @override
  String toString() => 'ParsedRaastQr${toJson()}';
}

/// Result of [validateRaastQr].
class RaastQrValidation {
  /// Creates a validation result.
  const RaastQrValidation({
    required this.valid,
    required this.errors,
    required this.warnings,
    required this.qr,
  });

  /// `true` when there are no errors.
  final bool valid;

  /// Problems that stop payment.
  final List<RaastQrError> errors;

  /// Things worth telling the payer.
  final List<RaastQrWarning> warnings;

  /// The parsed QR, or `null` if it could not be read.
  final ParsedRaastQr? qr;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'valid': valid,
        'errors': [for (final error in errors) error.value],
        'warnings': [for (final warning in warnings) warning.value],
        'qr': qr?.toJson(),
      };

  @override
  bool operator ==(Object other) =>
      other is RaastQrValidation &&
      other.valid == valid &&
      listEquals(other.errors, errors) &&
      listEquals(other.warnings, warnings) &&
      other.qr == qr;

  @override
  int get hashCode =>
      Object.hash(valid, listHash(errors), listHash(warnings), qr);

  @override
  String toString() => 'RaastQrValidation${toJson()}';
}

String _formatAmount(num amount, int maxLength, String label) {
  if (!amount.isFinite || amount <= 0) {
    throw ArgumentError.value(amount, label, 'Must be a positive number');
  }
  final text = jsToFixed(amount, 2);
  if (text.length > maxLength || !_fixedAmount.hasMatch(text)) {
    throw ArgumentError.value(amount, label, 'Too large for a Raast QR code');
  }
  return text;
}

/// P2P amounts: whole rupees as `1500` (as banking apps write them),
/// otherwise `1500.50`.
String _formatP2PAmount(num amount) {
  if (!amount.isFinite || amount <= 0) {
    throw ArgumentError.value(amount, 'amount', 'Must be a positive number');
  }
  final text =
      isInteger(amount) ? jsNumberToString(amount) : jsToFixed(amount, 2);
  // Very large numbers stringify in exponent form ("1e+21"), so check the
  // shape too.
  if (text.length > 10 || !_plainAmount.hasMatch(text)) {
    throw ArgumentError.value(
      amount,
      'amount',
      'Too large for a Raast QR code',
    );
  }
  return text;
}

String _two(int n) => n.toString().padLeft(2, '0');

String _four(int n) => n.toString().padLeft(4, '0');

/// `DDMMYYYYhhmm` in local time.
String _formatExpiry(DateTime date) {
  final local = date.toLocal();
  return _two(local.day) +
      _two(local.month) +
      _four(local.year) +
      _two(local.hour) +
      _two(local.minute);
}

String _checkLength(String value, int max, String label) {
  if (value.runes.length > max) {
    throw ArgumentError.value(value, label, 'Must be at most $max characters');
  }
  return value;
}

String _normalizeIban(String iban) {
  final normalized = jsToUpperCase(stripSeparators(iban));
  if (!validateIBAN(normalized)) {
    throw ArgumentError.value(iban, 'iban', 'Invalid Pakistani IBAN');
  }
  return normalized;
}

/// Creates a Raast person-to-person QR payload in SBP's P2P QR format
/// (payload format `02`), matching the QR codes banking apps generate, so it
/// can be scanned by apps such as Easypaisa and JazzCash. Encode the string as
/// a QR code with any QR library.
///
/// - [iban]: payee's Pakistani IBAN.
/// - [scheme]: scheme identifier (tag 02), `'00'` (default, as used by
///   banking apps) or `'30'` (the value listed for Raast in SBP's standard).
/// - [amount]: amount in PKR. When set, the QR is dynamic (point of
///   initiation 12) and an expiry is required: banking apps reject dynamic QR
///   codes without one, and ignore the amount in static ones.
/// - [expiresAt]: when a QR with an amount stops working (tag 07).
/// - [expiresIn]: instead of [expiresAt], how long from [now] a QR with an
///   amount works: a [Duration], milliseconds, or a string such as `'30m'`,
///   `'12h'` or `'7d'`.
/// - [bankName]: payee's bank name (up to 25 characters).
/// - [particulars]: payment description (up to 30 characters).
/// - [now]: the time [expiresIn] counts from. Defaults to [DateTime.now].
///
/// ```dart
/// createRaastP2PQr(iban: 'PK36SCBL0000001123456702');
/// createRaastP2PQr(
///     iban: 'PK36SCBL0000001123456702', amount: 1500, expiresIn: '1d');
/// ```
///
/// Throws an [ArgumentError] (a `RangeError` in the npm package) if the IBAN
/// is invalid, a field is too long, or an amount is given without
/// [expiresAt] or [expiresIn].
String createRaastP2PQr({
  required String iban,
  String? scheme,
  num? amount,
  DateTime? expiresAt,
  Object? expiresIn,
  String? bankName,
  String? particulars,
  DateTime? now,
}) {
  final expiry = _resolveExpiry(expiresAt, expiresIn, now ?? DateTime.now());
  final normalizedIban = _normalizeIban(iban);
  final buffer = StringBuffer()
    ..write(encodeField('00', '02'))
    ..write(encodeField('01', amount == null ? '11' : '12'))
    ..write(encodeField('02', scheme ?? _defaultP2PScheme));

  if (bankName != null && bankName.isNotEmpty) {
    buffer.write(encodeField('03', _checkLength(bankName, 25, 'bankName')));
  }
  buffer.write(encodeField('04', normalizedIban));
  if (amount != null) buffer.write(encodeField('05', _formatP2PAmount(amount)));
  if (particulars != null && particulars.isNotEmpty) {
    buffer.write(
      encodeField('06', _checkLength(particulars, 30, 'particulars')),
    );
  }
  if (amount != null) {
    if (expiry == null) {
      throw ArgumentError('A QR with an amount needs expiresAt or expiresIn');
    }
    buffer.write(encodeField('07', _formatExpiry(expiry)));
  }

  final data = '${buffer}1004';
  return '$data${crc16(data)}';
}

/// Creates an EMVCo merchant-presented QR payload following SBP's Pakistan
/// QR standard (currency `586`, country `PK`, CRC in tag 63), including the
/// Pakistan-specific due-date fields.
///
/// SBP leaves the layout of the Raast merchant account template to the
/// scheme and has shared it only with banks, so pass the template sub-fields
/// your bank gives you in [merchantAccount].
///
/// - [merchantName]: up to 25 characters. [city]: up to 15 characters.
/// - [mcc]: ISO 18245 merchant category code. Defaults to `0000`.
/// - [amount]: amount in PKR. When set, the QR is dynamic unless
///   [isDynamic] is `false`.
/// - [isDynamic]: overrides the point of initiation (static `11` / dynamic
///   `12`); `dynamic` in the npm package.
/// - [billNumber] (tag 62-01, up to 25 characters), [mobileNumber] (62-02, up
///   to 15) and [reference] (62-05, up to 25).
/// - [dueDate] (Pakistan-specific tag 62-50) and [amountAfterDueDate]
///   (62-51), which must be used together.
///
/// Throws an [ArgumentError] (a `RangeError` in the npm package) if a field
/// is missing, too long, or out of range.
String createMerchantQr({
  required MerchantAccountInfo merchantAccount,
  required String merchantName,
  required String city,
  String? mcc,
  num? amount,
  bool? isDynamic,
  String? billNumber,
  String? mobileNumber,
  String? reference,
  DateTime? dueDate,
  num? amountAfterDueDate,
}) {
  final tag = merchantAccount.tag;
  if (!_merchantTag.hasMatch(tag)) {
    throw ArgumentError.value(
      tag,
      'merchantAccount.tag',
      'Must be between 26 and 51',
    );
  }
  final accountFields = merchantAccount.fields.entries.toList();
  if (accountFields.isEmpty) {
    throw ArgumentError.value(
      merchantAccount.fields,
      'merchantAccount.fields',
      'Must not be empty',
    );
  }
  final categoryCode = mcc ?? '0000';
  if (!_fourDigits.hasMatch(categoryCode)) {
    throw ArgumentError.value(categoryCode, 'mcc', 'Must be 4 digits');
  }
  if ((dueDate == null) != (amountAfterDueDate == null)) {
    throw ArgumentError('dueDate and amountAfterDueDate must be used together');
  }

  final dynamicQr = isDynamic ?? amount != null;
  for (final entry in accountFields) {
    if (!_twoDigits.hasMatch(entry.key)) {
      throw ArgumentError.value(
        entry.key,
        'merchantAccount.fields',
        'Invalid merchant account sub-field ID',
      );
    }
  }
  final account = stableSorted(
    accountFields,
    (a, b) => int.parse(a.key).compareTo(int.parse(b.key)),
  ).map((e) => encodeField(e.key, e.value)).join();

  final buffer = StringBuffer()
    ..write(encodeField('00', '01'))
    ..write(encodeField('01', dynamicQr ? '12' : '11'))
    ..write(encodeField(tag, account))
    ..write(encodeField('52', categoryCode))
    ..write(encodeField('53', '586'));
  if (amount != null) {
    buffer.write(encodeField('54', _formatAmount(amount, 13, 'amount')));
  }
  buffer
    ..write(encodeField('58', 'PK'))
    ..write(encodeField('59', _checkLength(merchantName, 25, 'merchantName')))
    ..write(encodeField('60', _checkLength(city, 15, 'city')));

  final additional = StringBuffer();
  if (billNumber != null && billNumber.isNotEmpty) {
    additional.write(
      encodeField('01', _checkLength(billNumber, 25, 'billNumber')),
    );
  }
  if (mobileNumber != null && mobileNumber.isNotEmpty) {
    additional.write(
      encodeField('02', _checkLength(mobileNumber, 15, 'mobileNumber')),
    );
  }
  if (reference != null && reference.isNotEmpty) {
    additional.write(
      encodeField('05', _checkLength(reference, 25, 'reference')),
    );
  }
  if (dueDate != null && amountAfterDueDate != null) {
    final local = dueDate.toLocal();
    final ddmmyyyy = _two(local.day) + _two(local.month) + _four(local.year);
    additional
      ..write(encodeField('50', ddmmyyyy))
      ..write(
        encodeField(
          '51',
          _formatAmount(amountAfterDueDate, 13, 'amountAfterDueDate'),
        ),
      );
  }
  if (additional.isNotEmpty) {
    buffer.write(encodeField('62', additional.toString()));
  }

  final result = withCrc(buffer.toString());
  if (result.runes.length > 512) {
    throw ArgumentError('QR payload exceeds 512 characters');
  }
  return result;
}

String? _fieldValue(List<EmvField> fields, String id) {
  for (final field in fields) {
    if (field.id == id) return field.value;
  }
  return null;
}

/// Reads a `DDMMYYYYhhmm` expiry as local `YYYY-MM-DDTHH:mm`, or `null` when
/// it is malformed or not a real date and time (e.g. month 13 or hour 25).
String? _parseExpiry(String? value) {
  final match =
      value == null || value.isEmpty ? null : _expiry.firstMatch(value);
  if (match == null) return null;
  final [dd, mm, yyyy, hh, min] = [for (var i = 1; i <= 5; i++) match[i]!];
  final day = int.parse(dd);
  final month = int.parse(mm);
  final year = int.parse(yyyy);
  final hour = int.parse(hh);
  final minute = int.parse(min);
  final date = DateTime(year, month, day, hour, minute);
  final real = date.year == year &&
      date.month == month &&
      date.day == day &&
      date.hour == hour &&
      date.minute == minute;
  return real ? '$yyyy-$mm-${dd}T$hh:$min' : null;
}

/// Reads an amount field: plain digits with optional decimals, else null.
double? _toAmount(String? value) {
  if (value == null || !_plainAmount.hasMatch(value)) return null;
  return double.parse(value);
}

/// Parses a Raast QR payload: either a person-to-person QR (payload format
/// `02`) or an EMVCo merchant QR (payload format `01`), and verifies its CRC.
///
/// Returns `null` if the payload is not a well-formed Pakistani QR code.
ParsedRaastQr? parseRaastQr(String payload) {
  final text = jsTrim(payload);
  final List<EmvField> fields;
  try {
    fields = List.unmodifiable(parseFields(text));
  } on EmvSyntaxError {
    return null;
  }

  final format = _fieldValue(fields, '00');
  final kind = format == '02'
      ? RaastQrKind.p2p
      : format == '01'
          ? RaastQrKind.merchant
          : null;
  if (kind == null) return null;
  final p2p = kind == RaastQrKind.p2p;

  final crcId = p2p ? '10' : '63';
  final last = fields.isEmpty ? null : fields.last;
  final crcValid = last != null &&
      last.id == crcId &&
      last.value.length == 4 &&
      crc16(jsSlice(text, 0, -4)) == jsToUpperCase(last.value);

  String? iban;
  if (p2p) {
    iban = _fieldValue(fields, '04');
  } else {
    for (final field in fields) {
      final n = int.parse(field.id);
      if (n >= 26 && n <= 51) {
        final match = field.children
            ?.where((child) => _pkIbanPattern.hasMatch(child.value))
            .firstOrNull;
        if (match != null) {
          iban = match.value;
          break;
        }
      }
    }
  }

  final additional =
      fields.where((field) => field.id == '62').firstOrNull?.children ??
          const <EmvField>[];
  final due = _fieldValue(additional, '50');
  final expiry = p2p ? _fieldValue(fields, '07') : null;

  return ParsedRaastQr(
    kind: kind,
    isDynamic: _fieldValue(fields, '01') == '12',
    crcValid: crcValid,
    iban: iban,
    ibanValid: iban != null && validateIBAN(iban),
    amount: _toAmount(_fieldValue(fields, p2p ? '05' : '54')),
    expiresAt: _parseExpiry(expiry),
    bankName: p2p ? _fieldValue(fields, '03') : null,
    particulars: p2p ? _fieldValue(fields, '06') : null,
    merchantName: p2p ? null : _fieldValue(fields, '59'),
    city: p2p ? null : _fieldValue(fields, '60'),
    mcc: p2p ? null : _fieldValue(fields, '52'),
    billNumber: _fieldValue(additional, '01'),
    dueDate: due != null && _eightDigits.hasMatch(due)
        ? '${due.substring(4)}-${due.substring(2, 4)}-${due.substring(0, 2)}'
        : null,
    amountAfterDueDate: _toAmount(_fieldValue(additional, '51')),
    fields: fields,
  );
}

/// `new Date(year, month - 1, day, hour, minute)` for parseRaastQr's local
/// `YYYY-MM-DDTHH:mm`, including JavaScript's mapping of years 0–99 to
/// 1900–1999.
DateTime _localDateTime(String value) {
  final [date, time] = value.split('T');
  final [year, month, day] = date.split('-').map(int.parse).toList();
  final [hour, minute] = time.split(':').map(int.parse).toList();
  return DateTime(
    year >= 0 && year <= 99 ? year + 1900 : year,
    month,
    day,
    hour,
    minute,
  );
}

/// Checks whether a Raast QR code can be paid, e.g. before showing a payment
/// screen or to warn about a tampered sticker.
///
/// Errors: not a Pakistani payment QR, checksum mismatch (damaged or edited),
/// no IBAN or an IBAN that fails its checksum, expired, or a fixed-amount QR
/// without the expiry that banking apps require.
///
/// Warnings: an amount in a static QR (apps ignore it, so the payer must
/// type it), or a QR that expires within [expiresSoonMs] milliseconds (an
/// hour by default) of [now] (defaults to [DateTime.now]).
RaastQrValidation validateRaastQr(
  String payload, {
  DateTime? now,
  int expiresSoonMs = 3600000,
}) {
  final qr = parseRaastQr(payload);
  if (qr == null) {
    return const RaastQrValidation(
      valid: false,
      errors: [RaastQrError.notARaastQr],
      warnings: [],
      qr: null,
    );
  }

  final errors = <RaastQrError>[];
  final warnings = <RaastQrWarning>[];
  final time = now ?? DateTime.now();

  if (!qr.crcValid) errors.add(RaastQrError.badChecksum);
  if (qr.iban == null) {
    errors.add(RaastQrError.noIban);
  } else if (!qr.ibanValid) {
    errors.add(RaastQrError.invalidIban);
  }

  if (qr.kind == RaastQrKind.p2p) {
    if (qr.isDynamic && qr.expiresAt == null) {
      errors.add(RaastQrError.missingExpiry);
    }
    if (!qr.isDynamic && qr.amount != null) {
      warnings.add(RaastQrWarning.amountIgnored);
    }
    if (qr.expiresAt != null) {
      final remaining = _localDateTime(qr.expiresAt!).millisecondsSinceEpoch -
          time.millisecondsSinceEpoch;
      if (remaining <= 0) {
        errors.add(RaastQrError.expired);
      } else if (remaining <= expiresSoonMs) {
        warnings.add(RaastQrWarning.expiresSoon);
      }
    }
  }

  return RaastQrValidation(
    valid: errors.isEmpty,
    errors: List.unmodifiable(errors),
    warnings: List.unmodifiable(warnings),
    qr: qr,
  );
}
