// This file must stay free of Flutter imports: the bundle test compiles it
// with dart2js to check that the post office directory is split out.

// Deferred: on the web, dart2js moves `scoreAddress`, `phoneRiskSignals`,
// `getCityByPostalCode` and the post office and postal code data they use
// into a separate file, loaded by `loadLibrary()` the first time hints are
// computed. Elsewhere (the VM and AOT) a deferred import loads at once and
// costs nothing.
import 'package:pakdatakit/postal.dart' deferred as postal;
import 'package:pakdatakit/quality.dart' deferred as quality;

import 'values.dart';

/// Computes [PakFormHints] for form values. Pass one as the `hintsLoader` of
/// a form to compute hints yourself, e.g. on a server.
typedef PakHintsLoader = Future<PakFormHints> Function(PakFormValues values);

/// Non-blocking suggestions for a checkout or KYC form: how complete the
/// address is, risk signals for the mobile number and a postal code that
/// belongs to another city.
///
/// Built with [PakFormHints.compute], which loads `scoreAddress`,
/// `phoneRiskSignals` and `getCityByPostalCode` from `package:pakdatakit`
/// with a deferred import, so forms without hints never reference the post
/// office directory.
class PakFormHints {
  /// Creates hints.
  const PakFormHints({
    this.addressScore,
    this.missingParts = const [],
    this.phoneFlags = const [],
    this.postalCodeCity,
  });

  /// No hints.
  static const PakFormHints none = PakFormHints();

  /// Address completeness from 0 to 100, or `null` when no address is
  /// entered.
  final int? addressScore;

  /// Parts the address is missing, as `AddressPart.value` names (`city`,
  /// `houseNumber`, `street`, `area`, `postalCode`, `landmark`).
  final List<String> missingParts;

  /// Risk signals for the mobile number, as `PhoneRiskFlag.value` names
  /// (`landline`, `not-mobile`, `repeated-digits`, `sequential-digits`,
  /// `test-number`). `invalid` is left out: the form already reports it.
  final List<String> phoneFlags;

  /// The city the postal code belongs to, when it is not the chosen city.
  final String? postalCodeCity;

  /// Whether there is anything to show.
  bool get isEmpty =>
      addressScore == null && phoneFlags.isEmpty && postalCodeCity == null;

  static bool _loaded = false;

  /// Whether [compute] has loaded the deferred quality library.
  static bool get isLoaded => _loaded;

  /// Loads the quality and postal libraries (once) and computes hints.
  ///
  /// The address scored is the address, the landmark (prefixed with "near"),
  /// the city and the postal code, joined with commas.
  static Future<PakFormHints> compute(PakFormValues values) async {
    if (!_loaded) {
      await Future.wait([quality.loadLibrary(), postal.loadLibrary()]);
      _loaded = true;
    }

    int? score;
    var missing = const <String>[];
    if (values.address.isNotEmpty) {
      final text = [
        values.address,
        if (values.landmark.isNotEmpty) 'near ${values.landmark}',
        values.city,
        values.postalCode,
      ].where((part) => part.isNotEmpty).join(', ');
      final result = quality.scoreAddress(text);
      score = result.score;
      missing = [for (final part in result.missing) part.value];
    }

    final flags = values.mobile.isEmpty
        ? const <String>[]
        : [
            for (final flag in quality.phoneRiskSignals(values.mobile))
              if (flag.value != 'invalid') flag.value,
          ];

    String? postalCity;
    if (values.postalCode.length == 5 && values.city.isNotEmpty) {
      final found = postal.getCityByPostalCode(values.postalCode);
      if (found != null &&
          found.toLowerCase() != values.city.trim().toLowerCase()) {
        postalCity = found;
      }
    }

    return PakFormHints(
      addressScore: score,
      missingParts: missing,
      phoneFlags: flags,
      postalCodeCity: postalCity,
    );
  }

  @override
  String toString() => 'PakFormHints(score: $addressScore, '
      'missing: $missingParts, phone: $phoneFlags, '
      'postalCodeCity: $postalCodeCity)';
}
