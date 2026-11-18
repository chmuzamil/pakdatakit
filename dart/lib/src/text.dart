import 'internal/js.dart';
import 'internal/normalize.dart';
import 'internal/unicode.dart';

const String _urduDigits = '۰۱۲۳۴۵۶۷۸۹';
final RegExp _asciiDigit = RegExp(r'\d');

/// Common Roman Urdu spelling normalizations (informal → preferred).
///
/// Only unambiguous variants are listed: words like "men"/"mein" ("in") and
/// "main" ("I") are left alone because rewriting them changes the meaning.
final List<(RegExp, String)> _romanUrduReplacements = [
  for (final (pattern, replacement) in const [
    (r'\bkia\b', 'kya'),
    (r'\bker\b', 'kar'),
    (r'\bkr\b', 'kar'),
    (r'\bhy\b', 'hai'),
    (r'\bmujhay\b', 'mujhe'),
    (r'\bap\b', 'aap'),
    (r'\bshukria\b', 'shukriya'),
    (r'\bnhi\b', 'nahi'),
    (r'\bassalamu alaikum\b', 'assalamualaikum'),
    (r'\bassalam o alaikum\b', 'assalamualaikum'),
  ])
    (RegExp(pattern, caseSensitive: false), replacement),
];

/// Normalizes general text: trims, collapses whitespace and applies Unicode
/// NFC.
String normalizeText(String text) => normalizeWhitespace(toNfc(text));

/// Normalizes informal Roman Urdu spellings to common forms (`kia` → `kya`,
/// `nhi` → `nahi`).
///
/// Also applies [normalizeText] and converts Urdu/Arabic digits to English.
/// A capitalized word keeps its capital; all-caps words (acronyms such as
/// "AP") are left unchanged.
String normalizeRomanUrdu(String text) {
  var result = normalizeText(toEnglishDigits(text));
  for (final (pattern, replacement) in _romanUrduReplacements) {
    result = result.replaceAllMapped(
      pattern,
      (match) => _matchCase(match[0]!, replacement),
    );
  }
  return result;
}

/// Converts English and Arabic-Indic digits to Urdu digits (۰–۹).
String toUrduDigits(String text) => toAsciiDigits(text).replaceAllMapped(
      _asciiDigit,
      (match) => _urduDigits[int.parse(match[0]!)],
    );

/// Converts Urdu and Arabic-Indic digits to English digits (0–9).
String toEnglishDigits(String text) => toAsciiDigits(text);

String _matchCase(String original, String replacement) {
  if (original.length > 1 && original == jsToUpperCase(original)) {
    return original;
  }
  final first = original[0];
  if (first != jsToLowerCase(first)) {
    return jsToUpperCase(replacement[0]) + replacement.substring(1);
  }
  return replacement;
}

// ---------------------------------------------------------------------------
// Slugs, Urdu sorting and bidirectional text
// ---------------------------------------------------------------------------

/// Which letters [slugify] keeps.
enum SlugScript {
  /// Latin and Urdu letters (the default).
  any('any'),

  /// Only `a-z` (accented Latin-1 letters lose their accents).
  latin('latin'),

  /// Only Urdu letters.
  urdu('urdu');

  const SlugScript(this.value);

  /// The value used by the npm package, e.g. `"latin"`.
  final String value;

  /// Returns [value].
  String toJson() => value;
}

/// Marks and invisible characters that slugs and sorting skip.
bool _isSkipped(int cp) =>
    (cp >= 0x0300 && cp <= 0x036f) ||
    (cp >= 0x0610 && cp <= 0x061a) ||
    (cp >= 0x064b && cp <= 0x065f) ||
    cp == 0x0670 ||
    (cp >= 0x06d6 && cp <= 0x06ed) ||
    cp == 0x061c ||
    cp == 0x0640 ||
    (cp >= 0x200b && cp <= 0x200f) ||
    (cp >= 0x202a && cp <= 0x202e) ||
    (cp >= 0x2066 && cp <= 0x2069) ||
    cp == 0xfeff;

/// Arabic-script letters (Urdu letters and their Arabic look-alikes).
bool _isArabicLetter(int cp) =>
    (cp >= 0x0621 && cp <= 0x064a && cp != 0x0640) ||
    (cp >= 0x066e && cp <= 0x06d3) ||
    cp == 0x06d5 ||
    (cp >= 0x06fa && cp <= 0x06ff);

/// Arabic look-alikes written for Urdu letters: ك ي ى → ک ی ی.
const Map<int, int> _urduForArabic = {
  0x0643: 0x06a9,
  0x064a: 0x06cc,
  0x0649: 0x06cc,
};

