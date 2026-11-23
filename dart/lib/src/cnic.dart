import 'internal/js.dart';
import 'internal/normalize.dart';

/// 13 digits, optionally grouped as `#####-#######-#` with a dash, dash-like
/// character, dot, or space between the groups. The first digit is the
/// province code (1–8), so a leading 0 or 9 is rejected.
final RegExp _cnicPattern = RegExp(r'^[1-8]\d{4}([-‐‑‒–—. ]?)\d{7}\1\d$');
final RegExp _nonDigit = RegExp(r'\D');

/// Province of registration encoded in a CNIC's first digit.
const Map<String, String> _cnicProvinces = {
  '1': 'Khyber Pakhtunkhwa',
  '2': 'Khyber Pakhtunkhwa',
  '3': 'Punjab',
  '4': 'Sindh',
  '5': 'Balochistan',
  '6': 'Islamabad Capital Territory',
  '7': 'Gilgit-Baltistan',
  '8': 'Azad Jammu and Kashmir',
};

/// Gender encoded in the last digit of a CNIC.
enum Gender {
  /// Odd last digit.
  male('male'),

  /// Even last digit.
  female('female');

  const Gender(this.value);

  /// The value used by the npm package.
  final String value;

  /// Returns [value].
  String toJson() => value;
}

/// Information encoded in a CNIC number. See [getCNICInfo].
class CNICInfo {
  /// Creates a CNIC info value.
  const CNICInfo({
    required this.digits,
    required this.formatted,
    required this.province,
    required this.gender,
  });

  /// The CNIC as 13 digits without separators.
  final String digits;

  /// The CNIC in `#####-#######-#` form.
  final String formatted;

  /// Province where the CNIC was first registered (from the first digit).
  /// This is not necessarily where the holder lives now.
  final String province;

  /// Gender encoded in the last digit: odd for male, even for female.
  final Gender gender;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'digits': digits,
        'formatted': formatted,
        'province': province,
        'gender': gender.value,
      };

  @override
  bool operator ==(Object other) =>
      other is CNICInfo &&
      other.digits == digits &&
      other.formatted == formatted &&
      other.province == province &&
      other.gender == gender;

  @override
  int get hashCode => Object.hash(digits, formatted, province, gender);

  @override
  String toString() => 'CNICInfo${toJson()}';
}

/// Validates the format of a Pakistani CNIC number: 13 digits, in 5-7-1
/// groups or together, starting with a province code from 1 to 8.
///
/// Accepts `3520212345671`, `35202-1234567-1`, `35202 1234567 1` and Urdu
/// digits. Separators must sit between the 5-7-1 digit groups and be used
/// consistently.
///
/// NADRA does not publish a check-digit algorithm, so this validates
/// structure only.
bool validateCNIC(String cnic) =>
    _cnicPattern.hasMatch(toAsciiDigits(jsTrim(cnic)));

/// Reads the province of registration and gender encoded in a CNIC.
///
/// Returns `null` if the CNIC is invalid (see [validateCNIC]).
CNICInfo? getCNICInfo(String cnic) {
  if (!validateCNIC(cnic)) return null;
  final digits = toAsciiDigits(cnic).replaceAll(_nonDigit, '');
  final last = int.parse(digits[12]);
  return CNICInfo(
    digits: digits,
    formatted:
        '${digits.substring(0, 5)}-${digits.substring(5, 12)}-${digits[12]}',
    province: _cnicProvinces[digits[0]]!,
    gender: last.isOdd ? Gender.male : Gender.female,
  );
}

/// One digit: ASCII, Urdu (U+06F0-06F9) or Arabic-Indic (U+0660-0669).
const String _anyDigit = r'[0-9\u06F0-\u06F9\u0660-\u0669]';

/// A province digit (1-8) in any of the three scripts.
const String _provinceDigit = r'[1-8\u06F1-\u06F8\u0661-\u0668]';

/// Horizontal space between digit groups: a space, a tab, a no-break space
/// (U+00A0) or a narrow no-break space (U+202F). Never a line break.
const String _space = r'[ \t\u00A0\u202F]';

/// One separator mark: a hyphen or Unicode dash (U+2010-2014), a dot, a
/// slash or an underscore.
const String _mark = r'[-\u2010\u2011\u2012\u2013\u2014./_]';

/// What may join two digit groups: any run of spaces, or one mark with any
/// spaces around it (`35202  1234567  1`, `35202 -1234567- 1`,
/// `35202_1234567_1`, `35202 - 1234567 - 1`). A line break never joins them.
const String _join = '(?:$_space+|$_space*$_mark$_space*)';

