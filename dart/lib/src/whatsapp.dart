import 'internal/phone_utils.dart';

final RegExp _loneSurrogate = RegExp(
    r'[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]');

/// Creates a WhatsApp click-to-chat (`wa.me`) link for a Pakistani mobile
/// number in any supported format, with an optional pre-filled [message]
/// (URL-encoded like JavaScript's `encodeURIComponent`).
///
/// Returns `null` if the phone number is invalid. Throws an [ArgumentError]
/// (a `URIError` in the npm package) if [message] contains an unpaired
/// surrogate, which cannot be URL-encoded.
String? createWhatsAppLink(String phone, [String? message]) {
  final digits = normalizePhoneDigits(phone);
  if (digits == null) return null;
  final baseUrl = 'https://wa.me/$digits';
  if (message == null || message.isEmpty) return baseUrl;
  if (_loneSurrogate.hasMatch(message)) {
    throw ArgumentError.value(message, 'message', 'Contains a lone surrogate');
  }
  return '$baseUrl?text=${Uri.encodeComponent(message)}';
}
