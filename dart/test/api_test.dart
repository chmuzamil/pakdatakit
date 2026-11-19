// Idiomatic-API tests. These run on every platform (`dart test -p node`
// checks the JavaScript semantics used by Flutter web).
import 'package:pakdatakit/bills.dart' as bills;
import 'package:pakdatakit/cnic.dart' as cnic;
import 'package:pakdatakit/courier.dart' as courier;
import 'package:pakdatakit/fbr_invoice.dart' as fbr;
import 'package:pakdatakit/incometax.dart' as incometax;
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
      expect(
        parseAmount(' Rs. 1,50,000/- '),
        const ParsedAmount(value: 150000, raw: 'Rs. 1,50,000/-'),
      );
      expect(parseAmount('1.005')?.value, 1.01);
      expect(parseAmount('5-10k'), isNull);
      expect(formatAmountInput('1.5 lakh'), 'Rs. 150,000');
      expect(formatAmountInput('1,234.5'), 'Rs. 1,234.50');
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

    test('Urdu text', () {
      expect(slugify('Lahore Fort, 2024'), 'lahore-fort-2024');
      expect(slugify('  Ünited   Kingdom '), 'united-kingdom');
      expect(slugify('Straße ÆON'), 'strasse-aeon');
      expect(slugify('---a---'), 'a');
      expect(slugify('لاہور قلعہ'), 'لاہور-قلعہ');
      expect(slugify('كتاب'), 'کتاب');
      expect(slugify('لاہور Fort', script: SlugScript.latin), 'fort');
      expect(slugify('لاہور Fort', script: SlugScript.urdu), 'لاہور');
      expect(slugify('کراچی ۲۰۲۴', script: SlugScript.urdu), 'کراچی-2024');
      expect(SlugScript.latin.value, 'latin');

      expect(
        ['ے', 'بھائی', 'آم', 'باغ', 'اب']..sort(compareUrdu),
        ['اب', 'آم', 'باغ', 'بھائی', 'ے'],
      );
      expect(compareUrdu('بہن', 'بھائی'), -1);
      expect(compareUrdu('ہم', 'ھ'), -1);
      expect(compareUrdu('اب', 'أب'), -1);
      expect(compareUrdu('أب', 'اج'), -1);
      expect(compareUrdu('۲', '3'), -1);
      expect(compareUrdu('10', '۲'), -1);
      expect(compareUrdu(' ', '1'), -1);
      expect(compareUrdu('ے', 'ك'), -1);
      expect(compareUrdu('ے', 'a'), -1);
      expect(compareUrdu('ا', 'ا'), 0);
      expect(compareUrdu('a', 'A'), 1);

      expect(isRTL('سلام'), isTrue);
      expect(isRTL('123 سلام'), isTrue);
      expect(isRTL('Order نمبر'), isFalse);
      expect(isRTL('שלום'), isTrue);
      expect(isRTL('123'), isFalse);
      final fsi = String.fromCharCode(0x2068);
      final pdi = String.fromCharCode(0x2069);
      expect(wrapBidi('PDK-1042'), '${fsi}PDK-1042$pdi');
      expect(
        wrapBidi('abc', BidiDirection.rtl),
        '${String.fromCharCode(0x2067)}abc$pdi',
      );
      expect(
        wrapBidi('abc', BidiDirection.ltr),
        '${String.fromCharCode(0x2066)}abc$pdi',
      );
    });

    test('Urdu text functions never throw', () {
      final strings = [
        '',
        ' ',
        String.fromCharCode(0xd800),
        '${String.fromCharCode(0xdc00)} near ${String.fromCharCode(0xd83d)}',
        'ا${String.fromCharCode(0x0653)}',
        'بھ',
        'أ${String.fromCharCode(0x0653)}ھ',
        String.fromCharCodes([0x0654, 0x0670, 0x0640, 0x200c, 0xfeff]),
        '🇵🇰 𐤀 𞤀',
        'x' * 100000,
        'ب' * 100000,
      ];
      for (final a in strings) {
        for (final script in SlugScript.values) {
          expect(() => slugify(a, script: script), returnsNormally);
        }
        expect(() => isRTL(a), returnsNormally);
        for (final direction in BidiDirection.values) {
          expect(() => wrapBidi(a, direction), returnsNormally);
        }
        for (final b in strings) {
          expect(() => compareUrdu(a, b), returnsNormally);
          expect(compareUrdu(a, b), -compareUrdu(b, a));
        }
      }
      expect(isRTL(String.fromCharCode(0x10900)), isTrue);
    });

    test('salary income tax', () {
      expect(
        calculateSalaryTax(1800000, taxYear: 2026),
        const SalaryTax(
          tax: 72000,
          monthly: 6000,
          effectiveRate: 4,
          slab: SalaryTaxSlab(
              over: 1200000, upTo: 2200000, fixed: 6000, rate: 11),
          taxYear: 2026,
        ),
      );
      expect(calculateSalaryTax(1800000, taxYear: 2025)?.tax, 120000);
      expect(calculateSalaryTax(8000000, taxYear: 2027)?.tax, 1774000);
      expect(calculateSalaryTax(3000000, taxYear: 2020)?.tax, 282500);
      expect(calculateSalaryTax(600000, taxYear: 2026)?.tax, 0);
      expect(calculateSalaryTax(1200000, taxYear: 2026)?.slab.over, 600000);
      expect(calculateSalaryTax(1200000.01, taxYear: 2026)?.slab.over, 1200000);
      expect(calculateSalaryTax(600000.5, taxYear: 2026)?.tax, 0.01);
      expect(calculateSalaryTax(600000.49, taxYear: 2026)?.tax, 0);
      expect(getTaxYear('2025-06-30'), 2025);
      expect(getTaxYear('2025-07-01'), 2026);
      expect(getTaxYear(DateTime(2025, 7, 1)), 2026);
      expect(calculateSalaryTax(1800000, date: '2025-07-01')?.taxYear, 2026);
      expect(
        calculateSalaryTax(1500000, taxYear: 2024, date: '2026-01-01')?.taxYear,
        2024,
      );
      expect(calculateSalaryTax(-1, taxYear: 2026), isNull);
      expect(calculateSalaryTax(double.nan, taxYear: 2026), isNull);
      expect(calculateSalaryTax(1, taxYear: 2019), isNull);
      expect(calculateSalaryTax(1, date: '2026-02-30'), isNull);
      expect(getSalaryTaxSlabs(2030), isNull);
      expect(getTaxYear('2026-02-30'), isNull);
      expect(getSalaryTaxYears(),
          [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027]);
      final year = getSalaryTaxSlabs(2026)!;
      expect(year.from, '2025-07-01');
      expect(year.slabs.first,
          const SalaryTaxSlab(over: 0, upTo: 600000, fixed: 0, rate: 0));
      expect(year.slabs.last.upTo, isNull);
      expect(() => year.slabs.add(year.slabs.first), throwsUnsupportedError);
      expect(getSalaryTaxSlabs(2026), year);
      expect(calculateMonthlySalaryTax(150000, taxYear: 2026)?.monthly, 6000);
      expect(calculateMonthlySalaryTax(50000, taxYear: 2026)?.tax, 0);
      // 1.2e15 paisa a year at 35%: exact beyond 2^53 on every platform.
      expect(
        calculateMonthlySalaryTax(1e12, taxYear: 2026)?.tax,
        4199999181000,
      );
    });

    test('income tax functions never throw', () {
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
      ];
      final dates = <Object?>[
        null,
        '',
        String.fromCharCode(0xd800),
        '۲۰۲۶-۱۱-۱۸',
        '2026-1-1',
        '0000-00-00',
        '9999-12-31',
        'x' * 100000,
        DateTime(-5),
        DateTime(275000),
        42,
        true,
      ];
      final years = <int?>[null, -1, 0, 2019, 2026, 2028, 1 << 31];
      for (final date in dates) {
        expect(() => getTaxYear(date), returnsNormally);
      }
      for (final taxYear in years) {
        expect(() => getSalaryTaxSlabs(taxYear), returnsNormally);
      }
      for (final amount in numbers) {
        for (final taxYear in years) {
          for (final date in dates) {
            expect(
              () => calculateSalaryTax(amount, taxYear: taxYear, date: date),
              returnsNormally,
            );
            expect(
              () => calculateMonthlySalaryTax(amount,
                  taxYear: taxYear, date: date),
              returnsNormally,
            );
          }
        }
      }
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

    test('FBR digital invoices', () {
      final input = <String, Object?>{
        'invoiceType': FbrInvoiceType.saleInvoice.value,
        'invoiceDate': '2025-04-21',
        'sellerNTNCNIC': '1234567',
        'sellerBusinessName': 'Example Traders',
        'sellerProvince': 'Sindh',
        'sellerAddress': 'Karachi',
        'buyerNTNCNIC': '7654321',
        'buyerBusinessName': 'Example Buyer',
        'buyerProvince': 'Punjab',
        'buyerAddress': 'Lahore',
        'buyerRegistrationType': FbrRegistrationType.registered.value,
        'items': [
          {
            'hsCode': '0101.2100',
            'productDescription': 'Horses',
            'rate': '18%',
            'uoM': 'Numbers, pieces, units',
            'quantity': 2,
            'valueSalesExcludingST': 1234,
            'saleType': 'Goods at standard rate (default)',
          },
        ],
      };
      final built = buildFbrInvoice(input)!;
      final item = (built.invoice['items']! as List).first as FbrInvoiceItem;
      expect(item['salesTaxApplicable'], 222.12);
      expect(item['totalValues'], 0);
      expect(built.invoice['invoiceRefNo'], '');
      expect(built.totals.salesTaxApplicable, 222.12);
      expect(built.totals.quantity, 2);
      expect(
        validateFbrInvoice(built.invoice),
        const FbrInvoiceValidation(valid: true, errors: []),
      );
      expect(
        validateFbrInvoice({
          ...built.invoice,
          'invoiceDate': '21-04-2025',
          'buyerNTNCNIC': '1234567',
        }).errors,
        const [
          FbrInvoiceError(
            '0005',
            'invoiceDate',
            'Invoice date must be in YYYY-MM-DD format',
          ),
          FbrInvoiceError(
            '0058',
            'buyerNTNCNIC',
            'Buyer and seller must be different (self-invoicing is not '
                'allowed)',
          ),
        ],
      );
      expect(
        validateFbrInvoice({...built.invoice, 'invoiceDate': '2027-01-01'},
                today: '2026-11-18')
            .errors
            .single
            .code,
        '0043',
      );
      final wrongTax = {
        ...built.invoice,
        'items': [
          {...item, 'salesTaxApplicable': 200},
        ],
      };
      expect(
        validateFbrInvoice(wrongTax).errors.single.toJson(),
        {
          'code': '0104',
          'field': 'items[0].salesTaxApplicable',
          'message': 'Sales tax should be 222.12 for this rate',
        },
      );
      expect(expectedSalesTax({'rate': 'Rs.3', 'quantity': 12}), 36);
      expect(expectedSalesTax({'rate': 'Exempt'}), isNull);
      expect(fbrDiSpecVersion, '1.12');
      expect(buildFbrInvoice({'items': 'x'}), isNull);
    });

    test('FBR invoice functions never throw', () {
      final values = <Object?>[
        null,
        true,
        0,
        -0.0,
        -1,
        1.005,
        0.00001,
        1e21,
        1e300,
        5e-324,
        double.nan,
        double.infinity,
        '',
        ' ',
        '1',
        '\uD800',
        '\uDC00 near \uD83D',
        'constructor',
        '__proto__',
        '\u0000\u202E\uFEFF',
        'x' * 100000,
        'Rs.${'9' * 400}',
        '${'9' * 400}%',
        'rs \u3000 999999999999.99',
        '18%',
        '3rd Schedule Goods',
        'Goods at Reduced Rate',
        <Object?>[],
        <Object?>[null],
        <Object?, Object?>{},
        <Object?, Object?>{1: 2, null: 'x'},
      ];
      const keys = [
        'invoiceType',
        'invoiceDate',
        'sellerNTNCNIC',
        'buyerNTNCNIC',
        'buyerRegistrationType',
        'invoiceRefNo',
        'scenarioId',
        'items',
      ];
      const itemKeys = [
        'rate',
        'saleType',
        'quantity',
        'valueSalesExcludingST',
        'salesTaxApplicable',
        'fixedNotifiedValueOrRetailPrice',
        'extraTax',
        'sroScheduleNo',
      ];
      void check(Object? invoice) {
        expect(() => buildFbrInvoice(invoice), returnsNormally);
        expect(() => validateFbrInvoice(invoice), returnsNormally);
        expect(
          () => validateFbrInvoice(invoice, today: '2025-01-01'),
          returnsNormally,
        );
      }

      for (final value in values) {
        check(value);
        expect(() => expectedSalesTax(value), returnsNormally);
        for (final key in keys) {
          check({key: value, 'items': const <Object?>[]});
          check({
            'items': [value]
          });
        }
        for (final key in itemKeys) {
          for (final rate in ['18%', 'Rs.3', 'Exempt']) {
            final item = {
              'rate': rate,
              'saleType': '3rd Schedule Goods',
              'quantity': 1,
              'valueSalesExcludingST': 100,
              'fixedNotifiedValueOrRetailPrice': 100,
              key: value,
            };
            expect(() => expectedSalesTax(item), returnsNormally);
            check({
              'items': [item],
            });
          }
        }
      }
      for (final today in ['', 'bad', '2025-02-30', '\uD800', '9' * 100000]) {
        expect(
          () => validateFbrInvoice({'invoiceDate': '2025-01-01'}, today: today),
          returnsNormally,
        );
      }
      expect(
        expectedSalesTax({'rate': 'Rs.999999999999.99', 'quantity': 1e12}),
        9.9999999999999e23,
      );
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
    expect(dataVersion, '2026-11-18');
    expect(salestax.splitInclusive(1180, 18)?.net, 1000);
    expect(incometax.getTaxYear('2025-07-01'), 2026);
    expect(bills.validateElectricityRef('0400012345678'), isTrue);
    expect(courier.normalizeCityForCourier('Isb'), 'Islamabad');
    expect(fbr.expectedSalesTax({'rate': '18%', 'valueSalesExcludingST': 100}),
        18);
  });
}
