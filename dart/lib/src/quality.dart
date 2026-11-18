import 'address.dart';
import 'internal/equality.dart';
import 'internal/js.dart';
import 'internal/normalize.dart';
import 'numbers.dart';
import 'postal.dart';

/// A part of a delivery address that [scoreAddress] looks for.
enum AddressPart {
  /// A known city (or district).
  city('city'),

  /// A house, plot, flat or street number.
  houseNumber('houseNumber'),

  /// A street, road or lane.
  street('street'),

  /// An area within the city: block, sector, phase, town, colony, …
  area('area'),

  /// A postal code that is a known post office.
  postalCode('postalCode'),

  /// A landmark ("near", "opp", "nazd", "qareeb", "سامنے", …).
  landmark('landmark');

  const AddressPart(this.value);

  /// The value used by the npm package, e.g. `"houseNumber"`.
  final String value;

  /// Returns [value].
  String toJson() => value;
}

/// Result of [scoreAddress].
class AddressScore {
  /// Creates an address score.
  const AddressScore({
    required this.score,
    required this.missing,
    required this.parsed,
  });

  /// 0 (unusable) to 100 (every part present and consistent).
  final int score;

  /// Parts not found, in the order of [addressWeights].
  final List<AddressPart> missing;

  /// The address as [parseAddress] reads it, with any extra warnings.
  final ParsedAddress parsed;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'score': score,
        'missing': [for (final part in missing) part.value],
        'parsed': parsed.toJson(),
      };

  @override
  bool operator ==(Object other) =>
      other is AddressScore &&
      other.score == score &&
      listEquals(other.missing, missing) &&
      other.parsed == parsed;

  @override
  int get hashCode => Object.hash(score, listHash(missing), parsed);

  @override
  String toString() => 'AddressScore${toJson()}';
}

/// Points for each part of an address. They add up to 100. A postal code
/// scores in full only when it is a known post office code; an unknown one
/// scores 5.
const Map<AddressPart, int> addressWeights = {
  AddressPart.city: 30,
  AddressPart.houseNumber: 20,
  AddressPart.street: 15,
  AddressPart.area: 10,
  AddressPart.postalCode: 15,
  AddressPart.landmark: 10,
};

const int _unknownPostalCodePoints = 5;

/// Taken off when the post office and the city are in different provinces.
const int _mismatchPenalty = 15;

/// Words that introduce a landmark, in English and Roman Urdu.
const List<String> _landmarkWords = [
  'near',
  'nr',
  'opposite',
  'opp',
  'behind',
  'beside',
  'besides',
  'adjacent',
  'next to',
  'in front of',
  'facing',
  'nazd',
  'nazdeek',
  'nazdik',
  'qareeb',
  'qarib',
  'kareeb',
  'samne',
  'saamne',
  'samnay',
  'peeche',
  'peechay',
  'pichay',
  'bil muqabil',
  'bilmuqabil',
  'muttasil',
  'mutasil',
];

/// The same, in Urdu script.
const List<String> _urduLandmarkWords = [
  'نزد',
  'نزدیک',
  'قریب',
  'سامنے',
  'پیچھے',
  'بالمقابل',
  'متصل',
];

/// Words that name a street or lane.
const List<String> _streetWords = [
  'street',
  'st',
  'road',
  'rd',
  'lane',
  'gali',
  'avenue',
  'ave',
  'boulevard',
  'blvd',
  'chowk',
  'bazar',
  'bazaar',
  'mohalla',
  'muhalla',
];

const List<String> _urduStreetWords = [
  'گلی',
  'سڑک',
  'روڈ',
  'محلہ',
  'چوک',
  'بازار'
];

/// Words that name an area within a city.
const List<String> _areaWords = [
  'block',
  'sector',
  'phase',
  'town',
  'colony',
  'society',
  'scheme',
  'housing',
  'garden',
  'gardens',
  'park',
  'estate',
  'abad',
  'nagar',
  'cantt',
  'cantonment',
];

const List<String> _urduAreaWords = [
  'بلاک',
  'سیکٹر',
  'فیز',
  'ٹاؤن',
  'کالونی',
  'سوسائٹی',
];

final RegExp _nonWord = RegExp('[^a-z0-9؀-ۿ]+');
final RegExp _houseNumber = RegExp(r' \d+[a-z]{0,2} ');

/// Lower-cases, folds Urdu digits and collapses everything but letters and
/// digits to single spaces.
String _words(String text) =>
    ' ${jsTrim(jsToLowerCase(toAsciiDigits(text)).replaceAll(_nonWord, ' '))} ';

bool _hasWord(String haystack, List<String> list) =>
    list.any((word) => haystack.contains(' $word '));

bool _hasUrdu(String text, List<String> list) => list.any(text.contains);

