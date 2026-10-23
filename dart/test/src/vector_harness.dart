// Shared by vectors_test.dart (VM, reads test-vectors/) and any runner that
// supplies the vectors itself, e.g. compiled to JavaScript.
import 'dart:convert';

import 'package:pakdatakit/pakdatakit.dart';
import 'package:test/test.dart';

/// Thrown when a vector's input cannot be expressed with the Dart API's
/// types, e.g. `1.5` for an `int` parameter or `'fr'` for a [WordsLanguage].
/// The type system rejects such input at compile time; the TypeScript library
/// rejects it at run time, so the vector must expect a throw (or `null`).
/// The one exception is an option TypeScript only validates when it uses it
/// (e.g. `hijriOffset` for a year whose dates are all in the dataset): then
/// the call must give the expected result without that option.
class Unrepresentable implements Exception {
  Unrepresentable(this.reason, [this.option]);

  final String reason;

  /// The option (kwarg) holding the value, if it is one.
  final String? option;

  @override
  String toString() => 'Unrepresentable: $reason';
}

// ---------------------------------------------------------------------------
// Encoding
// ---------------------------------------------------------------------------

Object? decode(Object? value) {
  if (value is List) return [for (final item in value) decode(item)];
  if (value is Map<String, Object?>) {
    if (value.containsKey(r'$date')) {
      final text = value[r'$date']! as String;
      final [date, time] = text.contains('T') ? text.split('T') : [text, '0:0'];
      final [y, m, d] = date.split('-').map(int.parse).toList();
      final hms = time.split(':').map(int.parse).toList();
      return DateTime(y, m, d, hms[0], hms[1], hms.length > 2 ? hms[2] : 0);
    }
    if (value.containsKey(r'$num')) {
      return switch (value[r'$num']) {
        'NaN' => double.nan,
        'Infinity' => double.infinity,
        '-Infinity' => double.negativeInfinity,
        final other => throw StateError('Unknown \$num $other'),
      };
    }
    return {for (final e in value.entries) e.key: decode(e.value)};
  }
  return value;
}

String _pad(int n, [int width = 2]) => n.toString().padLeft(width, '0');

/// Converts a Dart result into the vector encoding.
Object? plain(Object? value) {
  if (value == null || value is bool || value is String) return value;
  if (value is num) {
    if (value.isNaN) return {r'$num': 'NaN'};
    if (value.isInfinite) {
      return {r'$num': value > 0 ? 'Infinity' : '-Infinity'};
    }
    return value;
  }
  if (value is DateTime) {
    final date =
        '${_pad(value.year, 4)}-${_pad(value.month)}-${_pad(value.day)}';
    final midnight = value.hour == 0 && value.minute == 0 && value.second == 0;
    return {
      r'$date': midnight
          ? date
          : '${date}T${_pad(value.hour)}:${_pad(value.minute)}:'
              '${_pad(value.second)}',
    };
  }
  if (value is List) return [for (final item in value) plain(item)];
  if (value is Map) {
    return {for (final e in value.entries) e.key as String: plain(e.value)};
  }
  // Result classes and enums.
  return plain((value as dynamic).toJson());
}

