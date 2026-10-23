import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pakdatakit_flutter/pakdatakit_flutter.dart';

/// A value with a collapsed caret at [caret] (the end by default).
TextEditingValue v(String text, [int? caret]) => TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: caret ?? text.length),
    );

/// Types [text] one character at a time at the end, like a user would.
TextEditingValue typeAll(TextInputFormatter formatter, String text) {
  var value = TextEditingValue.empty;
  for (final ch in text.split('')) {
    value = formatter.formatEditUpdate(value, v(value.text + ch));
  }
  return value;
}

/// Inserts [inserted] at the caret of [old] (a collapsed selection).
TextEditingValue insert(
  TextInputFormatter formatter,
  TextEditingValue old,
  String inserted,
) {
  final caret = old.selection.baseOffset;
  final text =
      old.text.substring(0, caret) + inserted + old.text.substring(caret);
  return formatter.formatEditUpdate(old, v(text, caret + inserted.length));
}

/// Presses Backspace with the caret of [old].
TextEditingValue backspace(TextInputFormatter formatter, TextEditingValue old) {
  final caret = old.selection.baseOffset;
  final text = old.text.substring(0, caret - 1) + old.text.substring(caret);
  return formatter.formatEditUpdate(old, v(text, caret - 1));
}

/// Presses Delete (forward) with the caret of [old].
TextEditingValue deleteForward(
  TextInputFormatter formatter,
  TextEditingValue old,
) {
  final caret = old.selection.baseOffset;
  final text = old.text.substring(0, caret) + old.text.substring(caret + 1);
  return formatter.formatEditUpdate(old, v(text, caret));
}

void expectValue(TextEditingValue actual, String text, int caret) {
  expect(actual.text, text);
  expect(actual.selection, TextSelection.collapsed(offset: caret));
}

