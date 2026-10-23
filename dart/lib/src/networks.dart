import 'internal/data.dart';
import 'internal/phone_utils.dart';

/// Original issuing operator for a mobile prefix.
///
/// [telenor] is the operator the 034x range was originally allocated to;
/// Telenor Pakistan was merged into PTML (Ufone) in 2026. [sco] is the Special
/// Communications Organization (0355, serving AJK and Gilgit-Baltistan).
enum NetworkName {
  /// Jazz (Mobilink).
  jazz('Jazz'),

  /// Zong.
  zong('Zong'),

  /// Telenor (034x).
  telenor('Telenor'),

  /// Ufone.
  ufone('Ufone'),

  /// Special Communications Organization.
  sco('SCO'),

  /// Not a valid Pakistani mobile number.
  unknown('Unknown');

  const NetworkName(this.value);

  /// The value used by the npm package, e.g. `"Jazz"`.
  final String value;

  /// Returns [value].
  String toJson() => value;

  /// The network whose [value] is [value], or [unknown].
  static NetworkName fromValue(String value) => NetworkName.values.firstWhere(
        (network) => network.value == value,
        orElse: () => NetworkName.unknown,
      );
}

final Map<String, NetworkName> _prefixMap = {
  for (final entry in networks)
    entry.prefix: NetworkName.fromValue(entry.network),
};

/// Detects the mobile network for a Pakistani phone number from its prefix.
///
/// Returns the network the prefix was originally allocated to. Because of
/// Mobile Number Portability (MNP) and operator mergers, the current carrier
/// may differ. Returns [NetworkName.unknown] if the number is not a valid
/// Pakistani mobile number.
NetworkName getNetwork(String phone) {
  final prefix = getPhonePrefix(phone);
  if (prefix == null) return NetworkName.unknown;
  return _prefixMap[prefix] ?? NetworkName.unknown;
}
