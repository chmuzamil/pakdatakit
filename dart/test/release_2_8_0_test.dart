// Tests for the 2.8.0 changes: CNICs across line breaks, data dating, Zakat,
// withholding tax, census population and FBR reference lists. The shared
// vectors cover every case; these pin the documented examples.
import 'package:pakdatakit/pakdatakit.dart';
import 'package:test/test.dart';

void main() {
  test('findCNICs and maskCNICs join single line breaks with acrossLines', () {
    const text = 'CNIC\n35202\n1234567\n1';
    expect(findCNICs(text), isEmpty);
    expect(
      findCNICs(text, acrossLines: true).single.formatted,
      '35202-1234567-1',
    );
    expect(findCNICs('35202-\r\n1234567 1', acrossLines: true), hasLength(1));
    expect(findCNICs('35202\n\n1234567\n1', acrossLines: true), isEmpty);
    expect(
      maskCNICs(text, acrossLines: true).text,
      'CNIC\nXXXXX\nXXXXXXX\nX',
    );
  });

  test('getDataInfo and listDataInfo', () {
    expect(getDataInfo('income-tax-slabs')?.coverage, 'Tax years 2020-2027');
    expect(getDataInfo('BANKS'), isNull);
    final ids = [for (final d in listDataInfo()) d.id];
    expect(ids, [...ids]..sort());
    expect(ids, containsAll(['zakat-nisab', 'withholding-rates']));
    expect(getDataInfo('banks')!.toJson().containsKey('series'), isFalse);
  });

  test('Zakat nisab and deduction', () {
    expect(getZakatNisab(zakatYear: 1447)?.nisab, 503529);
    expect(getZakatNisab(zakatYear: '1445-46')?.zakatYear, 1446);
    expect(getZakatNisab(date: '2025-06-01')?.nisab, 179689);
    expect(getZakatNisab(), isNull);
    expect(getZakatYears().first, 1433);
    final d = zakatDeduction(balance: 600000, zakatYear: 1447)!;
    expect(d.deductible, isTrue);
    expect(d.zakat, 15000);
    expect(d.source.id, 'zakat-nisab');
    expect(
      zakatDeduction(balance: 600000, zakatYear: 1447, exempt: true)?.reason,
      ZakatExemptReason.exempt,
    );
    expect(zakatDeduction(balance: -1, zakatYear: 1447), isNull);
  });

  test('withholding tax', () {
    final w = calculateWithholding(
        section: '236K', amount: 60000000, atl: false, taxYear: 2027)!;
    expect(w.rate, 14.5);
    expect(w.tax, 8700000);
    expect(w.nonAtlRule, WithholdingNonAtlRule.slabs);
    expect(
      calculateWithholding(
              section: '231AB', amount: 80000, atl: false, taxYear: 2027)
          ?.tax,
      640,
    );
    expect(
      calculateWithholding(
        section: '151',
        subType: 'bank-deposit',
        amount: 10000,
        atl: true,
        taxYear: 2027,
      )?.tax,
      2000,
    );
    expect(calculateWithholding(section: '236K', amount: 1, atl: true), isNull);
    expect(getWithholdingRates(2027, '236k'), isNotEmpty);
    expect(getWithholdingRates(2024), isEmpty);
  });

  test('census population', () {
    expect(getDistrictPopulation('Lahore')?.population, 13004135);
    expect(getDistrictPopulation('Murree')?.population, isNull);
    expect(getTehsilPopulation('Murree')?.currentDistrict, 'Murree');
    expect(getTehsilPopulation('Dasht'), isNull);
    expect(getTehsilPopulation('Dasht', 'Mastung')?.censusDistrict, 'Mastung');
  });

  test('Zakat years start on the announced 1 Ramazan', () {
    final y = getZakatNisab(zakatYear: 1447)!;
    expect(y.ramazan1, '2026-02-19');
    expect(y.source.effectiveFrom, '2026-02-19');
    expect(getZakatNisab(date: '2026-02-18')?.zakatYear, 1446);
    expect(getZakatNisab(date: '2026-02-19')?.zakatYear, 1447);
    expect(getZakatNisab(date: '2011-01-01'), isNull);
  });

  test('bank websites and SWIFT codes', () {
    final scb = getBankInfo('SCBL')!;
    expect(scb.status, BankStatus.active);
    expect(scb.swift, 'SCBLPKKX');
    expect(scb.swiftSource?.bicSource, BankBicSource.bankSite);
    expect(scb.toJson().keys.skip(6).first, 'status');
    expect(getDataInfo('banks')?.checkedAt, isNotNull);
  });

  test('FBR sale types', () {
    expect(getSaleTypes().first.saleType, 'Goods at Standard Rate (default)');
  });
}