void main() {
  group('CnicInputFormatter', () {
    final f = CnicInputFormatter();

    test('formats while typing', () {
      expectValue(typeAll(f, '35202'), '35202', 5);
      expectValue(typeAll(f, '352021'), '35202-1', 7);
      expectValue(typeAll(f, '3520212345671'), '35202-1234567-1', 15);
    });

    test('drops other characters and stops at 13 digits', () {
      expectValue(typeAll(f, '35202a1234567-1'), '35202-1234567-1', 15);
      expectValue(
        f.formatEditUpdate(v('35202-1234567-1'), v('35202-1234567-19')),
        '35202-1234567-1',
        15,
      );
    });

    test('keeps the caret after the same digit when inserting', () {
      // Caret after "352", type 9.
      expectValue(insert(f, v('35202-123', 3), '9'), '35290-2123', 4);
      // Caret just before the dash: the 9 ends up after the dash.
      expectValue(insert(f, v('35202-123', 5), '9'), '35202-9123', 7);
      // Caret just after the dash.
      expectValue(insert(f, v('35202-123', 6), '9'), '35202-9123', 7);
    });

    test('keeps the caret when a dash disappears', () {
      // Removing a digit in the first group pulls the next one back.
      expectValue(backspace(f, v('35202-123', 2)), '32021-23', 1);
      // Down to five digits: the dash goes.
      expectValue(backspace(f, v('35202-1', 7)), '35202', 5);
    });

    test('backspace right after a dash deletes the digit before it', () {
      expectValue(backspace(f, v('35202-123', 6)), '35201-23', 4);
      expectValue(
        backspace(f, v('35202-1234567-1', 14)),
        '35202-1234561',
        12,
      );
    });

    test('delete right before a dash deletes the digit after it', () {
      expectValue(deleteForward(f, v('35202-123', 5)), '35202-23', 5);
    });

    test('formats pasted text', () {
      expectValue(
        f.formatEditUpdate(
          TextEditingValue.empty,
          v('CNIC: 35202 1234567 1'),
        ),
        '35202-1234567-1',
        15,
      );
      // Pasting into the middle keeps the caret after the pasted digits.
      expectValue(insert(f, v('35202-1', 5), '123456'), '35202-1234561', 12);
    });

    test('replacing the whole value is not mistaken for a deletion', () {
      expectValue(
        f.formatEditUpdate(v('35202-1234567-1'), v('3520212345672')),
        '35202-1234567-2',
        15,
      );
    });

    test('converts Urdu and Arabic-Indic digits', () {
      expectValue(typeAll(f, '۳۵۲۰۲۱۲۳۴۵۶۷۱'), '35202-1234567-1', 15);
      expectValue(typeAll(f, '٣٥٢٠٢١'), '35202-1', 7);
      expectValue(insert(f, v('35202-123', 3), '۹'), '35290-2123', 4);
    });

    test('leaves selection-only changes alone', () {
      final old = v('35202-123', 3);
      final moved = old.copyWith(
        selection: const TextSelection(baseOffset: 1, extentOffset: 4),
      );
      expect(f.formatEditUpdate(old, moved), moved);
    });

    test('keeps the edit untouched when already formatted', () {
      const next = TextEditingValue(
        text: '352',
        selection: TextSelection.collapsed(offset: 3),
        composing: TextRange(start: 0, end: 3),
      );
      expect(f.formatEditUpdate(v('35'), next), next);
    });
  });

  group('PhoneInputFormatter', () {
    final f = PhoneInputFormatter();

    test('formats local numbers while typing', () {
      expectValue(typeAll(f, '0300'), '0300', 4);
      expectValue(typeAll(f, '03001'), '0300-1', 6);
      expectValue(typeAll(f, '03001234567'), '0300-1234567', 12);
    });

    test('formats international numbers while typing', () {
      expectValue(typeAll(f, '+92'), '+92', 3);
      expectValue(typeAll(f, '+923001234567'), '+92 300 1234567', 15);
      expectValue(typeAll(f, '00923001234567'), '+92 300 1234567', 15);
    });

    test('keeps the caret after the same digit', () {
      expectValue(insert(f, v('0300-123', 2), '1'), '0310-0123', 3);
      expectValue(insert(f, v('0300-123', 4), '9'), '0300-9123', 6);
    });

    test('backspace right after the dash deletes the digit before it', () {
      expectValue(backspace(f, v('0300-1234567', 5)), '0301-234567', 3);
    });

    test('delete right before the dash deletes the digit after it', () {
      expectValue(deleteForward(f, v('0300-1234567', 4)), '0300-234567', 4);
    });

    test('formats pasted numbers', () {
      expectValue(
        f.formatEditUpdate(TextEditingValue.empty, v('+92 (300) 123-4567')),
        '+92 300 1234567',
        15,
      );
    });

    test('converts Urdu digits', () {
      expectValue(typeAll(f, '۰۳۰۰۱۲۳۴۵۶۷'), '0300-1234567', 12);
    });
  });

  group('IbanInputFormatter', () {
    final f = IbanInputFormatter();

    test('uppercases and groups in fours while typing', () {
      expectValue(typeAll(f, 'pk36'), 'PK36', 4);
      expectValue(typeAll(f, 'pk36s'), 'PK36 S', 6);
      expectValue(
        typeAll(f, 'pk36scbl0000001123456702'),
        'PK36 SCBL 0000 0011 2345 6702',
        29,
      );
    });

    test('stops at 24 characters', () {
      expectValue(
        typeAll(f, 'PK36SCBL00000011234567029'),
        'PK36 SCBL 0000 0011 2345 6702',
        29,
      );
    });

    test('keeps the caret after the same character', () {
      expectValue(insert(f, v('PK36 SCBL', 4), 'x'), 'PK36 XSCB L', 6);
      expectValue(insert(f, v('PK36 SCBL', 2), '1'), 'PK13 6SCB L', 3);
    });

    test('backspace right after a space deletes the character before it', () {
      expectValue(backspace(f, v('PK36 SCBL', 5)), 'PK3S CBL', 3);
    });

    test('delete right before a space deletes the character after it', () {
      expectValue(deleteForward(f, v('PK36 SCBL', 4)), 'PK36 CBL', 4);
    });

    test('formats pasted IBANs', () {
      expectValue(
        f.formatEditUpdate(
          TextEditingValue.empty,
          v(' pk36-scbl-0000-0011-2345-6702 '),
        ),
        'PK36 SCBL 0000 0011 2345 6702',
        29,
      );
    });
  });
}
