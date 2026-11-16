/// Typed views of the embedded datasets, built on first use.
library;

import '../data/area_codes.g.dart';
import '../data/banks.g.dart';
import '../data/cities.g.dart';
import '../data/districts.g.dart';
import '../data/divisions.g.dart';
import '../data/holidays.g.dart';
import '../data/networks.g.dart';
import '../data/postal_codes.g.dart';
import '../data/tehsils.g.dart';

Map<String, Object?> _map(Object? value) => value! as Map<String, Object?>;

List<String> _strings(Object? value) =>
    List.unmodifiable((value! as List<Object?>).cast<String>());

/// `data/cities.json`.
final List<({String city, String province})> cities = List.unmodifiable([
  for (final e in citiesJson.map(_map))
    (city: e['city']! as String, province: e['province']! as String),
]);

/// `data/districts.json`.
final List<({String district, String province})> districts = List.unmodifiable([
  for (final e in districtsJson.map(_map))
    (district: e['district']! as String, province: e['province']! as String),
]);

/// `data/divisions.json`.
final List<({String division, String province, List<String> districts})>
    divisions = List.unmodifiable([
  for (final e in divisionsJson.map(_map))
    (
      division: e['division']! as String,
      province: e['province']! as String,
      districts: _strings(e['districts']),
    ),
]);

/// `data/tehsils.json`.
final List<
    ({
      String tehsil,
      String censusDistrict,
      String? currentDistrict,
      String province
    })> tehsils = List.unmodifiable([
  for (final e in tehsilsJson.map(_map))
    (
      tehsil: e['tehsil']! as String,
      censusDistrict: e['censusDistrict']! as String,
      currentDistrict: e['currentDistrict'] as String?,
      province: e['province']! as String,
    ),
]);

/// `data/postal-codes.json`.
final List<({String city, String postalCode, String? area, bool primary})>
    postalCodes = List.unmodifiable([
  for (final e in postalCodesJson.map(_map))
    (
      city: e['city']! as String,
      postalCode: e['postalCode']! as String,
      area: e['area'] as String?,
      primary: e['primary'] == true,
    ),
]);

/// `data/networks.json`.
final List<({String prefix, String network})> networks = List.unmodifiable([
  for (final e in networksJson.map(_map))
    (prefix: e['prefix']! as String, network: e['network']! as String),
]);

/// `data/banks.json`.
final List<
    ({
      String code,
      String name,
      String type,
      String? mergedInto,
      bool active,
      String? aliasOf
    })> banks = List.unmodifiable([
  for (final e in banksJson.map(_map))
    (
      code: e['code']! as String,
      name: e['name']! as String,
      type: e['type']! as String,
      mergedInto: e['mergedInto'] as String?,
      active: e['active'] != false,
      aliasOf: e['aliasOf'] as String?,
    ),
]);

/// `data/area-codes.json`.
final List<({String code, List<String> cities})> areaCodes = List.unmodifiable([
  for (final e in areaCodesJson.map(_map))
    (code: e['code']! as String, cities: _strings(e['cities'])),
]);

/// `data/holidays.json`: year → holiday key → observed dates and source.
final Map<String, Map<String, ({List<String> dates, String source})>>
    observedHolidays = Map.unmodifiable({
  for (final year in holidaysJson.entries)
    year.key: Map<String, ({List<String> dates, String source})>.unmodifiable({
      for (final holiday in _map(year.value).entries)
        holiday.key: (
          dates: _strings(_map(holiday.value)['dates']),
          source: _map(holiday.value)['source']! as String,
        ),
    }),
});
