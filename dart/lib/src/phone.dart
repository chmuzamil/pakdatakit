import 'internal/phone_utils.dart';
import 'networks.dart';

export 'internal/phone_utils.dart' show getPhonePrefix, normalizePhoneDigits;

/// Combined phone validation, formatting and network analysis result.
/// See [analyzePhone].
class PhoneAnalysis {
  /// Creates a phone analysis value.
  const PhoneAnalysis({
    required this.valid,
    required this.formatted,
    required this.network,
  });

  /// Whether the number is a valid Pakistani mobile number.
  final bool valid;

  /// E.164 form (`+923001234567`), or `null` if invalid.
  final String? formatted;

  /// Network the prefix was originally allocated to.
  final NetworkName network;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'valid': valid,
        'formatted': formatted,
        'network': network.value,
      };

  @override
  bool operator ==(Object other) =>
      other is PhoneAnalysis &&
      other.valid == valid &&
      other.formatted == formatted &&
      other.network == network;

  @override
  int get hashCode => Object.hash(valid, formatted, network);

  @override
  String toString() => 'PhoneAnalysis${toJson()}';
}

/// Validates a Pakistani mobile phone number.
///
/// Accepts local (`03001234567`), international (`+923001234567`,
/// `+92 (0) 300…`) and short (`3001234567`) formats, with common separators
/// and Urdu digits. The `03XX` prefix must be allocated to a mobile operator.
bool validatePhone(String phone) => normalizePhoneDigits(phone) != null;

/// Formats a Pakistani mobile number in E.164 style (`+923001234567`).
///
/// Returns `null` if the number is invalid.
String? formatPhone(String phone) {
  final digits = normalizePhoneDigits(phone);
  return digits == null ? null : '+$digits';
}

/// Validates, formats and detects the network of a mobile number in one call.
///
/// Invalid numbers give `valid: false, formatted: null, network: unknown`.
PhoneAnalysis analyzePhone(String phone) {
  final formatted = formatPhone(phone);
  if (formatted == null) {
    return const PhoneAnalysis(
      valid: false,
      formatted: null,
      network: NetworkName.unknown,
    );
  }
  return PhoneAnalysis(
    valid: true,
    formatted: formatted,
    network: getNetwork(phone),
  );
}
