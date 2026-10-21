/// Input normalization shared by the modules (mirrors src/internal/normalize.ts).
library;

import 'js.dart';

const String _urduDigits = '۰۱۲۳۴۵۶۷۸۹';
const String _arabicIndicDigits = '٠١٢٣٤٥٦٧٨٩';
final RegExp _nonLatinDigit = RegExp('[۰-۹٠-٩]');
final RegExp _separators = RegExp('[$ws\\-‐‑‒–—./()]');
final RegExp _whitespaceRun = RegExp('[$ws]+');

/// Converts Urdu (Extended Arabic-Indic) and Arabic-Indic digits to ASCII.
String toAsciiDigits(String input) =>
    input.replaceAllMapped(_nonLatinDigit, (match) {
      final char = match[0]!;
      final urdu = _urduDigits.indexOf(char);
      return '${urdu >= 0 ? urdu : _arabicIndicDigits.indexOf(char)}';
    });

/// Removes whitespace, hyphens and dashes, dots, slashes and parentheses.
String stripSeparators(String input) => input.replaceAll(_separators, '');

/// Collapses internal whitespace and trims leading/trailing whitespace.
String normalizeWhitespace(String input) =>
    jsTrim(input).replaceAll(_whitespaceRun, ' ');

/// Lowercase with collapsed whitespace.
String normalizeKey(String input) => jsToLowerCase(normalizeWhitespace(input));