/// Scores how complete a free-form Pakistani delivery address is, for cash on
/// delivery and other courier use.
///
/// Built on [parseAddress]. It looks for a city, a house, plot or flat
/// number, a street, an area, a postal code and a landmark ("near", "opp",
/// "nazd", "qareeb", "سامنے" …), and adds up [addressWeights]. A postal code
/// that is a known post office raises the score more than an unknown one,
/// and a post office in a different province from the city lowers it (with a
/// warning in [ParsedAddress.warnings]).
///
/// This is a heuristic: it says how much an address tells a rider, not
/// whether the address exists. It never throws.
///
/// ```dart
/// scoreAddress('House 12, Street 4, Block B, Gulberg III, '
///     'near Liberty Market, Lahore 54660').score; // 100
/// ```
AddressScore scoreAddress(String input) {
  final text = normalizeWhitespace(input);
  final parsed = parseAddress(text);
  final found = <AddressPart>{};
  final lowered = _words(text);
  final postal = parsed.postalCode;
  // The text without the postal code, for the house-number check.
  final rest =
      postal == null ? lowered : lowered.replaceFirst(' $postal ', ' ');

  if (parsed.city != null) found.add(AddressPart.city);
  // A number other than the postal code: house, plot, flat or street number
  // ("12", "12b", "4th").
  if (_houseNumber.hasMatch(rest)) found.add(AddressPart.houseNumber);
  if (_hasWord(lowered, _streetWords) || _hasUrdu(text, _urduStreetWords)) {
    found.add(AddressPart.street);
  }
  if (parsed.area != null ||
      _hasWord(lowered, _areaWords) ||
      _hasUrdu(text, _urduAreaWords)) {
    found.add(AddressPart.area);
  }
  if (_hasWord(lowered, _landmarkWords) || _hasUrdu(text, _urduLandmarkWords)) {
    found.add(AddressPart.landmark);
  }

  var score = 0;
  final warnings = [...parsed.warnings];
  for (final part in found) {
    score += addressWeights[part]!;
  }

  if (postal != null) {
    final office = getPostOffice(postal);
    if (office == null) {
      score += _unknownPostalCodePoints;
    } else {
      found.add(AddressPart.postalCode);
      score += addressWeights[AddressPart.postalCode]!;
      final province = parsed.province;
      if (province != null && office.province != province) {
        score -= _mismatchPenalty;
        warnings.add(
          'Postal code $postal is in ${office.province}, '
          'but the address is in $province',
        );
      }
    }
  }

  return AddressScore(
    score: score.clamp(0, 100),
    missing: List.unmodifiable([
      for (final part in addressWeights.keys)
        if (!found.contains(part)) part,
    ]),
    parsed: ParsedAddress(
      raw: parsed.raw,
      street: parsed.street,
      area: parsed.area,
      city: parsed.city,
      district: parsed.district,
      province: parsed.province,
      postalCode: parsed.postalCode,
      warnings: List.unmodifiable(warnings),
    ),
  );
}

/// A reason to double-check a phone number given for a delivery. See
/// [phoneRiskSignals].
enum PhoneRiskFlag {
  /// Not a Pakistani phone number.
  invalid('invalid'),

  /// A fixed-line number (no SMS, often unanswered).
  landline('landline'),

  /// A UAN, toll-free or other service number.
  notMobile('not-mobile'),

  /// The 7-digit subscriber part uses at most two different digits.
  repeatedDigits('repeated-digits'),

  /// The subscriber part is a run such as `1234567` or `7654321`.
  sequentialDigits('sequential-digits'),

  /// A placeholder often typed into forms.
  testNumber('test-number');

  const PhoneRiskFlag(this.value);

  /// The value used by the npm package, e.g. `"repeated-digits"`.
  final String value;

  /// Returns [value].
  String toJson() => value;
}

const String _ascending = '01234567890';
const String _descending = '09876543210';

/// Flags a phone number that a courier cannot reach by SMS or call, or that
/// looks made up. Pure heuristics on the number itself: no list of real
/// numbers, no personal data, no network call.
///
/// - [PhoneRiskFlag.invalid]: not a Pakistani phone number.
/// - [PhoneRiskFlag.landline]: a fixed-line number (no SMS, often
///   unanswered).
/// - [PhoneRiskFlag.notMobile]: a UAN, toll-free or other service number.
/// - [PhoneRiskFlag.repeatedDigits]: the 7-digit subscriber part uses at most
///   two different digits (`0300-0000000`, `0300-1111112`).
/// - [PhoneRiskFlag.sequentialDigits]: the subscriber part is a run such as
///   `1234567` or `7654321`.
/// - [PhoneRiskFlag.testNumber]: a placeholder often typed into forms
///   (`03XX-1234567`, `03XX-7654321`, `0312-3456789`).
///
/// A valid mobile number with nothing suspicious returns `[]`. It never
/// throws.
List<PhoneRiskFlag> phoneRiskSignals(String input) {
  final info = analyzeNumber(input);
  if (info == null) return const [PhoneRiskFlag.invalid];
  if (info.type == NumberType.landline) return const [PhoneRiskFlag.landline];
  final e164 = info.e164;
  if (info.type != NumberType.mobile || e164 == null) {
    return const [PhoneRiskFlag.notMobile];
  }

  final national = e164.substring(3); // 3XXXXXXXXX
  final subscriber = national.substring(3);
  final flags = <PhoneRiskFlag>[];
  if (subscriber.split('').toSet().length <= 2) {
    flags.add(PhoneRiskFlag.repeatedDigits);
  }
  if (_ascending.contains(subscriber) || _descending.contains(subscriber)) {
    flags.add(PhoneRiskFlag.sequentialDigits);
  }
  if (subscriber == '1234567' ||
      subscriber == '7654321' ||
      national == '3123456789') {
    flags.add(PhoneRiskFlag.testNumber);
  }
  return List.unmodifiable(flags);
}
