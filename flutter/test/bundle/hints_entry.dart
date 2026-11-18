// ignore_for_file: avoid_print

// Compiled with dart2js by test/forms_bundle_test.dart. It uses the pure-Dart
// parts of the forms the way the widget does: the location cascade and form
// values always, and the hints only when turned on at run time.
import 'package:pakdatakit_flutter/src/forms/hints.dart';
import 'package:pakdatakit_flutter/src/forms/location.dart';
import 'package:pakdatakit_flutter/src/forms/values.dart';

Future<void> main(List<String> args) async {
  final province = PakLocation.provinces.first;
  final values = PakFormValues(
    province: province,
    district: PakLocation.districts(province).first,
    city: PakLocation.cities(province, args.isEmpty ? 'lah' : args.first).first,
    address: 'House 1',
  );
  print(values);
  if (args.contains('hints')) {
    print(await PakFormHints.compute(values));
  }
}
