// The embedded datasets (lib/src/data/*.g.dart) must equal data/*.json at the
// repository root. Regenerate them with `node scripts/generate-dart-data.mjs`.
@TestOn('vm')
library;

import 'dart:convert';
import 'dart:io';

import 'package:pakdatakit/src/data/area_codes.g.dart';
import 'package:pakdatakit/src/data/banks.g.dart';
import 'package:pakdatakit/src/data/cities.g.dart';
import 'package:pakdatakit/src/data/collation.g.dart';
import 'package:pakdatakit/src/data/districts.g.dart';
import 'package:pakdatakit/src/data/holidays.g.dart';
import 'package:pakdatakit/src/data/networks.g.dart';
import 'package:pakdatakit/src/data/postal_codes.g.dart';
import 'package:test/test.dart';

const Map<String, Object> embedded = {
  'area-codes.json': areaCodesJson,
  'banks.json': banksJson,
  'cities.json': citiesJson,
  'districts.json': districtsJson,
  'holidays.json': holidaysJson,
  'networks.json': networksJson,
  'postal-codes.json': postalCodesJson,
};

bool deepEquals(Object? a, Object? b) {
  if (a is List && b is List) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (!deepEquals(a[i], b[i])) return false;
    }
    return true;
  }
  if (a is Map && b is Map) {
    if (a.length != b.length) return false;
    for (final key in a.keys) {
      if (!b.containsKey(key) || !deepEquals(a[key], b[key])) return false;
    }
    return true;
  }
  return a == b && a.runtimeType == b.runtimeType;
}

void main() {
  final dataDir = Directory('../data');
  final files = dataDir
      .listSync()
      .whereType<File>()
      .where((f) => f.path.endsWith('.json'))
      .toList();

  test('every dataset is embedded', () {
    expect(
      embedded.keys.toSet(),
      {for (final f in files) f.uri.pathSegments.last},
    );
  });

  for (final file in files) {
    final name = file.uri.pathSegments.last;
    test('$name matches the embedded copy', () {
      final json = jsonDecode(file.readAsStringSync());
      expect(deepEquals(embedded[name], json), isTrue,
          reason: 'run node scripts/generate-dart-data.mjs');
    });
  }

  test('collation ranks cover every sorted dataset string', () {
    String s(Object? map, String key) => (map! as Map)[key]! as String;
    final names = <String>{
      for (final e in citiesJson) s(e, 'city'),
      for (final e in districtsJson) s(e, 'district'),
      for (final e in postalCodesJson) s(e, 'postalCode'),
      for (final e in postalCodesJson)
        if ((e! as Map)['area'] case final String area) area,
    };
    expect(names.difference(collationRanks.keys.toSet()), isEmpty);
  });
}
