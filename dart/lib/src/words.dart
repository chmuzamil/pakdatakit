import 'internal/js.dart';

/// Language for number words.
enum WordsLanguage {
  /// English.
  en('en'),

  /// Urdu.
  ur('ur');

  const WordsLanguage(this.value);

  /// The value used by the npm package.
  final String value;

  /// Returns [value].
  String toJson() => value;
}

/// Pakistani scale words, largest first.
const List<({int value, String en, String ur})> _scales = [
  (value: 100000000000, en: 'kharab', ur: 'کھرب'),
  (value: 1000000000, en: 'arab', ur: 'ارب'),
  (value: 10000000, en: 'crore', ur: 'کروڑ'),
  (value: 100000, en: 'lakh', ur: 'لاکھ'),
  (value: 1000, en: 'thousand', ur: 'ہزار'),
  (value: 100, en: 'hundred', ur: 'سو'),
];

const List<String> _enOnes = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];

const List<String> _enTens = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
];

/// Urdu has a distinct word for every number from 0 to 99.
const List<String> _ur0To99 = [
  'صفر', 'ایک', 'دو', 'تین', 'چار', 'پانچ', 'چھ', 'سات', 'آٹھ', 'نو', //
  'دس', 'گیارہ', 'بارہ', 'تیرہ', 'چودہ', 'پندرہ', 'سولہ', 'سترہ', 'اٹھارہ',
  'انیس', 'بیس', 'اکیس', 'بائیس', 'تئیس', 'چوبیس', 'پچیس', 'چھبیس', 'ستائیس',
  'اٹھائیس', 'انتیس', 'تیس', 'اکتیس', 'بتیس', 'تینتیس', 'چونتیس', 'پینتیس',
  'چھتیس', 'سینتیس', 'اڑتیس', 'انتالیس', 'چالیس', 'اکتالیس', 'بیالیس',
  'تینتالیس', 'چوالیس', 'پینتالیس', 'چھیالیس', 'سینتالیس', 'اڑتالیس', 'انچاس',
  'پچاس', 'اکاون', 'باون', 'ترپن', 'چون', 'پچپن', 'چھپن', 'ستاون', 'اٹھاون',
  'انسٹھ', 'ساٹھ', 'اکسٹھ', 'باسٹھ', 'ترسٹھ', 'چونسٹھ', 'پینسٹھ', 'چھیاسٹھ',
  'سڑسٹھ', 'اڑسٹھ', 'انہتر', 'ستر', 'اکہتر', 'بہتر', 'تہتر', 'چوہتر', 'پچھتر',
  'چھہتر', 'ستتر', 'اٹھہتر', 'اناسی', 'اسی', 'اکیاسی', 'بیاسی', 'تراسی',
  'چوراسی', 'پچاسی', 'چھیاسی', 'ستاسی', 'اٹھاسی', 'نواسی', 'نوے', 'اکانوے',
  'بانوے', 'ترانوے', 'چورانوے', 'پچانوے', 'چھیانوے', 'ستانوے', 'اٹھانوے',
  'ننانوے',
];

String _underHundred(int n, WordsLanguage language) {
  if (language == WordsLanguage.ur) return _ur0To99[n];
  if (n < 20) return _enOnes[n];
  final tens = _enTens[n ~/ 10];
  return n % 10 == 0 ? tens : '$tens-${_enOnes[n % 10]}';
}

/// Converts a positive integer using the lakh/crore/arab/kharab scale.
List<String> _convert(int n, WordsLanguage language) {
  for (final scale in _scales) {
    if (n >= scale.value) {
      // Math.floor(n / value), computed in floating point as in JavaScript.
      final count = (n / scale.value).floor();
      final rest = n % scale.value;
      return [
        ..._convert(count, language),
        language == WordsLanguage.ur ? scale.ur : scale.en,
        if (rest > 0) ..._convert(rest, language),
      ];
    }
  }
  return [_underHundred(n, language)];
}

/// Converts a whole number to words using the Pakistani numbering system
/// (hundred, thousand, lakh, crore, arab, kharab).
///
/// ```dart
/// numberToWords(125000); // 'one lakh twenty-five thousand'
/// numberToWords(125000, language: WordsLanguage.ur); // 'ایک لاکھ پچیس ہزار'
/// ```
///
/// Throws an [ArgumentError] (a `RangeError` in the npm package) if [n] is
/// not a safe integer (a whole number within ±(2^53 − 1)).
String numberToWords(num n, {WordsLanguage language = WordsLanguage.en}) {
  if (!isSafeInteger(n)) {
    throw ArgumentError.value(n, 'n', 'Expected a safe integer');
  }
  if (n == 0) return _underHundred(0, language);
  final words = _convert(n.abs().toInt(), language).join(' ');
  if (n > 0) return words;
  return language == WordsLanguage.ur ? 'منفی $words' : 'minus $words';
}

final RegExp _wordStart = RegExp('(^|[$ws-])([a-z])');

String _titleCase(String text) => text.replaceAllMapped(
      _wordStart,
      (match) => '${match[1]}${match[2]!.toUpperCase()}',
    );

/// Writes a rupee amount in words, with paisa, as used on Pakistani cheques
/// and invoices. Amounts are rounded to the nearest paisa.
///
/// With [cheque], gives the cheque style: `"Rupees One Lakh Twenty-Five
/// Thousand Only"` in English, or the words followed by `"روپے صرف"` in Urdu.
///
/// ```dart
/// amountInWords(125000.5);
/// // 'one lakh twenty-five thousand rupees and fifty paisa'
/// amountInWords(125000, cheque: true);
/// // 'Rupees One Lakh Twenty-Five Thousand Only'
/// ```
///
/// Throws an [ArgumentError] (a `RangeError` in the npm package) if [amount]
/// is negative, not finite, or too large.
String amountInWords(
  num amount, {
  WordsLanguage language = WordsLanguage.en,
  bool cheque = false,
}) {
  if (!amount.isFinite || amount < 0) {
    throw ArgumentError.value(
      amount,
      'amount',
      'Must be a finite number of zero or more',
    );
  }

  final totalPaisa = jsRound(amount.toDouble() * 100);
  final rupees = (totalPaisa / 100).floorToDouble();
  final paisa = totalPaisa % 100;
  final rupeeWords = numberToWords(rupees, language: language);
  final paisaWords =
      paisa > 0 ? numberToWords(paisa, language: language) : null;

  if (language == WordsLanguage.ur) {
    var text = '$rupeeWords روپے';
    if (paisaWords != null) text += ' اور $paisaWords پیسے';
    return cheque ? '$text صرف' : text;
  }

  if (cheque) {
    final paisaPart = paisaWords != null ? ' and $paisaWords paisa' : '';
    return _titleCase('rupees $rupeeWords$paisaPart only')
        .replaceFirst(' And ', ' and ');
  }

  var text = '$rupeeWords ${rupees == 1 ? 'rupee' : 'rupees'}';
  if (paisaWords != null) text += ' and $paisaWords paisa';
  return text;
}
