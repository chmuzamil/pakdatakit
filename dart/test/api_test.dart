// Idiomatic-API tests. These run on every platform (`dart test -p node`
// checks the JavaScript semantics used by Flutter web).
import 'package:pakdatakit/cnic.dart' as cnic;
import 'package:pakdatakit/pakdatakit.dart';
import 'package:pakdatakit/phone.dart' as phone;
import 'package:test/test.dart';

void main() {
  group('result classes', () {
    test('value equality, hashCode, toJson and toString', () {
      final a = getCNICInfo('35202-1234567-1');
      final b = getCNICInfo('3520212345671');
      expect(a, b);
      expect(a.hashCode, b.hashCode);
      expect(a!.gender, Gender.male);
      expect(a.toJson(), {
        'digits': '3520212345671',
        'formatted': '35202-1234567-1',
        'province': 'Punjab',
        'gender': 'male',
      });
      expect(a.toString(), contains('35202-1234567-1'));
    });

    test('const constructors', () {
      const hijri = HijriDate(year: 1447, month: 9, day: 1);
      expect(hijri, const HijriDate(year: 1447, month: 9, day: 1));
      expect(toHijri(fromHijri(hijri)), hijri);
    });

    test('lists compare by value', () {
      expect(analyzeNumber('042 35761234'), analyzeNumber('+924235761234'));
      expect(parseAddress('12 Model Town Lahore').warnings, isEmpty);
    });
  });

  group('enums carry the npm values', () {
    test('values', () {
      expect(getNetwork('03001234567'), NetworkName.jazz);
      expect(NetworkName.sco.value, 'SCO');
      expect(NumberType.tollFree.value, 'toll-free');
      expect(getNumberType('0800-12345'), NumberType.tollFree);
      expect(checkCNICInput('35202-12'), InputState.incomplete);
      expect(getBankInfo('MEZN')?.type, BankType.islamic);
      expect(HolidayId.eidUlFitr.value, 'eid-ul-fitr');
      expect(HolidayId.eidUlFitr.isIslamic, isTrue);
      expect(HolidayId.labourDay.isIslamic, isFalse);
      expect(RaastQrError.badChecksum.value, 'bad-checksum');
    });
  });

  group('errors', () {
    test('ArgumentError where TypeScript throws RangeError', () {
      expect(() => formatPKR(double.nan), throwsArgumentError);
      expect(() => numberToWords(1.5), throwsArgumentError);
      expect(() => amountInWords(-1), throwsArgumentError);
      expect(() => getPakistanHolidays(1900), throwsArgumentError);
      expect(() => getHolidaysOn('2025-1-1'), throwsArgumentError);
      expect(() => getHolidaysOn(42), throwsArgumentError);
      expect(
        () => fromHijri(const HijriDate(year: 1447, month: 13, day: 1)),
        throwsArgumentError,
      );
      expect(
        () => createRaastP2PQr(iban: 'PK36SCBL0000001123456702', amount: 10),
        throwsArgumentError,
      );
      expect(
        () => createWhatsAppLink('03001234567', 'a\ud800b'),
        throwsArgumentError,
      );
    });

    test('null where TypeScript returns null', () {
      expect(getCNICInfo('abc'), isNull);
      expect(formatPhone('123'), isNull);
      expect(getBankFromIBAN('PK00'), isNull);
      expect(parseRaastQr('hello'), isNull);
      expect(getHijriMonthName(13), isNull);
    });
  });

  group('examples', () {
    test('phone', () {
      expect(formatPhone('0300 1234567'), '+923001234567');
      expect(
        analyzePhone('+92 300 1234567'),
        const PhoneAnalysis(
          valid: true,
          formatted: '+923001234567',
          network: NetworkName.jazz,
        ),
      );
      expect(
        createWhatsAppLink('03001234567', 'Salam!'),
        'https://wa.me/923001234567?text=Salam!',
      );
    });

    test('money', () {
      expect(formatPKR(150000), 'Rs. 150,000');
      expect(formatLakh(2500000), '25 Lakh');
      expect(formatLakh(9999999), '1 Crore');
      expect(numberToWords(125000), 'one lakh twenty-five thousand');
      expect(
        amountInWords(125000, cheque: true),
        'Rupees One Lakh Twenty-Five Thousand Only',
      );
      expect(
        numberToWords(125000, language: WordsLanguage.ur),
        'ایک لاکھ پچیس ہزار',
      );
    });

    test('text', () {
      expect(normalizeRomanUrdu('Kia haal hai'), 'Kya haal hai');
      expect(toUrduDigits('0300'), '۰۳۰۰');
      expect(normalizeText('Café  au  lait '), 'Café au lait');
    });

    test('dates', () {
      expect(formatHijri(DateTime(2026, 3, 3)), '14 Ramadan 1447');
      expect(isPakistanHoliday(DateTime(2025, 8, 14)), isTrue);
      expect(isPakistanHoliday('2025-08-15'), isFalse);
      final eid = getPakistanHolidays(2025)
          .firstWhere((h) => h.id == HolidayId.eidUlFitr);
      expect(eid.date, '2025-03-31');
      expect(eid.dateTime, DateTime(2025, 3, 31));
      expect(eid.estimated, isFalse);
    });

    test('Raast QR round trip', () {
      final payload = createRaastP2PQr(
        iban: 'PK36 SCBL 0000 0011 2345 6702',
        amount: 1500,
        expiresIn: const Duration(days: 1),
        now: DateTime(2026, 10, 14, 11),
      );
      final result = validateRaastQr(payload, now: DateTime(2026, 10, 14, 12));
      expect(result.valid, isTrue);
      expect(result.qr!.amount, 1500);
      expect(result.qr!.expiresAt, '2026-10-15T11:00');
      expect(
        validateRaastQr(payload, now: DateTime(2026, 10, 16)).errors,
        [RaastQrError.expired],
      );

      final merchant = createMerchantQr(
        merchantAccount: const MerchantAccountInfo(
          fields: {'01': 'PK36SCBL0000001123456702', '00': 'A000000736'},
        ),
        merchantName: 'Aziz General Store',
        city: 'Karachi',
      );
      final parsed = parseRaastQr(merchant)!;
      expect(parsed.kind, RaastQrKind.merchant);
      expect(parsed.crcValid, isTrue);
      expect(parsed.iban, 'PK36SCBL0000001123456702');
      expect(
          parsed.fields[2].children!.first, const EmvField('00', 'A000000736'));
    });
  });

  test('per-module libraries', () {
    expect(cnic.validateCNIC('35202-1234567-1'), isTrue);
    expect(phone.normalizePhoneDigits('0300-1234567'), '923001234567');
    expect(phone.getPhonePrefix('+923451234567'), '0345');
    expect(dataVersion, '2026-10-14');
  });
}
