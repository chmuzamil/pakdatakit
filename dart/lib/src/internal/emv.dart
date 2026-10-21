/// EMVCo Merchant-Presented QR encoding (mirrors src/internal/emv.ts): a flat
/// list of `ID (2 digits) + length (2 digits) + value` fields, some of which
/// are templates containing nested fields, ending with a CRC.
library;

import 'dart:convert';

import 'equality.dart';

/// A parsed EMV QR field. [children] is set for template fields.
class EmvField {
  /// Creates a field.
  const EmvField(this.id, this.value, [this.children]);

  /// 2-digit field ID.
  final String id;

  /// Field value.
  final String value;

  /// Nested fields of a template field (IDs 26–51, 62, 64 and 80–99).
  final List<EmvField>? children;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'id': id,
        'value': value,
        if (children != null)
          'children': [for (final child in children!) child.toJson()],
      };

  @override
  bool operator ==(Object other) =>
      other is EmvField &&
      other.id == id &&
      other.value == value &&
      listEquals(other.children, children);

  @override
  int get hashCode => Object.hash(id, value, listHash(children));

  @override
  String toString() => 'EmvField${toJson()}';
}

/// Thrown by [parseFields] for malformed data.
class EmvSyntaxError implements Exception {
  EmvSyntaxError(this.message);

  final String message;

  @override
  String toString() => 'EmvSyntaxError: $message';
}

/// Template field IDs whose values contain nested fields.
bool isTemplateId(String id) {
  final n = int.parse(id);
  return (n >= 26 && n <= 51) || n == 62 || n == 64 || (n >= 80 && n <= 99);
}

/// CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), as 4 uppercase hex digits.
String crc16(String text) {
  var crc = 0xffff;
  for (final byte in utf8.encode(text)) {
    crc ^= byte << 8;
    for (var bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) != 0
          ? ((crc << 1) ^ 0x1021) & 0xffff
          : (crc << 1) & 0xffff;
    }
  }
  return crc.toRadixString(16).toUpperCase().padLeft(4, '0');
}

/// Encodes one field. Length counts characters, as the EMV spec requires.
String encodeField(String id, String value) {
  final length = value.runes.length;
  if (length > 99) {
    throw ArgumentError('EMV field $id is longer than 99 characters');
  }
  return '$id${length.toString().padLeft(2, '0')}$value';
}

final RegExp _header = RegExp(r'^\d{4}$');

/// Parses EMV fields. Throws [EmvSyntaxError] if the data is malformed.
List<EmvField> parseFields(String data, {bool nested = true}) {
  final chars = data.runes.toList();
  final fields = <EmvField>[];
  var i = 0;
  while (i < chars.length) {
    final end = i + 4 > chars.length ? chars.length : i + 4;
    final header = String.fromCharCodes(chars.sublist(i, end));
    if (!_header.hasMatch(header)) {
      throw EmvSyntaxError('Malformed EMV field at position $i');
    }
    final id = header.substring(0, 2);
    final length = int.parse(header.substring(2));
    if (i + 4 + length > chars.length) {
      throw EmvSyntaxError('EMV field $id is truncated');
    }
    final value = String.fromCharCodes(chars.sublist(i + 4, i + 4 + length));
    fields.add(EmvField(
      id,
      value,
      nested && isTemplateId(id)
          ? List.unmodifiable(parseFields(value, nested: false))
          : null,
    ));
    i += 4 + length;
  }
  return fields;
}

/// Appends the CRC field (63) to an encoded payload.
String withCrc(String payload) {
  final data = '${payload}6304';
  return '$data${crc16(data)}';
}
