// Idiomatic-API tests. These run on every platform (`dart test -p node`
// checks the JavaScript semantics used by Flutter web).
import 'package:pakdatakit/bills.dart' as bills;
import 'package:pakdatakit/cnic.dart' as cnic;
import 'package:pakdatakit/courier.dart' as courier;
import 'package:pakdatakit/pakdatakit.dart';
import 'package:pakdatakit/phone.dart' as phone;
import 'package:pakdatakit/salestax.dart' as salestax;
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

    test('address and phone quality', () {
      final full = scoreAddress('House 12, Street 4, Block B, Gulberg III, '
          'near Liberty Market, Lahore 54660');
      expect(full.score, 100);
      expect(full.missing, isEmpty);
      expect(
        scoreAddress('12 Model Town Lahore').missing,
        [AddressPart.street, AddressPart.postalCode, AddressPart.landmark],
      );
      expect(AddressPart.houseNumber.value, 'houseNumber');
      expect(addressWeights.values.reduce((a, b) => a + b), 100);
      expect(phoneRiskSignals('0300 1234567'),
          [PhoneRiskFlag.sequentialDigits, PhoneRiskFlag.testNumber]);
      expect(phoneRiskSignals('0300 1572948'), isEmpty);
      expect(phoneRiskSignals('03001111111'), [PhoneRiskFlag.repeatedDigits]);
      expect(phoneRiskSignals('042 35761234'), [PhoneRiskFlag.landline]);
      expect(phoneRiskSignals('hello'), [PhoneRiskFlag.invalid]);
      expect(PhoneRiskFlag.notMobile.value, 'not-mobile');
    });

    test('quality functions never throw', () {
      final hostile = [
        '',
        ' ',
        '\uD800',
        '\uDC00 near \uD83D',
        '۰۳۰۰۱۲۳۴۵۶۷',
        '${'9' * 100000} Lahore 54000',
        '${'near, ' * 20000}Karachi',
        '\u0000\u202E\uFEFF',
        'İSTANBUL Street ẞ 12',
      ];
      for (final input in hostile) {
        expect(() => scoreAddress(input), returnsNormally);
        expect(() => phoneRiskSignals(input), returnsNormally);
        expect(scoreAddress(input).score, inInclusiveRange(0, 100));
      }
    });

    test('sales tax', () {
      expect(
        getSalesTaxRate(kind: SalesTaxKind.goods, date: '2026-11-18')?.rate,
        18,
      );
      expect(
        getSalesTaxRate(
          kind: SalesTaxKind.services,
          province: 'Sindh',
          date: '2024-06-30',
        )?.rate,
        13,
      );
      expect(
        getSalesTaxRate(kind: SalesTaxKind.goods, date: DateTime(2020, 1, 15))
            ?.rate,
        17,
      );
      expect(getSalesTaxRate(kind: SalesTaxKind.goods)?.rate, 18);
      expect(
        getSalesTaxRate(kind: SalesTaxKind.goods, date: '2026-02-30'),
        isNull,
      );
      expect(SalesTaxKind.services.value, 'services');
      expect(
        calculateSalesTax(1000, rate: 18),
        const SalesTaxAmounts(net: 1000, tax: 180, gross: 1180, rate: 18),
      );
      expect(calculateSalesTax(1234, rate: 18)?.tax, 222.12);
      expect(calculateSalesTax(0.25, rate: 18)?.tax, 0.05);
      expect(calculateSalesTax(1.005, rate: 0)?.net, 1.01);
      expect(
        calculateSalesTax(1000, province: 'Punjab', date: '2026-11-18')?.tax,
        160,
      );
      expect(
        calculateSalesTax(
          1150,
          province: 'Sindh',
          date: '2026-11-18',
          inclusive: true,
        ),
        const SalesTaxAmounts(net: 1000, tax: 150, gross: 1150, rate: 15),
      );
      expect(
        splitInclusive(99.99, 18),
        const SalesTaxAmounts(net: 84.74, tax: 15.25, gross: 99.99, rate: 18),
      );
      // Exact on every platform: 10^14 paisa x 10^4 is beyond 2^53.
      expect(
        splitInclusive(999999999999.99, 0.01)?.net,
        999900009998.99,
      );
      expect(calculateSalesTax(999999999999.99, rate: 99.99)?.tax,
          999899999999.99);
    });

    test('sales tax functions never throw', () {
      final numbers = <num>[
        0,
        -1,
        -0.0,
        1e-7,
        5e-324,
        0.005,
        1e12,
        1e12 + 0.01,
        1e13,
        double.nan,
        double.infinity,
        double.negativeInfinity,
        double.maxFinite,
        16.666,
        100.000001,
      ];
      final strings = [
        '',
        ' ',
        '\uD800',
        '\uDC00 near \uD83D',
        'constructor',
        '__proto__',
        '۲۰۲۶-۱۱-۱۸',
        '2026-1-1',
        '0000-00-00',
        '9999-12-31',
        'x' * 100000,
        '\u0000\u202E\uFEFF',
      ];
      final dates = <Object?>[
        null,
        ...strings,
        DateTime(-5),
        DateTime(275000),
        42,
        true,
      ];
      for (final kind in SalesTaxKind.values) {
        for (final province in [null, ...strings]) {
          for (final date in dates) {
            expect(
              () => getSalesTaxRate(kind: kind, province: province, date: date),
              returnsNormally,
            );
            expect(
              () => calculateSalesTax(100,
                  kind: kind, province: province, date: date),
              returnsNormally,
            );
          }
        }
      }
      for (final amount in numbers) {
        for (final rate in numbers) {
          expect(() => splitInclusive(amount, rate), returnsNormally);
          expect(() => calculateSalesTax(amount, rate: rate), returnsNormally);
        }
      }
      expect(splitInclusive(double.nan, 18), isNull);
      expect(calculateSalesTax(1e13, rate: 18), isNull);
      expect(calculateSalesTax(100, rate: 16.666), isNull);
      expect(calculateSalesTax(100), isNull);
    });

    test('utility bills', () {
      expect(
        parseElectricityRef('02-12624-0045901 r'),
        const ElectricityRef(
          type: ElectricityRefType.reference,
          digits: '02126240045901',
          formatted: '02 12624 0045901 R',
          urbanRural: 'R',
          disco: null,
        ),
      );
      expect(parseElectricityRef('۰۴۰۰۰۱۲۳۴۵۶۷۸')?.toJson(), {
        'type': 'k-electric',
        'digits': '0400012345678',
        'formatted': '0400012345678',
        'urbanRural': null,
        'disco': 'K-Electric',
      });
      expect(
        parseElectricityRef('12345 67890')?.type,
        ElectricityRefType.customerId,
      );
      expect(ElectricityRefType.customerId.value, 'customer-id');
      expect(validateElectricityRef('1234567890 U'), isFalse);
      expect(validateElectricityRef('12345'), isFalse);
      expect(validateGasConsumerNumber('12345678901', 'SNGPL'), isTrue);
      expect(validateGasConsumerNumber('1234567890', 'ssgc'), isTrue);
      expect(
        validateGasConsumerNumber('1234567890', GasCompany.ssgc.value),
        isTrue,
      );
      expect(validateGasConsumerNumber('1234567890', 'SNGPL'), isFalse);
    });

    test('utility bill functions never throw', () {
      final strings = [
        '',
        ' ',
        '\uD800',
        '\uDC00 near \uD83D',
        'constructor',
        '__proto__',
        'toString',
        'ß' * 14,
        'ﬃ',
        '۰۴۰۰۰۱۲۳۴۵۶۷۸',
        '1' * 100000,
        '\u0000\u202E\uFEFF',
        '02126240045901\uD800',
      ];
      for (final input in strings) {
        expect(() => parseElectricityRef(input), returnsNormally);
        expect(() => validateElectricityRef(input), returnsNormally);
        for (final company in [...strings, 'SNGPL', 'sSgC']) {
          expect(
            () => validateGasConsumerNumber(input, company),
            returnsNormally,
          );
        }
      }
      expect(validateGasConsumerNumber('12345678901', '__proto__'), isFalse);
      expect(validateGasConsumerNumber('12345678901', 'constructor'), isFalse);
    });

    test('couriers', () {
      expect(mapCourierStatus('PostEx', 'Delivered'), CourierStatus.delivered);
      expect(
        mapCourierStatus('postex', 'OUT FOR DELIVERY'),
        CourierStatus.outForDelivery,
      );
      expect(mapCourierStatus('PostEx', 15), CourierStatus.pickedUp);
      expect(mapCourierStatus('PostEx', 15.0), CourierStatus.pickedUp);
      expect(mapCourierStatus('PostEx', '16'), CourierStatus.returning);
      expect(mapCourierStatus('PostEx', '0005'), CourierStatus.delivered);
      expect(mapCourierStatus('PostEx', 5), CourierStatus.delivered);
      expect(mapCourierStatus('PostEx', 13), isNull);
      expect(
        mapCourierStatus('PostEx', 'At Merchant’s Warehouse'),
        CourierStatus.booked,
      );
      expect(
        mapCourierStatus('PostEx', 'Attempt Made: Customer not available'),
        CourierStatus.attempted,
      );
      expect(mapCourierStatus('PostEx', 'attempt madeX'), isNull);
      expect(
        mapCourierStatus('LCS', 'returned  to shipper'),
        CourierStatus.returned,
      );
      expect(mapCourierStatus(Courier.tcs.value, 'Delivered'), isNull);
      expect(mapCourierStatus('PostEx', 1.5), isNull);
      expect(mapCourierStatus('PostEx', -1), isNull);
      expect(mapCourierStatus('PostEx', double.nan), isNull);
      expect(mapCourierStatus('PostEx', true), isNull);
      expect(mapCourierStatus('PostEx', null), isNull);
      expect(CourierStatus.underReview.value, 'under-review');
      expect(Courier.mAndP.toJson(), 'M&P');

      expect(normalizeCityForCourier('LHR'), 'Lahore');
      expect(normalizeCityForCourier('D.G. Khan'), 'Dera Ghazi Khan');
      expect(normalizeCityForCourier('لاہور'), 'Lahore');
      expect(normalizeCityForCourier('lhr city'), 'Lahore');
      expect(normalizeCityForCourier('Karachi City'), 'Karachi');
      expect(normalizeCityForCourier('city'), isNull);
      expect(normalizeCityForCourier('Atlantis'), isNull);
    });

    test('courier functions never throw', () {
      final strings = [
        '',
        ' ',
        '\uD800',
        '\uDC00 near \uD83D',
        'constructor',
        '__proto__',
        'hasOwnProperty',
        'toString',
        'ß' * 14,
        'İ city city',
        ' city',
        '${'x' * 100000} city',
        '\u0000\u202E\uFEFF',
        'Attempt Made\uD800',
      ];
      final raws = <Object?>[
        ...strings,
        null,
        true,
        0,
        -0.0,
        5,
        5.0,
        1.5,
        -1,
        double.nan,
        double.infinity,
        1e300,
        9007199254740992,
        <String>[],
      ];
      for (final input in strings) {
        expect(() => normalizeCityForCourier(input), returnsNormally);
        for (final name in [...strings, 'PostEx', 'lcs']) {
          for (final raw in raws) {
            expect(() => mapCourierStatus(name, raw), returnsNormally);
          }
        }
      }
      for (final key in ['constructor', '__proto__', 'hasOwnProperty']) {
        expect(mapCourierStatus(key, 'x'), isNull);
        expect(mapCourierStatus('PostEx', key), isNull);
        expect(normalizeCityForCourier(key), isNull);
      }
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
    expect(dataVersion, '2026-11-17');
    expect(salestax.splitInclusive(1180, 18)?.net, 1000);
    expect(bills.validateElectricityRef('0400012345678'), isTrue);
    expect(courier.normalizeCityForCourier('Isb'), 'Islamabad');
  });
}
