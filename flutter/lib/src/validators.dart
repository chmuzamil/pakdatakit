import 'package:flutter/widgets.dart';
import 'package:pakdatakit/pakdatakit.dart';

/// Validators for [FormField.validator], e.g. on a `TextFormField`.
///
/// Each returns `null` when the value is valid, and an error message
/// otherwise. An empty value is an error only when `required` is `true` (the
/// default). Messages are in English and can be replaced.
///
/// ```dart
/// TextFormField(validator: PakValidators.cnic())
/// TextFormField(validator: PakValidators.phone(required: false))
/// TextFormField(validator: PakValidators.iban(message: 'IBAN galat hai'))
/// ```
abstract final class PakValidators {
  /// Default message for an empty required field.
  static const String defaultRequiredMessage = 'This field is required';

  /// Default message for an invalid CNIC.
  static const String defaultCnicMessage = 'Enter a valid CNIC';

  /// Default message for an invalid mobile number.
  static const String defaultPhoneMessage = 'Enter a valid mobile number';

  /// Default message for an invalid IBAN.
  static const String defaultIbanMessage = 'Enter a valid IBAN';

  /// Default message for an invalid NTN.
  static const String defaultNtnMessage = 'Enter a valid NTN';

  /// Default message for an invalid STRN.
  static const String defaultStrnMessage = 'Enter a valid STRN';

  /// Default message for an invalid landline number.
  static const String defaultLandlineMessage = 'Enter a valid landline number';

  static FormFieldValidator<String> _build(
    bool Function(String value) isValid,
    String message,
    bool required,
    String? requiredMessage,
  ) {
    return (String? value) {
      final text = value?.trim() ?? '';
      if (text.isEmpty) {
        return required ? (requiredMessage ?? defaultRequiredMessage) : null;
      }
      return isValid(text) ? null : message;
    };
  }

  /// Validates a CNIC (`35202-1234567-1` or 13 digits), using `validateCNIC`.
  static FormFieldValidator<String> cnic({
    String? message,
    bool required = true,
    String? requiredMessage,
  }) =>
      _build(
        validateCNIC,
        message ?? defaultCnicMessage,
        required,
        requiredMessage,
      );

  /// Validates a Pakistani mobile number in local, international or short
  /// form, using `validatePhone`.
  static FormFieldValidator<String> phone({
    String? message,
    bool required = true,
    String? requiredMessage,
  }) =>
      _build(
        validatePhone,
        message ?? defaultPhoneMessage,
        required,
        requiredMessage,
      );

  /// Validates a Pakistani IBAN, with or without spaces, using
  /// `validateIBAN`. Lowercase is accepted.
  static FormFieldValidator<String> iban({
    String? message,
    bool required = true,
    String? requiredMessage,
  }) =>
      _build(
        validateIBAN,
        message ?? defaultIbanMessage,
        required,
        requiredMessage,
      );

  /// Validates a National Tax Number, using `validateNTN`.
  static FormFieldValidator<String> ntn({
    String? message,
    bool required = true,
    String? requiredMessage,
  }) =>
      _build(
        validateNTN,
        message ?? defaultNtnMessage,
        required,
        requiredMessage,
      );

  /// Validates a Sales Tax Registration Number, using `validateSTRN`.
  static FormFieldValidator<String> strn({
    String? message,
    bool required = true,
    String? requiredMessage,
  }) =>
      _build(
        validateSTRN,
        message ?? defaultStrnMessage,
        required,
        requiredMessage,
      );

  /// Validates a Pakistani landline number, using `validateLandline`.
  static FormFieldValidator<String> landline({
    String? message,
    bool required = true,
    String? requiredMessage,
  }) =>
      _build(
        validateLandline,
        message ?? defaultLandlineMessage,
        required,
        requiredMessage,
      );
}