/// Describes the first difference, or returns `null` if equal. Keys the
/// TypeScript result leaves out (`undefined`) must be absent or `null`.
String? mismatch(Object? actual, Object? expected, [String path = r'$']) {
  if (expected is num && actual is num) {
    return actual == expected ? null : '$path: $actual != $expected';
  }
  if (expected is Map) {
    if (actual is! Map) return '$path: $actual is not an object';
    for (final key in {...expected.keys, ...actual.keys}) {
      if (!expected.containsKey(key)) {
        if (actual[key] != null) return '$path.$key: unexpected ${actual[key]}';
      } else if (!actual.containsKey(key)) {
        return '$path.$key: missing';
      } else {
        final found = mismatch(actual[key], expected[key], '$path.$key');
        if (found != null) return found;
      }
    }
    return null;
  }
  if (expected is List) {
    if (actual is! List || actual.length != expected.length) {
      return '$path: $actual != $expected';
    }
    for (var i = 0; i < expected.length; i++) {
      final found = mismatch(actual[i], expected[i], '$path[$i]');
      if (found != null) return found;
    }
    return null;
  }
  if (actual.runtimeType != expected.runtimeType || actual != expected) {
    return '$path: ${jsonEncode(actual)} != ${jsonEncode(expected)}';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Argument mapping
// ---------------------------------------------------------------------------

String str(Object? value) {
  if (value is! String) throw Unrepresentable('$value is not a String');
  return value;
}

String? optStr(Object? value) => value == null ? null : str(value);

num number(Object? value) {
  if (value is! num) throw Unrepresentable('$value is not a number');
  return value;
}

num? optNumber(Object? value) => value == null ? null : number(value);

int integer(Object? value) {
  final n = number(value);
  if (n is int) return n;
  if (n.isFinite && n == n.truncateToDouble()) return n.toInt();
  throw Unrepresentable('$n is not an int');
}

int? optInteger(Object? value) => value == null ? null : integer(value);

/// An `int` option: [integer] of `kwargs[key]`, or [fallback] if absent.
int intOption(Map<String, Object?> kwargs, String key, int fallback) {
  try {
    return optInteger(kwargs[key]) ?? fallback;
  } on Unrepresentable catch (e) {
    throw Unrepresentable(e.reason, key);
  }
}

bool? optBool(Object? value) => value as bool?;

DateTime? optDate(Object? value) => value as DateTime?;

WordsLanguage language(Object? value) => switch (value) {
      null || 'en' => WordsLanguage.en,
      'ur' => WordsLanguage.ur,
      _ => throw Unrepresentable('$value is not a WordsLanguage'),
    };

Map<HolidayId, List<String>>? announced(Object? value) {
  if (value == null) return null;
  return {
    for (final e in (value as Map<String, Object?>).entries)
      HolidayId.fromValue(e.key): (e.value! as List).cast<String>(),
  };
}

typedef Call = Object? Function(List<Object?> a, Map<String, Object?> k);

Call one(Object? Function(String) fn) => (a, k) => fn(str(a[0]));

Call holidayCall(
  Object? Function(
    Object date, {
    bool includeChristianHolidays,
    Map<HolidayId, List<String>>? announced,
    int hijriOffset,
  }) fn,
) =>
    (a, k) => fn(
          a[0]!,
          includeChristianHolidays:
              optBool(k['includeChristianHolidays']) ?? false,
          announced: announced(k['announced']),
          hijriOffset: intOption(k, 'hijriOffset', 0),
        );

/// The kwargs each function accepts; anything else fails the test.
const Map<String, Set<String>> allowedKwargs = {
  'toHijri': {'offset'},
  'fromHijri': {'offset'},
  'formatHijri': {'offset'},
  'isRamadan': {'offset'},
  'getPakistanHolidays': {
    'includeChristianHolidays',
    'announced',
    'hijriOffset',
  },
  'getHolidaysOn': {'includeChristianHolidays', 'announced', 'hijriOffset'},
  'isPakistanHoliday': {
    'includeChristianHolidays',
    'announced',
    'hijriOffset',
  },
  'numberToWords': {'language'},
  'amountInWords': {'language', 'cheque'},
  'validateRaastQr': {'now', 'expiresSoonMs'},
  'createRaastP2PQr': {
    'iban',
    'scheme',
    'amount',
    'expiresAt',
    'expiresIn',
    'bankName',
    'particulars',
    'now',
  },
  'createMerchantQr': {
    'merchantAccount',
    'merchantName',
    'city',
    'mcc',
    'amount',
    'dynamic',
    'billNumber',
    'mobileNumber',
    'reference',
    'dueDate',
    'amountAfterDueDate',
  },
  // ParsedAddress fields; formatAddress ignores `warnings`, as in TypeScript.
  'formatAddress': {
    'raw',
    'street',
    'area',
    'city',
    'district',
    'province',
    'postalCode',
    'warnings',
  },
};

final Map<String, Call> functions = {
  'validateCNIC': one(validateCNIC),
  'getCNICInfo': one(getCNICInfo),
  'validatePhone': one(validatePhone),
  'formatPhone': one(formatPhone),
  'analyzePhone': one(analyzePhone),
  'getNetwork': one(getNetwork),
  'createWhatsAppLink': (a, k) => a.length > 1
      ? createWhatsAppLink(str(a[0]), optStr(a[1]))
      : createWhatsAppLink(str(a[0])),
  'getProvince': one(getProvince),
  'searchCities': one(searchCities),
  'getDistrictProvince': one(getDistrictProvince),
  'searchDistricts': one(searchDistricts),
  'getDistrictsByProvince': one(getDistrictsByProvince),
  'formatPKR': (a, k) => formatPKR(number(a[0])),
  'formatLakh': (a, k) => formatLakh(number(a[0])),
  'validateIBAN': one(validateIBAN),
  'getBankFromIBAN': one(getBankFromIBAN),
  'getBankInfo': one(getBankInfo),
  'getBanks': (a, k) => getBanks(),
  'getCityByPostalCode': one(getCityByPostalCode),
  'getPostalCode': one(getPostalCode),
  'getPostalCodes': one(getPostalCodes),
  'getPostalAreas': one(getPostalAreas),
  'searchPostalCodes': one(searchPostalCodes),
  'parseAddress': one(parseAddress),
  'formatAddress': (a, k) => formatAddress(
        raw: optStr(k['raw']),
        street: optStr(k['street']),
        area: optStr(k['area']),
        city: optStr(k['city']),
        district: optStr(k['district']),
        province: optStr(k['province']),
        postalCode: optStr(k['postalCode']),
      ),
  'normalizeText': one(normalizeText),
  'normalizeRomanUrdu': one(normalizeRomanUrdu),
  'toUrduDigits': one(toUrduDigits),
  'toEnglishDigits': one(toEnglishDigits),
  'toHijri': (a, k) =>
      toHijri(a[0]! as DateTime, offset: intOption(k, 'offset', 0)),
  'fromHijri': (a, k) {
    final h = a[0]! as Map<String, Object?>;
    return fromHijri(
      HijriDate(
        year: integer(h['year']),
        month: integer(h['month']),
        day: integer(h['day']),
      ),
      offset: intOption(k, 'offset', 0),
    );
  },
  'formatHijri': (a, k) =>
      formatHijri(a[0]! as DateTime, offset: intOption(k, 'offset', 0)),
  'isRamadan': (a, k) =>
      isRamadan(a[0]! as DateTime, offset: intOption(k, 'offset', 0)),
  'getHijriMonthName': (a, k) => getHijriMonthName(integer(a[0])),
  'getPakistanHolidays': (a, k) => getPakistanHolidays(
        integer(a[0]),
        includeChristianHolidays:
            optBool(k['includeChristianHolidays']) ?? false,
        announced: announced(k['announced']),
        hijriOffset: intOption(k, 'hijriOffset', 0),
      ),
  'getHolidaysOn': holidayCall(getHolidaysOn),
  'isPakistanHoliday': holidayCall(isPakistanHoliday),
  'numberToWords': (a, k) =>
      numberToWords(number(a[0]), language: language(k['language'])),
  'amountInWords': (a, k) => amountInWords(
        number(a[0]),
        language: language(k['language']),
        cheque: optBool(k['cheque']) ?? false,
      ),
  'analyzeNTN': one(analyzeNTN),
  'validateNTN': one(validateNTN),
  'validateSTRN': one(validateSTRN),
  'analyzeNumber': one(analyzeNumber),
  'getNumberType': one(getNumberType),
  'validateLandline': one(validateLandline),
  'getAreaCode': one(getAreaCode),
  'createRaastP2PQr': (a, k) => createRaastP2PQr(
        iban: str(k['iban']),
        scheme: optStr(k['scheme']),
        amount: optNumber(k['amount']),
        expiresAt: optDate(k['expiresAt']),
        expiresIn: k['expiresIn'],
        bankName: optStr(k['bankName']),
        particulars: optStr(k['particulars']),
        now: optDate(k['now']),
      ),
  'createMerchantQr': (a, k) {
    final account = k['merchantAccount']! as Map<String, Object?>;
    return createMerchantQr(
      merchantAccount: MerchantAccountInfo(
        tag: optStr(account['tag']) ?? '28',
        fields: (account['fields']! as Map<String, Object?>).cast(),
      ),
      merchantName: str(k['merchantName']),
      city: str(k['city']),
      mcc: optStr(k['mcc']),
      amount: optNumber(k['amount']),
      isDynamic: optBool(k['dynamic']),
      billNumber: optStr(k['billNumber']),
      mobileNumber: optStr(k['mobileNumber']),
      reference: optStr(k['reference']),
      dueDate: optDate(k['dueDate']),
      amountAfterDueDate: optNumber(k['amountAfterDueDate']),
    );
  },
  'parseRaastQr': one(parseRaastQr),
  'validateRaastQr': (a, k) => validateRaastQr(
        str(a[0]),
        now: optDate(k['now']),
        expiresSoonMs: intOption(k, 'expiresSoonMs', 3600000),
      ),
  'formatCNICInput': one(formatCNICInput),
  'checkCNICInput': one(checkCNICInput),
  'formatPhoneInput': one(formatPhoneInput),
  'checkPhoneInput': one(checkPhoneInput),
  'formatIBANInput': one(formatIBANInput),
  'checkIBANInput': one(checkIBANInput),
};

const Map<String, Object> constants = {'dataVersion': dataVersion};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

/// Registers one test per vector. [modules] maps a module name (the vector
/// file's name) to the decoded JSON array of its vectors.
void registerVectorTests(Map<String, List<Object?>> modules) {
  var total = 0;
  final unrepresentable = <String>[];

  for (final MapEntry(key: module, value: list) in modules.entries) {
    final vectors = list.cast<Map<String, Object?>>();
    total += vectors.length;

    group(module, () {
      for (final (index, vector) in vectors.indexed) {
        final fn = vector['fn']! as String;
        test(
            '$index $fn ${jsonEncode(vector['args'])} '
            '${jsonEncode(vector['kwargs'])}', () {
          checkVector(module, index, vector, unrepresentable);
        });
      }
    });
  }

  test('vectors exist', () {
    expect(total, greaterThan(12000), reason: 'test vectors not found');
  });

  tearDownAll(() {
    print('$total vectors; ${unrepresentable.length} rejected by Dart types:');
    for (final line in unrepresentable) {
      print('  $line');
    }
  });
}

/// Runs one vector and checks the result.
void checkVector(
  String module,
  int index,
  Map<String, Object?> vector,
  List<String> unrepresentable,
) {
  final fn = vector['fn']! as String;
  if (vector['constant'] == true) {
    expect(constants[fn], vector['expected']);
    return;
  }
  final call = functions[fn];
  expect(call, isNotNull, reason: 'no Dart mapping for $fn');
  final args = decode(vector['args'])! as List<Object?>;
  final kwargs = decode(vector['kwargs'])! as Map<String, Object?>;
  final unknown = kwargs.keys.toSet().difference(allowedKwargs[fn] ?? const {});
  expect(unknown, isEmpty, reason: 'unmapped options for $fn');

  final throws = vector['throws'] == true;
  Object? result;
  try {
    result = call!(args, kwargs);
  } on Unrepresentable catch (e) {
    unrepresentable.add('$module[$index] $fn: ${e.reason}');
    if (!throws && e.option != null) {
      // TypeScript ignored the option here, so leave it out.
      result = call!(args, {...kwargs}..remove(e.option));
    } else {
      // Rejected by Dart's types; TypeScript must reject it too.
      expect(
        throws || vector['expected'] == null,
        isTrue,
        reason: '$e, but TypeScript accepts it',
      );
      return;
    }
  } on ArgumentError catch (e) {
    expect(throws, isTrue, reason: 'unexpected $e');
    // A RangeError would be a bug (e.g. an index out of range), not
    // the library rejecting its input.
    expect(e, isNot(isA<RangeError>()), reason: '$e');
    return;
  }
  expect(throws, isFalse, reason: 'expected an ArgumentError');
  final problem = mismatch(plain(result), vector['expected']);
  expect(problem, isNull, reason: problem);
}
