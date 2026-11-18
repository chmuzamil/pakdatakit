// material.dart is deprecated from Flutter 3.47 in favour of the material_ui
// package; it is kept so the package still supports older Flutter versions.
// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pakdatakit_flutter/pakdatakit_flutter.dart';

Future<void> pumpForm(WidgetTester tester, Widget form) async {
  tester.view.physicalSize = const Size(800, 2400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(MaterialApp(home: Scaffold(body: form)));
  await tester.pumpAndSettle();
}

Finder field(String name) => find.byKey(Key('pakForm.$name'));

Future<void> enter(WidgetTester tester, String name, String text) async {
  await tester.enterText(
    find.descendant(of: field(name), matching: find.byType(EditableText)),
    text,
  );
  await tester.pumpAndSettle();
}

Future<void> choose(WidgetTester tester, String name, String option) async {
  await tester.tap(field(name));
  await tester.pumpAndSettle();
  await tester.tap(find.text(option).last);
  await tester.pumpAndSettle();
}

// Tests in this file run in order, in one isolate: the first one checks that
// the deferred quality library is not loaded before hints are turned on.
void main() {
  testWidgets('without hints the quality library is never loaded',
      (tester) async {
    PakFormValues? submitted;
    await pumpForm(tester, PakCheckoutForm(onSubmitted: (v) => submitted = v));
    await enter(tester, 'fullName', 'Ali');
    await enter(tester, 'mobile', '03001111111');
    await choose(tester, 'province', 'Punjab');
    await choose(tester, 'district', 'Lahore');
    await enter(tester, 'city', 'Lahore');
    await enter(tester, 'address', 'Gulberg');
    await enter(tester, 'postalCode', '74200');
    await tester.tap(field('submit'));
    await tester.pumpAndSettle();

    expect(submitted, isNotNull);
    expect(field('hints'), findsNothing);
    expect(PakFormHints.isLoaded, isFalse);
  });

  testWidgets('hints load on demand and never block submit', (tester) async {
    final handle = tester.ensureSemantics();
    PakFormValues? submitted;
    await pumpForm(
      tester,
      PakCheckoutForm(hints: true, onSubmitted: (v) => submitted = v),
    );
    expect(PakFormHints.isLoaded, isTrue);

    await enter(tester, 'fullName', 'Ali');
    await enter(tester, 'mobile', '03001111111');
    await choose(tester, 'province', 'Punjab');
    await choose(tester, 'district', 'Lahore');
    await enter(tester, 'city', 'Lahore');
    await enter(tester, 'address', 'Gulberg');
    expect(find.text('Address completeness: 30/100'), findsOneWidget);
    expect(
      find.text('You could add: house number, street, area, postal code, '
          'nearby place'),
      findsOneWidget,
    );
    expect(find.text('This number repeats the same digit'), findsOneWidget);

    await enter(tester, 'address', 'House 12, Street 4, Gulberg');
    await enter(tester, 'landmark', 'Liberty Market');
    await enter(tester, 'postalCode', '74200');
    expect(find.text('Postal code 74200 belongs to Karachi'), findsOneWidget);

    expect(
      tester.widget<Semantics>(field('hints')).properties.liveRegion,
      isTrue,
    );
    expect(tester.getSemantics(field('hints')).label, contains('Karachi'));

    await tester.tap(field('submit'));
    await tester.pumpAndSettle();
    expect(submitted?.mobile, '0300-1111111');
    expect(submitted?.postalCode, '74200');

    await enter(tester, 'postalCode', '54660');
    expect(find.textContaining('belongs to'), findsNothing);
    expect(find.text('Address completeness: 100/100'), findsOneWidget);
    handle.dispose();
  });

  testWidgets('hints are shown in Urdu', (tester) async {
    await pumpForm(
      tester,
      const PakCheckoutForm(hints: true, locale: PakFormLocale.ur),
    );
    await enter(tester, 'mobile', '03001234567');
    expect(find.text('یہ آزمائشی نمبر لگتا ہے'), findsOneWidget);
    expect(find.text('اس نمبر کے ہندسے ترتیب سے ہیں'), findsOneWidget);
  });

  testWidgets('a hints loader replaces the built-in hints', (tester) async {
    final seen = <PakFormValues>[];
    await pumpForm(
      tester,
      PakKycForm(
        hints: true,
        hintsLoader: (values) async {
          seen.add(values);
          return const PakFormHints(phoneFlags: ['landline']);
        },
      ),
    );
    await enter(tester, 'mobile', '0423');
    expect(seen.last.mobile, '0423');
    expect(seen.last.cnic, '');
    expect(find.text('This looks like a landline number'), findsOneWidget);
  });

  test('PakFormHints.compute scores the address with landmark and city',
      () async {
    final hints = await PakFormHints.compute(
      const PakFormValues(
        mobile: '0300-1234567',
        city: 'Lahore',
        address: 'House 12, Street 4, Gulberg',
        landmark: 'Liberty Market',
        postalCode: '54660',
      ),
    );
    expect(hints.addressScore, 100);
    expect(hints.missingParts, isEmpty);
    expect(hints.phoneFlags, ['sequential-digits', 'test-number']);
    expect(hints.postalCodeCity, isNull);
    expect(PakFormHints.none.isEmpty, isTrue);
  });
}
