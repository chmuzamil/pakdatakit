// Tests for the 2.7.0 additions: landline service numbers, CNICs in free
// text, romanUrduKey, the Raast QR kind and the salary tax surcharge.
import 'package:pakdatakit/pakdatakit.dart';
import 'package:test/test.dart';

const _iban = 'PK36SCBL0000001123456702';

void main() {
  group('validateLandline', () {
    test('accepts service numbers only with services', () {
      expect(validateLandline('042-35761234'), isTrue);
      expect(validateLandline('042-35761234', services: true), isTrue);
      for (final number in [
        '021-111-123-456',
        '111-123-456',
        '0800-12345',
        '0900-12345',
      ]) {
        expect(validateLandline(number), isFalse, reason: number);
        expect(validateLandline(number, services: true), isTrue,
            reason: number);
      }
      // Not personal or mobile numbers, even with services.
      expect(validateLandline('0122-123456', services: true), isFalse);
      expect(validateLandline('0300-1234567', services: true), isFalse);
      expect(validateLandline('', services: true), isFalse);
    });

    test('toll-free is 0800 and five or six digits', () {
      expect(getNumberType('0800-12345'), NumberType.tollFree);
      expect(getNumberType('0800 12345678'), isNull);
      expect(validateLandline('0800 12345678', services: true), isFalse);
    });
  });

  group('findCNICs and maskCNICs', () {
    test('finds CNICs with their offsets', () {
      const text = 'CNIC: 35202-1234567-1, phone 0300-1234567';
      final matches = findCNICs(text);
      expect(matches, [
        const CNICMatch(
          raw: '35202-1234567-1',
          digits: '3520212345671',
          formatted: '35202-1234567-1',
          start: 6,
          end: 21,
        ),
      ]);
      expect(text.substring(matches[0].start, matches[0].end), matches[0].raw);
      expect(matches[0].toJson(), {
        'raw': '35202-1234567-1',
        'digits': '3520212345671',
        'formatted': '35202-1234567-1',
        'start': 6,
        'end': 21,
      });
    });

    test('accepts mixed separators and Urdu digits', () {
      expect(findCNICs('35202 1234567-1').single.digits, '3520212345671');
      expect(findCNICs('3520212345671').single.formatted, '35202-1234567-1');
      final urdu = findCNICs('شناختی کارڈ ۳۵۲۰۲-۱۲۳۴۵۶۷-۱ ہے').single;
      expect(urdu.digits, '3520212345671');
      expect(urdu.raw, '۳۵۲۰۲-۱۲۳۴۵۶۷-۱');
    });

    test('does not cut a CNIC out of a longer number', () {
      expect(findCNICs('135202-1234567-1'), isEmpty);
      expect(findCNICs('35202-1234567-12'), isEmpty);
      expect(findCNICs('05202-1234567-1'), isEmpty);
      expect(findCNICs('95202-1234567-1'), isEmpty);
      expect(findCNICs(''), isEmpty);
    });

    test('masks the digits and keeps the separators', () {
      expect(
        maskCNICs('My CNIC is 35202-1234567-1'),
        const MaskedText(text: 'My CNIC is XXXXX-XXXXXXX-X', count: 1),
      );
      expect(maskCNICs('35202 1234567 1', mask: '*').text, '***** ******* *');
      expect(maskCNICs(r'3520212345671', mask: r'$1').text, r'$1' * 13);
      expect(maskCNICs('a 3520212345671 b 4210112345672').count, 2);
      expect(maskCNICs('no CNIC here').toJson(),
          {'text': 'no CNIC here', 'count': 0});
    });
  });

  group('romanUrduKey', () {
    bool same(List<String> spellings) =>
        spellings.map(romanUrduKey).toSet().length == 1;

    test('matches spellings of one name', () {
      expect(same(['Mubeen', 'Mobeen']), isTrue);
      expect(same(['Muhammad', 'Mohammad', 'Muhammed']), isTrue);
      expect(same(['Rehman', 'Rahman']), isTrue);
      expect(same(['Chaudhry', 'Chaudhary', 'Chaudhery']), isTrue);
    });

    test('keeps similar but different names apart', () {
      expect(same(['Hussain', 'Hassan']), isFalse);
      expect(same(['Imran', 'Umran']), isFalse);
      expect(same(['Saeed', 'Saad']), isFalse);
      expect(same(['Ehsan', 'Ahsan']), isFalse);
      expect(same(['Ali', 'Alia']), isFalse);
    });

    test('keys each word, ignoring case, accents and punctuation', () {
      expect(romanUrduKey('Muhammad Rehman'), 'muhmd rahmn');
      expect(romanUrduKey('MUHAMMAD  rehman!'), 'muhmd rahmn');
      expect(romanUrduKey('José'), romanUrduKey('Jose'));
      expect(romanUrduKey('Zoë Khan'), 'zu khan');
      // Compatibility forms, as with NFKD: full-width letters, ligatures.
      expect(romanUrduKey('Ａｌｉ'), romanUrduKey('Ali'));
      expect(romanUrduKey('ﬁaz'), romanUrduKey('fiaz'));
    });

    test('returns an empty key when there are no Latin letters', () {
      expect(romanUrduKey(''), '');
      expect(romanUrduKey('123'), '');
      expect(romanUrduKey('لاہور'), '');
    });

    test('does not change normalizeRomanUrdu', () {
      expect(normalizeRomanUrdu('ap kaise ho'), 'aap kaise ho');
    });
  });

  group('validateRaastQr', () {
    test('returns the kind', () {
      final result = validateRaastQr(createRaastP2PQr(iban: _iban));
      expect(result.kind, RaastQrKind.p2p);
      expect(result.toJson().keys.take(2), ['valid', 'kind']);
      expect(validateRaastQr('hello').kind, isNull);
      expect(validateRaastQr('hello').toJson()['kind'], isNull);
    });

    test('a merchant QR without an IBAN is valid, with a warning', () {
      final payload = createMerchantQr(
        merchantAccount: const MerchantAccountInfo(
          fields: {'00': 'A000000736', '01': 'MERCHANT42'},
        ),
        merchantName: 'Aziz General Store',
        city: 'Karachi',
      );
      final result = validateRaastQr(payload);
      expect(result.valid, isTrue);
      expect(result.kind, RaastQrKind.merchant);
      expect(result.errors, isEmpty);
      expect(result.warnings, [RaastQrWarning.noIban]);
      expect(RaastQrWarning.noIban.value, 'no-iban');
    });
  });

  group('salary tax surcharge', () {
    test('is added only when asked', () {
      final plain = calculateSalaryTax(12000000, taxYear: 2026)!;
      expect(plain.surcharge, 0);
      expect(plain.total, plain.tax);
      final withSurcharge =
          calculateSalaryTax(12000000, taxYear: 2026, includeSurcharge: true)!;
      expect(withSurcharge.tax, 3381000);
      expect(withSurcharge.surcharge, 304290);
      expect(withSurcharge.total, 3685290);
      expect(withSurcharge.monthly, 307107.5);
      expect(withSurcharge.toJson().keys, [
        'tax',
        'surcharge',
        'total',
        'monthly',
        'effectiveRate',
        'slab',
        'taxYear',
      ]);
      expect(
        calculateSalaryTax(12000000, taxYear: 2025, includeSurcharge: true)
            ?.surcharge,
        346500,
      );
      for (final taxYear in [2027, 2024, 2020]) {
        expect(
          calculateSalaryTax(12000000, taxYear: taxYear, includeSurcharge: true)
              ?.surcharge,
          0,
          reason: '$taxYear',
        );
      }
      expect(
        calculateMonthlySalaryTax(1000000,
                taxYear: 2026, includeSurcharge: true)
            ?.surcharge,
        304290,
      );
    });

    test('applies only above Rs 10 million, on the whole tax', () {
      SalaryTax? at(num income) =>
          calculateSalaryTax(income, taxYear: 2026, includeSurcharge: true);
      expect(at(10000000)?.surcharge, 0);
      expect(at(10000000.01)?.surcharge, 241290);
    });

    test('each year has its surcharge with the law and source', () {
      expect(getSalaryTaxSlabs(2024)?.surcharge, isNull);
      expect(getSalaryTaxSlabs(2025)?.surcharge?.rate, 10);
      expect(getSalaryTaxSlabs(2025)?.surcharge?.over, 10000000);
      expect(getSalaryTaxSlabs(2026)?.surcharge?.rate, 9);
      expect(getSalaryTaxSlabs(2027)?.surcharge?.rate, 0);
      for (final year in [2025, 2026, 2027]) {
        expect(getSalaryTaxSlabs(year)?.surcharge?.source,
            startsWith('https://download1.fbr.gov.pk/'));
      }
      expect(getSalaryTaxSlabs(2024)?.toJson()['surcharge'], isNull);
      expect(getSalaryTaxSlabs(2026)?.toJson()['surcharge'],
          containsPair('rate', 9));
    });
  });
}
