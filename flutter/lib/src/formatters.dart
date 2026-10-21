import 'package:flutter/services.dart';
import 'package:pakdatakit/pakdatakit.dart';

import 'caret.dart';

/// Formats a CNIC as the user types: `35202-1234567-1`.
///
/// Keeps up to 13 digits (Urdu and Arabic-Indic digits are converted) and
/// inserts the dashes as the groups fill, using `formatCNICInput` from
/// `package:pakdatakit`. The caret stays after the same digit when dashes are
/// inserted or removed, and Backspace right after a dash deletes the digit
/// before it.
///
/// ```dart
/// TextField(inputFormatters: [CnicInputFormatter()])
/// ```
class CnicInputFormatter extends TextInputFormatter {
  /// Creates a CNIC formatter.
  CnicInputFormatter();

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) =>
      reformatEdit(oldValue, newValue, formatCNICInput, isDigitChar);
}

/// Formats a Pakistani mobile number as the user types: `0300-1234567`, or
/// `+92 300 1234567` when the user starts with the country code.
///
/// Uses `formatPhoneInput` from `package:pakdatakit`, keeping the caret after
/// the same digit. Urdu and Arabic-Indic digits are converted.
///
/// ```dart
/// TextField(inputFormatters: [PhoneInputFormatter()])
/// ```
class PhoneInputFormatter extends TextInputFormatter {
  /// Creates a phone number formatter.
  PhoneInputFormatter();

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) =>
      reformatEdit(oldValue, newValue, formatPhoneInput, isDigitChar);
}

/// Formats a Pakistani IBAN as the user types: uppercase, in groups of four
/// (`PK36 SCBL 0000 0011 2345 6702`), up to 24 characters.
///
/// Uses `formatIBANInput` from `package:pakdatakit`, keeping the caret after
/// the same letter or digit.
///
/// ```dart
/// TextField(inputFormatters: [IbanInputFormatter()])
/// ```
class IbanInputFormatter extends TextInputFormatter {
  /// Creates an IBAN formatter.
  IbanInputFormatter();

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) =>
      reformatEdit(oldValue, newValue, formatIBANInput, isAlphanumericChar);
}