/// One digit group: an unbroken run of digits.
final RegExp _group = RegExp('$_anyDigit+');

/// One line break: CRLF, LF or CR.
const String _lineBreak = r'(?:\r\n|\r|\n)';

/// With `acrossLines`: what [_join] allows, or the same with one line break
/// counting as a space (`35202\n1234567\n1`, `35202-\r\n1234567`). Only one
/// line break per gap, so a blank line never joins groups.
const String _joinLines = '(?:$_space*$_lineBreak$_space*(?:$_mark$_space*)?|'
    '$_space*$_mark$_space*$_lineBreak$_space*|$_join)';

/// Digit groups joined as above, as long as the run goes.
final RegExp _digitRun = RegExp('$_anyDigit+(?:$_join$_anyDigit+)*');

/// The same, joining across single line breaks (`acrossLines`).
final RegExp _digitRunLines = RegExp('$_anyDigit+(?:$_joinLines$_anyDigit+)*');
final RegExp _anyDigitPattern = RegExp(_anyDigit);
final RegExp _firstIsProvince = RegExp('^$_provinceDigit');

/// Where CNICs are in [text]: `(start, end)` pairs, in order. In each run of
/// digit groups, consecutive whole groups that add up to exactly 13 digits,
/// starting with a province digit, are a CNIC; the search goes on after it.
/// A group is never split, so 13 digits inside a longer unbroken number are
/// never matched.
List<(int, int)> _cnicSpans(String text, {bool acrossLines = false}) {
  final spans = <(int, int)>[];
  for (final run
      in (acrossLines ? _digitRunLines : _digitRun).allMatches(text)) {
    final groups = [
      for (final g in _group.allMatches(run[0]!))
        (start: run.start + g.start, end: run.start + g.end, text: g[0]!),
    ];
    for (var i = 0; i < groups.length; i++) {
      var digits = 0;
      for (var j = i; j < groups.length; j++) {
        digits += groups[j].text.length;
        if (digits < 13) continue;
        if (digits == 13 && _firstIsProvince.hasMatch(groups[i].text)) {
          spans.add((groups[i].start, groups[j].end));
          i = j;
        }
        break;
      }
    }
  }
  return spans;
}

/// A CNIC found by [findCNICs].
class CNICMatch {
  /// Creates a CNIC match.
  const CNICMatch({
    required this.raw,
    required this.digits,
    required this.formatted,
    required this.start,
    required this.end,
  });

  /// The text as written, e.g. `35202 1234567-1`, `352 0212 3456 71` or with
  /// Urdu digits.
  final String raw;

  /// The 13 digits, in ASCII.
  final String digits;

  /// The CNIC in `#####-#######-#` form.
  final String formatted;

  /// Offset of the first character in the text (UTF-16 code units, the
  /// index `String.substring` takes).
  final int start;

  /// Offset just after the last character (UTF-16 code units), so
  /// `text.substring(start, end) == raw`.
  final int end;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'raw': raw,
        'digits': digits,
        'formatted': formatted,
        'start': start,
        'end': end,
      };

  @override
  bool operator ==(Object other) =>
      other is CNICMatch &&
      other.raw == raw &&
      other.digits == digits &&
      other.formatted == formatted &&
      other.start == start &&
      other.end == end;

  @override
  int get hashCode => Object.hash(raw, digits, formatted, start, end);

  @override
  String toString() => 'CNICMatch${toJson()}';
}

/// Result of [maskCNICs].
class MaskedText {
  /// Creates a masked text value.
  const MaskedText({required this.text, required this.count});

  /// The text with every CNIC masked (or replaced, with `replacement`).
  final String text;

  /// How many CNICs were masked.
  final int count;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {'text': text, 'count': count};

  @override
  bool operator ==(Object other) =>
      other is MaskedText && other.text == text && other.count == count;

  @override
  int get hashCode => Object.hash(text, count);

  @override
  String toString() => 'MaskedText${toJson()}';
}

