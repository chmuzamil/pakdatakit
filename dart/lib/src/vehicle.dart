import 'internal/js.dart';
import 'internal/normalize.dart';

final RegExp _plate = RegExp(
  r'^([A-Z]{1,4})[-‐‑‒–— ]?(\d{1,4})(?:[-‐‑‒–— /]{1,3}(\d{2}))?$',
);

/// Result of [parseVehiclePlate].
class VehiclePlate {
  /// Creates a vehicle plate value.
  const VehiclePlate({
    required this.series,
    required this.number,
    required this.year,
    required this.formatted,
  });

  /// Letters before the number, e.g. `LEA`.
  final String series;

  /// Digits of the registration number, e.g. `1234`.
  final String number;

  /// Two-digit year printed on some older Punjab plates, e.g. `19`; otherwise
  /// `null`.
  final String? year;

  /// Series and number joined with a dash, e.g. `LEA-1234` (without the year).
  final String formatted;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'series': series,
        'number': number,
        'year': year,
        'formatted': formatted,
      };

  @override
  bool operator ==(Object other) =>
      other is VehiclePlate &&
      other.series == series &&
      other.number == number &&
      other.year == year &&
      other.formatted == formatted;

  @override
  int get hashCode => Object.hash(series, number, year, formatted);

  @override
  String toString() => 'VehiclePlate${toJson()}';
}

/// Splits a Pakistani vehicle registration number into its series letters,
/// number and optional year, e.g. `LEA-1234` or `ABC 123`.
///
/// There is no single national format, so this accepts the common shape: 1–4
/// letters, then 1–4 digits, optionally followed by a two-digit year after a
/// separator (`LEA-1234-19`). Series letters are not checked. Returns `null`
/// if the plate does not have that shape. See DATA.md in the repository.
VehiclePlate? parseVehiclePlate(String plate) {
  final match = _plate.firstMatch(jsToUpperCase(toAsciiDigits(jsTrim(plate))));
  if (match == null) return null;
  final series = match.group(1)!;
  final number = match.group(2)!;
  return VehiclePlate(
    series: series,
    number: number,
    year: match.group(3),
    formatted: '$series-$number',
  );
}

/// Validates the format of a vehicle registration number. See
/// [parseVehiclePlate].
bool validateVehiclePlate(String plate) => parseVehiclePlate(plate) != null;