/// Latin-1 letters with accents (lower case), folded to ASCII for slugs.
const Map<int, String> _latin1Fold = {
  0xe0: 'a', 0xe1: 'a', 0xe2: 'a', 0xe3: 'a', 0xe4: 'a', 0xe5: 'a', // à-å
  0xe6: 'ae', 0xe7: 'c', 0xe8: 'e', 0xe9: 'e', 0xea: 'e', 0xeb: 'e', // æ-ë
  0xec: 'i', 0xed: 'i', 0xee: 'i', 0xef: 'i', 0xf0: 'd', 0xf1: 'n', // ì-ñ
  0xf2: 'o', 0xf3: 'o', 0xf4: 'o', 0xf5: 'o', 0xf6: 'o', 0xf8: 'o', // ò-ø
  0xf9: 'u', 0xfa: 'u', 0xfb: 'u', 0xfc: 'u', 0xfd: 'y', 0xff: 'y', // ù-ÿ
  0xfe: 'th', 0xdf: 'ss', // þ ß
};

/// Turns text into a URL slug: lower-case words joined by `-`.
///
/// Urdu letters are kept as they are (no transliteration: Urdu does not write
/// short vowels, so there is no single Roman spelling). Diacritics, tatweel
/// and zero-width characters are dropped, the Arabic look-alikes ك ي ى become
/// the Urdu ک ی ی, Urdu and Arabic-Indic digits become `0-9`, and accented
/// Latin-1 letters lose their accents (`é` → `e`, `ß` → `ss`). Anything else
/// separates words. [script] limits which letters are kept; digits are always
/// kept, as `0-9`.
///
/// Returns `''` when nothing is left. Never throws.
///
/// ```dart
/// slugify('Lahore Fort, 2024'); // 'lahore-fort-2024'
/// slugify('لاہور قلعہ'); // 'لاہور-قلعہ'
/// slugify('لاہور Fort', script: SlugScript.latin); // 'fort'
/// slugify('کراچی ۲۰۲۴', script: SlugScript.urdu); // 'کراچی-2024'
/// ```
String slugify(String input, {SlugScript script = SlugScript.any}) {
  final keepLatin = script != SlugScript.urdu;
  final keepUrdu = script != SlugScript.latin;
  final out = StringBuffer();
  var pending = false;
  void push(String text) {
    if (pending && out.isNotEmpty) out.write('-');
    pending = false;
    out.write(text);
  }

  for (final cp in toAsciiDigits(input).runes) {
    if (_isSkipped(cp)) continue;
    if (cp >= 0x30 && cp <= 0x39) {
      push(String.fromCharCode(cp));
      continue;
    }
    if (keepLatin) {
      if (cp >= 0x61 && cp <= 0x7a) {
        push(String.fromCharCode(cp));
        continue;
      }
      if (cp >= 0x41 && cp <= 0x5a) {
        push(String.fromCharCode(cp + 0x20));
        continue;
      }
      // À-Þ (except ×) are the capitals of à-þ.
      final lower = cp >= 0xc0 && cp <= 0xde && cp != 0xd7 ? cp + 0x20 : cp;
      final folded = _latin1Fold[lower];
      if (folded != null) {
        push(folded);
        continue;
      }
    }
    if (keepUrdu && _isArabicLetter(cp)) {
      push(String.fromCharCode(_urduForArabic[cp] ?? cp));
      continue;
    }
    pending = true;
  }
  return out.toString();
}

/// Urdu letters in alphabetical order, from the CLDR `ur` collation
/// (common/collation/ur.xml, CLDR 49). Each letter followed by ھ (بھ, پھ, …)
/// is a letter of its own, right after it.
const List<String> _urduOrder = [
  'ا', 'آ', 'ب', 'بھ', 'پ', 'پھ', 'ت', 'تھ', 'ٹ', 'ٹھ', 'ث', 'ج', 'جھ', //
  'چ', 'چھ', 'ح', 'خ', 'د', 'دھ', 'ڈ', 'ڈھ', 'ذ', 'ر', 'رھ', 'ڑ', 'ڑھ', //
  'ز', 'ژ', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ک', //
  'کھ', 'گ', 'گھ', 'ل', 'لھ', 'م', 'مھ', 'ن', 'نھ', 'ں', 'ںھ', 'و', //
  'وھ', 'ہ', 'ھ', 'ۃ', 'ء', 'ی', 'یھ', 'ے', //
];

/// Letters with a hamza that sort as their base letter, secondarily after it.
const Map<int, int> _hamzaVariants = {
  0x0623: 0x0627, // أ → ا
  0x0624: 0x0648, // ؤ → و
  0x06c2: 0x06c1, // ۂ → ہ
  0x0626: 0x06cc, // ئ → ی
  0x06d3: 0x06d2, // ۓ → ے
};

