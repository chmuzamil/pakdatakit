import 'package:flutter/services.dart';

/// ASCII, Arabic-Indic and Extended Arabic-Indic (Urdu) digits.
final RegExp _digit = RegExp('[0-9٠-٩۰-۹]');

/// Letters and digits, as used in IBANs.
final RegExp _alphanumeric = RegExp('[A-Za-z0-9]');

/// Whether [ch] is a digit, including Arabic-Indic and Urdu digits.
bool isDigitChar(String ch) => _digit.hasMatch(ch);

/// Whether [ch] is an ASCII letter or digit.
bool isAlphanumericChar(String ch) => _alphanumeric.hasMatch(ch);

/// Number of significant characters in [text] before [end].
int _countSignificant(
  String text,
  int end,
  bool Function(String ch) isSignificant,
) {
  var count = 0;
  for (var i = 0; i < end && i < text.length; i++) {
    if (isSignificant(text[i])) count++;
  }
  return count;
}

/// Index just after the [count]-th significant character of [text].
int _indexAfter(
    String text, int count, bool Function(String ch) isSignificant) {
  if (count <= 0) return 0;
  var seen = 0;
  for (var i = 0; i < text.length; i++) {
    if (isSignificant(text[i]) && ++seen == count) return i + 1;
  }
  return text.length;
}

/// Reformats an edit and works out where the caret belongs.
///
/// A port of the React package's `reformat`. The caret stays after the same
/// number of significant characters (digits, or letters and digits for
/// IBANs) as before formatting, so separators the formatter inserts or
/// removes do not make it jump; at the end it stays at the end. Deleting only
/// a separator (Backspace right after a dash or space, or Delete right before
/// one) deletes the neighbouring character instead, since the formatter would
/// put the separator straight back.
TextEditingValue reformatEdit(
  TextEditingValue oldValue,
  TextEditingValue newValue,
  String Function(String value) format,
  bool Function(String ch) isSignificant,
) {
  var text = newValue.text;
  if (text == oldValue.text) return newValue;

  final selection = newValue.selection;
  var pos = selection.isValid
      ? selection.extentOffset.clamp(0, text.length)
      : text.length;

  final previous = oldValue.text;
  final oldSelection = oldValue.selection;
  // Flutter does not say which key made the edit, so recognise Backspace and
  // Delete from the text: separators removed next to a collapsed caret, the
  // rest unchanged.
  final removed = previous.length - text.length;
  final oldCaret = oldSelection.extentOffset;
  bool removedSeparatorsAt(int start) =>
      start >= 0 &&
      start + removed <= previous.length &&
      text ==
          previous.substring(0, start) + previous.substring(start + removed) &&
      _countSignificant(previous.substring(start, start + removed), removed,
              isSignificant) ==
          0;
  final removedOnlySeparators = removed > 0 &&
      oldSelection.isValid &&
      oldSelection.isCollapsed &&
      oldCaret <= previous.length &&
      (pos == oldCaret || pos == oldCaret - removed) &&
      removedSeparatorsAt(pos);

  if (removedOnlySeparators) {
    if (pos == oldCaret) {
      // Delete (forward): remove the next significant character.
      for (var i = pos; i < text.length; i++) {
        if (isSignificant(text[i])) {
          text = text.substring(0, i) + text.substring(i + 1);
          break;
        }
      }
    } else if (pos < oldCaret) {
      // Backspace: remove the previous significant character.
      for (var i = pos - 1; i >= 0; i--) {
        if (isSignificant(text[i])) {
          text = text.substring(0, i) + text.substring(i + 1);
          pos = i;
          break;
        }
      }
    }
  }

  final value = format(text);
  if (value == newValue.text) return newValue;

  final atEnd = pos >= text.length;
  final before = _countSignificant(text, pos, isSignificant);
  final caret = atEnd
      ? value.length
      : _indexAfter(value, before, isSignificant).clamp(0, value.length);
  return TextEditingValue(
    text: value,
    selection: TextSelection.collapsed(offset: caret),
  );
}
