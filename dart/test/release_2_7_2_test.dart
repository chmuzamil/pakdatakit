// Tests for the 2.7.2 changes: CNICs in free text joined by spaces, spaced
// marks and underscores, never across a line break.
import 'package:pakdatakit/pakdatakit.dart';
import 'package:test/test.dart';

void main() {
  group('findCNICs / maskCNICs 2.7.2', () {
    test('masks every form Jaanch masks, and spaced dashes', () {
      for (final raw in [
        '35202  1234567  1',
        '35202 -1234567- 1',
        '35202_1234567_1',
        '35202 - 1234567 - 1',
        '35202\t1234567\t1',
        '35202 _ 1234567 _ 1',
      ]) {
        expect(
          maskCNICs('id $raw ok', replacement: '[CNIC]'),
          const MaskedText(text: 'id [CNIC] ok', count: 1),
          reason: raw,
        );
        final m = findCNICs('id $raw ok').single;
        expect(m.raw, raw);
        expect(m.start, 3);
        expect(m.digits, '3520212345671');
      }
    });

    test('allows one mark between groups, not two, and no commas', () {
      expect(findCNICs('35202 -- 1234567 -- 1'), isEmpty);
      expect(findCNICs('35202,1234567,1'), isEmpty);
    });

    test('never joins digits across a line break', () {
      for (final text in [
        '35202\n1234567\n1',
        '35202 \n 1234567 \n 1',
        '35202\r\n1234567\r\n1',
      ]) {
        expect(findCNICs(text), isEmpty, reason: text);
      }
      expect(findCNICs('35202-1234567-1\n42201-7654321-2'), hasLength(2));
    });

    test('whole groups adding up to 13 match inside a longer run', () {
      // An Urdu digit before the CNIC: the first two groups match.
      expect(
        findCNICs('\u06F135202-1234567-1').single.digits,
        '1352021234567',
      );
      expect(findCNICs('1235202-1234567-1'), isEmpty);
      expect(findCNICs('x35202-1234567-1y'), hasLength(1));
    });
  });
}