/// Diacritics in CLDR's secondary order, from SUKUN (U+0652) to MADDA ABOVE
/// (U+0653).
const List<int> _diacritics = [
  0x0652, 0x064e, 0x0650, 0x064f, 0x0670, 0x0656, 0x0657, //
  0x064b, 0x064d, 0x064c, 0x0654, 0x0651, 0x0658, 0x0653, //
];

/// The secondary weight of HAMZA ABOVE (U+0654) in [_diacritics].
final int _hamzaAboveWeight = 1 + _diacritics.indexOf(0x0654);

final Map<String, int> _urduRank = {
  for (final (index, letter) in _urduOrder.indexed) letter: index,
};

// Primary groups, in sorting order.
const int _punctuation = 1;
const int _digit = 2;
const int _urdu = 3;
const int _otherArabic = 4;
const int _other = 5;

const int _alef = 0x0627;
const int _alefWithMadda = 0x0622;
const int _maddaAbove = 0x0653;
const int _doChashmiHe = 0x06be;

bool _isPunctuation(int cp) =>
    cp <= 0x2f ||
    (cp >= 0x3a && cp <= 0x40) ||
    (cp >= 0x5b && cp <= 0x60) ||
    (cp >= 0x7b && cp <= 0xbf) ||
    (cp >= 0x2000 && cp <= 0x206f) ||
    (cp >= 0x0600 && cp <= 0x060f) ||
    cp == 0x061b ||
    (cp >= 0x061d && cp <= 0x061f) ||
    (cp >= 0x066a && cp <= 0x066d) ||
    cp == 0x06d4;

int _digitValue(int cp) {
  if (cp >= 0x30 && cp <= 0x39) return cp - 0x30;
  if (cp >= 0x0660 && cp <= 0x0669) return cp - 0x0660;
  if (cp >= 0x06f0 && cp <= 0x06f9) return cp - 0x06f0;
  return -1;
}

bool _isArabicScript(int cp) =>
    (cp >= 0x0600 && cp <= 0x06ff) ||
    (cp >= 0x0750 && cp <= 0x077f) ||
    (cp >= 0x08a0 && cp <= 0x08ff) ||
    (cp >= 0xfb50 && cp <= 0xfdff) ||
    (cp >= 0xfe70 && cp <= 0xfeff);

/// A primary weight: the group times 2^21, plus the rank within the group.
/// At most 5 * 2^21 + 0x10ffff, well within JavaScript's exact integers.
int _weight(int group, int rank) => group * 0x200000 + rank;

({List<int> primary, List<int> secondary}) _collationKey(List<int> chars) {
  final primary = <int>[];
  final secondary = <int>[];
  int? next(int i) => i + 1 < chars.length ? chars[i + 1] : null;
  for (var i = 0; i < chars.length; i++) {
    final cp = chars[i];
    final diacritic = _diacritics.indexOf(cp);
    if (diacritic >= 0) {
      secondary.add(1 + diacritic);
      continue;
    }
    if (_isSkipped(cp)) continue;
    final base = _hamzaVariants[cp];
    var letter = base ?? cp;
    if (letter == _alef && next(i) == _maddaAbove) {
      letter = _alefWithMadda;
      i++;
    }
    final name = String.fromCharCode(letter);
    final rank = _urduRank[name];
    if (rank != null) {
      final joined = next(i) == _doChashmiHe
          ? _urduRank[name + String.fromCharCode(_doChashmiHe)]
          : null;
      if (joined != null) {
        primary.add(_weight(_urdu, joined));
        i++;
      } else {
        primary.add(_weight(_urdu, rank));
      }
      secondary.add(0);
      if (base != null) secondary.add(_hamzaAboveWeight);
      continue;
    }
    final digit = _digitValue(cp);
    if (digit >= 0) {
      primary.add(_weight(_digit, digit));
    } else if (_isPunctuation(cp)) {
      primary.add(_weight(_punctuation, cp));
    } else if (_isArabicScript(cp)) {
      primary.add(_weight(_otherArabic, cp));
    } else {
      primary.add(_weight(_other, cp >= 0x41 && cp <= 0x5a ? cp + 0x20 : cp));
    }
    secondary.add(0);
  }
  return (primary: primary, secondary: secondary);
}

int _compareLists(List<int> a, List<int> b) {
  final length = a.length < b.length ? a.length : b.length;
  for (var i = 0; i < length; i++) {
    final x = a[i];
    final y = b[i];
    if (x != y) return x < y ? -1 : 1;
  }
  if (a.length == b.length) return 0;
  return a.length < b.length ? -1 : 1;
}

