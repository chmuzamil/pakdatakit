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