/// Finds CNIC numbers in free text, such as a chat message, a note or an
/// uploaded document, for example to mask them before logging.
///
/// Digits are read in groups (unbroken runs of digits). Groups may be joined
/// by any run of spaces or tabs, or by one mark (a hyphen or Unicode dash, a
/// dot, a slash or an underscore) with any spaces around it: `35202 1234567
/// 1`, `35202  1234567  1`, `35202 -1234567- 1`, `35202_1234567_1`,
/// `35202 - 1234567 - 1`, `352 0212 3456 71`, `35202/1234567/1`. A line
/// break joins groups only with [acrossLines] (below). A match is
/// consecutive whole groups that add up to exactly 13 digits, starting with
/// a province code (1-8); the search goes on after each match, so
/// `0300-1234567 35202-1234567-1` finds the CNIC. A group is never split, so
/// 13 digits inside a longer unbroken number (an IBAN, a card number) never
/// match. Digits may be ASCII, Urdu or Arabic-Indic, even mixed.
///
/// With [acrossLines] set to `true`, a single line break (`\r\n`, `\r` or
/// `\n`, with any spaces around it) also joins groups, so a CNIC written over
/// several lines is found; a blank line never joins them. This can also join
/// numbers on consecutive lines, such as a list of amounts. Default `false`.
///
/// Accepting any grouping catches CNICs as people really type them, but
/// matches more that is not a CNIC: any 13 digits starting with 1-8 split
/// into groups this way (an account, order or tracking number, table
/// columns, a price list such as `8260 - 8048 - 2804 - 0`, a file name such
/// as `IMG_20261123_12345`, or two shorter numbers written together) are
/// found. [validateCNIC] stays strict.
///
/// Offsets are UTF-16 code units, so `text.substring(m.start, m.end)` is
/// `m.raw`.
///
/// ```dart
/// findCNICs('CNIC: 35202-1234567-1, phone 0300-1234567');
/// // [CNICMatch(raw: 35202-1234567-1, digits: 3520212345671,
/// //   formatted: 35202-1234567-1, start: 6, end: 21)]
/// findCNICs('id 352 0212 3456 71').first.digits; // '3520212345671'
/// findCNICs('CNIC\n35202\n1234567\n1', acrossLines: true).first.formatted;
/// // '35202-1234567-1'
/// ```
///
/// Returns the matches in order, or an empty list. Never throws.
List<CNICMatch> findCNICs(String text, {bool acrossLines = false}) => [
      for (final (start, end) in _cnicSpans(text, acrossLines: acrossLines))
        _toMatch(text.substring(start, end), start),
    ];

CNICMatch _toMatch(String raw, int start) {
  final digits = toAsciiDigits(raw).replaceAll(_nonDigit, '');
  return CNICMatch(
    raw: raw,
    digits: digits,
    formatted:
        '${digits.substring(0, 5)}-${digits.substring(5, 12)}-${digits[12]}',
    start: start,
    end: start + raw.length,
  );
}

/// Masks every CNIC in free text, as found by [findCNICs]: each digit
/// becomes [mask] and the separators stay, so `35202-1234567-1` becomes
/// `XXXXX-XXXXXXX-X`. The rest of the text is unchanged.
///
/// With [replacement], each whole CNIC is replaced by that text instead.
///
/// Like [findCNICs], it also masks any other 13 digits that start with
/// 1-8, however they are grouped.
///
/// ```dart
/// maskCNICs('My CNIC is 35202-1234567-1');
/// // MaskedText(text: 'My CNIC is XXXXX-XXXXXXX-X', count: 1)
/// maskCNICs('35202 1234567 1', mask: '*');
/// // MaskedText(text: '***** ******* *', count: 1)
/// maskCNICs('CNIC 352 0212 3456 71', replacement: '[CNIC removed]');
/// // MaskedText(text: 'CNIC [CNIC removed]', count: 1)
/// ```
///
/// [mask] is the string that replaces each digit (default `'X'`);
/// [replacement], when given, is the string that replaces each whole CNIC,
/// separators included, and takes precedence over [mask]. [acrossLines]
/// also finds CNICs written across single line breaks, as in [findCNICs];
/// with [mask] the line breaks stay, with [replacement] they are replaced
/// with the rest of the CNIC (default `false`). Returns the masked text and
/// the number of CNICs masked. Never throws.
MaskedText maskCNICs(
  String text, {
  String mask = 'X',
  String? replacement,
  bool acrossLines = false,
}) {
  final spans = _cnicSpans(text, acrossLines: acrossLines);
  final out = StringBuffer();
  var at = 0;
  for (final (start, end) in spans) {
    out
      ..write(text.substring(at, start))
      ..write(replacement ??
          text.substring(start, end).replaceAll(_anyDigitPattern, mask));
    at = end;
  }
  out.write(text.substring(at));
  return MaskedText(text: out.toString(), count: spans.length);
}