/// Compares two strings in Urdu alphabetical order, for [List.sort].
///
/// Letters follow the Unicode CLDR collation for Urdu (`ur`, CLDR 49):
/// ا آ ب بھ پ پھ ت تھ ٹ ٹھ ث ج جھ چ چھ ح خ د دھ ڈ ڈھ ذ ر رھ ڑ ڑھ ز ژ س ش ص ض
/// ط ظ ع غ ف ق ک کھ گ گھ ل لھ م مھ ن نھ ں ںھ و وھ ہ ھ ۃ ء ی یھ ے. A letter
/// joined with ھ is a letter of its own (so بھ comes after every other ب
/// word). أ ؤ ۂ ئ ۓ sort as ا و ہ ی ے and come just after them when words
/// are otherwise equal, and diacritics only break ties, in CLDR's order.
///
/// Outside the Urdu letters: spaces and punctuation come first, then digits
/// digit by digit (Urdu, Arabic-Indic and ASCII digits are equal; `10` comes
/// before `2`), then Urdu letters, then other Arabic-script characters (the
/// look-alikes ك ي ى ه ة, which CLDR does not treat as Urdu letters), then
/// everything else by code point, ignoring ASCII case. Strings that are
/// still equal are ordered by code point, so the result is 0 only for
/// identical strings. The order is the same on every platform; ICU is not
/// used.
///
/// Returns `-1`, `0` or `1`. Never throws.
///
/// ```dart
/// ['ے', 'بھائی', 'آم', 'باغ', 'اب']..sort(compareUrdu);
/// // ['اب', 'آم', 'باغ', 'بھائی', 'ے']
/// ```
int compareUrdu(String a, String b) {
  if (a == b) return 0;
  final x = a.runes.toList();
  final y = b.runes.toList();
  final kx = _collationKey(x);
  final ky = _collationKey(y);
  var result = _compareLists(kx.primary, ky.primary);
  if (result == 0) result = _compareLists(kx.secondary, ky.secondary);
  if (result == 0) result = _compareLists(x, y);
  return result;
}

/// Letters of right-to-left scripts (Hebrew, Arabic, Syriac, Thaana, …).
bool _isRtlCodePoint(int cp) =>
    (cp >= 0x0590 && cp <= 0x08ff) ||
    (cp >= 0xfb1d && cp <= 0xfdff) ||
    (cp >= 0xfe70 && cp <= 0xfeff) ||
    (cp >= 0x10800 && cp <= 0x10fff) ||
    (cp >= 0x1e800 && cp <= 0x1efff);

final RegExp _letter = RegExp(r'^\p{L}$', unicode: true);

/// Whether text reads right to left: its first letter is from a right-to-left
/// script such as Urdu or Arabic. Digits, punctuation and spaces are skipped,
/// as in the Unicode bidirectional algorithm's paragraph rule.
///
/// Returns `false` when there is no letter. Never throws.
///
/// ```dart
/// isRTL('سلام'); // true
/// isRTL('123 سلام'); // true
/// isRTL('Order نمبر'); // false
/// ```
bool isRTL(String text) {
  for (final cp in text.runes) {
    // ASCII letters and non-letters are decided without the regex.
    if (cp < 0x80) {
      if ((cp | 0x20) >= 0x61 && (cp | 0x20) <= 0x7a) return false;
      continue;
    }
    if (_letter.hasMatch(String.fromCharCode(cp))) return _isRtlCodePoint(cp);
  }
  return false;
}

/// Direction for [wrapBidi].
enum BidiDirection {
  /// FIRST STRONG ISOLATE (U+2068): the direction of the first letter.
  auto('auto'),

  /// RIGHT-TO-LEFT ISOLATE (U+2067).
  rtl('rtl'),

  /// LEFT-TO-RIGHT ISOLATE (U+2066).
  ltr('ltr');

  const BidiDirection(this.value);

  /// The value used by the npm package, e.g. `"rtl"`.
  final String value;

  /// Returns [value].
  String toJson() => value;
}

/// Wraps text in Unicode directional isolates, so a name or number in one
/// direction does not reorder the sentence around it (for example an English
/// order number inside an Urdu message).
///
/// Uses FIRST STRONG ISOLATE (U+2068) by default, RIGHT-TO-LEFT ISOLATE
/// (U+2067) for [BidiDirection.rtl] and LEFT-TO-RIGHT ISOLATE (U+2066) for
/// [BidiDirection.ltr], closed with POP DIRECTIONAL ISOLATE (U+2069). Never
/// throws.
///
/// ```dart
/// 'آرڈر ${wrapBidi('PDK-1042')} بھیج دیا گیا';
/// ```
String wrapBidi(String text, [BidiDirection direction = BidiDirection.auto]) {
  final open = switch (direction) {
    BidiDirection.rtl => '\u2067',
    BidiDirection.ltr => '\u2066',
    BidiDirection.auto => '\u2068',
  };
  return '$open$text\u2069';
}
