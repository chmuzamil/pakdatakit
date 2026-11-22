// Tests for the 2.7.1 changes: CNICs in any 13-digit grouping, slash
// separators, maskCNICs replacement and six-digit toll-free numbers.
import 'package:pakdatakit/pakdatakit.dart';
import 'package:test/test.dart';

void main() {
  group('findCNICs', () {
    test('finds 13 digits in any grouping, with slashes too', () {
      for (final raw in [
        '352 0212 3456 71',
        '35202/1234567/1',
        '3520/2123/4567/1',
        '352.0212.3456.71',
        '3 5 2 0 2 1 2 3 4 5 6 7 1',
      ]) {
        final matches = findCNICs('ID $raw, ok');
        expect(matches.map((m) => m.raw), [raw], reason: raw);
        expect(matches.single.start, 3);
        expect(matches.single.end, 3 + raw.length);
        expect(matches.single.digits, '3520212345671');
      }
    });

    test('still finds a 5-7-1 CNIC next to another number', () {
      expect(
        findCNICs('0300-1234567 35202-1234567-1').map((m) => m.raw),
        ['35202-1234567-1'],
      );
      final m = findCNICs('0300 1234567 35202/1234567/1').single;
      expect(m.raw, '35202/1234567/1');
      expect(m.start, 13);
    });

    test('never cuts a longer run, or one with doubled separators', () {
      for (final text in [
        '352 0212 3456 712',
        '1 352 0212 3456 71',
        '4111 1111 1111 1111',
        '35202 - 1234567 - 1',
      ]) {
        expect(findCNICs(text), isEmpty, reason: text);
      }
    });

    test('matches any 13 digits starting with 1-8 (the trade-off)', () {
      expect(findCNICs('order 4520 1123 4567 8'), hasLength(1));
      expect(findCNICs('0520 1123 4567 8'), isEmpty);
    });
  });

  group('maskCNICs replacement', () {
    test('replaces whole matches, separators included', () {
      expect(
        maskCNICs(
          'a 352 0212 3456 71 b 35202/1234567/1',
          replacement: '[CNIC removed]',
        ),
        const MaskedText(text: 'a [CNIC removed] b [CNIC removed]', count: 2),
      );
    });

    test('takes precedence over mask, even when empty', () {
      expect(
          maskCNICs('352 0212 3456 71', mask: '*', replacement: '').text, '');
      expect(maskCNICs('352 0212 3456 71').text, 'XXX XXXX XXXX XX');
      expect(maskCNICs(r'x 3520212345671', replacement: r'$1').text, r'x $1');
    });
  });

  group('toll-free', () {
    test('0800 and six digits is toll-free', () {
      expect(getNumberType('0800005000'), NumberType.tollFree);
      expect(analyzeNumber('0800-005000')?.formatted, startsWith('0800-'));
      expect(validateLandline('0800005000', services: true), isTrue);
      expect(getNumberType('080012345678'), isNull);
      expect(getNumberType('0800-1234'), isNull);
    });
  });
}
