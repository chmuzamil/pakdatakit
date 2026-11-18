// material.dart is deprecated from Flutter 3.47 in favour of the material_ui
// package; it is kept so the package still supports older Flutter versions.
// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pakdatakit_flutter/pakdatakit_flutter.dart';

Future<void> pumpForm(WidgetTester tester, Widget form) async {
  tester.view.physicalSize = const Size(800, 2400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(MaterialApp(home: Scaffold(body: form)));
}

Finder field(String name) => find.byKey(Key('pakForm.$name'));

Finder textIn(String name) =>
    find.descendant(of: field(name), matching: find.byType(EditableText));

Future<void> enter(WidgetTester tester, String name, String text) async {
  await tester.enterText(textIn(name), text);
  await tester.pump();
}

Future<void> choose(WidgetTester tester, String name, String option) async {
  await tester.tap(field(name));
  await tester.pumpAndSettle();
  await tester.tap(find.text(option).last);
  await tester.pumpAndSettle();
}

Future<void> submit(WidgetTester tester) async {
  await tester.tap(field('submit'));
  await tester.pumpAndSettle();
}

String? dropdownValue(WidgetTester tester, String name) =>
    tester.state<FormFieldState<String>>(field(name)).value;

Future<void> fillValid(WidgetTester tester, {bool cnic = false}) async {
  await enter(tester, 'fullName', '  Ayesha Khan ');
  await enter(tester, 'mobile', '03001234567');
  if (cnic) await enter(tester, 'cnic', '3520212345671');
  await choose(tester, 'province', 'Punjab');
  await choose(tester, 'district', 'Lahore');
  await enter(tester, 'city', 'Lahore');
  await enter(tester, 'address', 'House 12, Street 4, Gulberg');
  await enter(tester, 'landmark', 'Liberty Market');
  await enter(tester, 'postalCode', '54660');
}

void main() {
  group('PakCheckoutForm', () {
    testWidgets('renders English labels and no CNIC or tehsil', (tester) async {
      await pumpForm(tester, const PakCheckoutForm());
      for (final label in [
        'Full name',
        'Mobile number',
        'Province',
        'District',
        'City',
        'Address',
        'Nearby place (optional)',
        'Postal code (optional)',
        'Submit',
      ]) {
        expect(find.text(label), findsWidgets, reason: label);
      }
      expect(field('cnic'), findsNothing);
      expect(field('tehsil'), findsNothing);
      expect(field('hints'), findsNothing);
      final dir = tester.widget<Directionality>(
        find
            .ancestor(
                of: find.byType(Form), matching: find.byType(Directionality))
            .first,
      );
      expect(dir.textDirection, TextDirection.ltr);
    });

    testWidgets('shows validation messages and does not submit',
        (tester) async {
      PakFormValues? submitted;
      await pumpForm(
          tester, PakCheckoutForm(onSubmitted: (v) => submitted = v));
      await enter(tester, 'fullName', '   ');
      await enter(tester, 'mobile', '0423');
      await enter(tester, 'postalCode', '540');
      await submit(tester);

      expect(submitted, isNull);
      expect(find.text('Enter your full name'), findsOneWidget);
      expect(find.text('Enter a valid mobile number'), findsOneWidget);
      expect(find.text('Select a province'), findsWidgets);
      expect(find.text('Select a district'), findsWidgets);
      expect(find.text('Enter a city'), findsOneWidget);
      expect(find.text('Enter your address'), findsOneWidget);
      expect(find.text('A postal code has 5 digits'), findsOneWidget);
      expect(field('errorSummary'), findsOneWidget);
    });

    testWidgets('rejects a landline as the mobile number', (tester) async {
      await pumpForm(tester, const PakCheckoutForm());
      await enter(tester, 'mobile', '04235761234');
      await submit(tester);
      expect(find.text('Enter a valid mobile number'), findsOneWidget);
    });

    testWidgets('submits trimmed values', (tester) async {
      PakFormValues? submitted;
      await pumpForm(
          tester, PakCheckoutForm(onSubmitted: (v) => submitted = v));
      await fillValid(tester);
      await submit(tester);

      expect(field('errorSummary'), findsNothing);
      expect(
        submitted,
        const PakFormValues(
          fullName: 'Ayesha Khan',
          mobile: '0300-1234567',
          province: 'Punjab',
          district: 'Lahore',
          city: 'Lahore',
          address: 'House 12, Street 4, Gulberg',
          landmark: 'Liberty Market',
          postalCode: '54660',
        ),
      );
      expect(submitted!.toMap(), isNot(contains('cnic')));
      expect(submitted!.toMap()['city'], 'Lahore');
    });

    testWidgets('optional fields can stay empty', (tester) async {
      PakFormValues? submitted;
      await pumpForm(
          tester, PakCheckoutForm(onSubmitted: (v) => submitted = v));
      await fillValid(tester);
      await enter(tester, 'landmark', '');
      await enter(tester, 'postalCode', '');
      await submit(tester);
      expect(submitted?.landmark, '');
      expect(submitted?.postalCode, '');
    });

    testWidgets('postal code accepts digits only, at most 5', (tester) async {
      await pumpForm(tester, const PakCheckoutForm());
      await enter(tester, 'postalCode', '54a6601');
      expect(find.text('54660'), findsOneWidget);
    });

    testWidgets('changing province clears district, tehsil and city',
        (tester) async {
      await pumpForm(tester, const PakCheckoutForm(showTehsil: true));
      expect(field('tehsil'), findsOneWidget);
      expect(find.text('Tehsil (optional)'), findsWidgets);

      await choose(tester, 'province', 'Punjab');
      await choose(tester, 'district', 'Lahore');
      await choose(tester, 'tehsil', 'Model Town');
      await enter(tester, 'city', 'Lahore');
      expect(dropdownValue(tester, 'district'), 'Lahore');
      expect(dropdownValue(tester, 'tehsil'), 'Model Town');

      await choose(tester, 'province', 'Sindh');
      expect(dropdownValue(tester, 'district'), isNull);
      expect(dropdownValue(tester, 'tehsil'), isNull);
      expect(
        tester.widget<EditableText>(textIn('city')).controller.text,
        isEmpty,
      );

      // Districts now come from Sindh.
      await tester.tap(field('district'));
      await tester.pumpAndSettle();
      expect(find.text('Hyderabad'), findsWidgets);
      expect(find.text('Lahore'), findsNothing);
    });

    testWidgets('changing district clears tehsil only', (tester) async {
      PakFormValues? last;
      await pumpForm(
        tester,
        PakCheckoutForm(showTehsil: true, onChanged: (v) => last = v),
      );
      await choose(tester, 'province', 'Punjab');
      await choose(tester, 'district', 'Lahore');
      await choose(tester, 'tehsil', 'Raiwind');
      await enter(tester, 'city', 'Lahore');
      expect(last?.tehsil, 'Raiwind');

      await choose(tester, 'district', 'Kasur');
      expect(dropdownValue(tester, 'tehsil'), isNull);
      expect(last?.tehsil, '');
      expect(last?.district, 'Kasur');
      expect(last?.city, 'Lahore');
    });

    testWidgets('city suggestions are limited to the province', (tester) async {
      PakFormValues? last;
      await pumpForm(tester, PakCheckoutForm(onChanged: (v) => last = v));
      await choose(tester, 'province', 'Sindh');
      await tester.tap(textIn('city'));
      await enter(tester, 'city', 'kar');
      await tester.pumpAndSettle();
      expect(find.text('Karachi'), findsOneWidget);
      expect(find.text('Okara'), findsNothing); // Punjab
      expect(find.text('Skardu'), findsNothing); // Gilgit-Baltistan

      await tester.tap(find.text('Karachi'));
      await tester.pumpAndSettle();
      expect(last?.city, 'Karachi');
    });

    testWidgets('the district is disabled until a province is chosen',
        (tester) async {
      await pumpForm(tester, const PakCheckoutForm());
      final dropdown = find.descendant(
        of: field('district'),
        matching: find.byType(DropdownButton<String>),
      );
      expect(tester.widget<DropdownButton<String>>(dropdown).onChanged, isNull);
      await choose(tester, 'province', 'Punjab');
      expect(
        tester.widget<DropdownButton<String>>(dropdown).onChanged,
        isNotNull,
      );
    });

    testWidgets('initial values fill the form', (tester) async {
      PakFormValues? submitted;
      const initial = PakFormValues(
        fullName: 'Ali',
        mobile: '0300-1234567',
        province: 'Punjab',
        district: 'Lahore',
        city: 'Lahore',
        address: 'House 1, Street 2',
      );
      await pumpForm(
        tester,
        PakCheckoutForm(
          initialValues: initial,
          onSubmitted: (v) => submitted = v,
        ),
      );
      await submit(tester);
      expect(submitted, initial);
    });

    testWidgets('labels and decorations can be overridden', (tester) async {
      await pumpForm(
        tester,
        PakCheckoutForm(
          labels: const {'fullName': 'Your name', 'submit': 'Place order'},
          decorate: (field, d) => d.copyWith(
            helperText: field == PakFormField.mobile ? 'For the rider' : null,
          ),
          submitBuilder: (context, submit, label) => TextButton(
            key: const Key('custom.submit'),
            onPressed: submit,
            child: Text(label),
          ),
        ),
      );
      expect(find.text('Your name'), findsWidgets);
      expect(find.text('For the rider'), findsOneWidget);
      expect(find.byKey(const Key('custom.submit')), findsOneWidget);
      expect(find.text('Place order'), findsOneWidget);
      expect(field('submit'), findsNothing);
    });

    testWidgets('fields expose labels and errors to assistive technology',
        (tester) async {
      final handle = tester.ensureSemantics();
      await pumpForm(tester, const PakKycForm());
      expect(find.bySemanticsLabel(RegExp('^Full name')), findsWidgets);
      expect(find.bySemanticsLabel(RegExp('^CNIC')), findsWidgets);
      expect(find.bySemanticsLabel(RegExp('^Mobile number')), findsWidgets);

      await submit(tester);
      final summary = tester.getSemantics(field('errorSummary'));
      expect(summary.label, 'Please correct the fields marked in red.');
      expect(
        tester.widget<Semantics>(field('errorSummary')).properties.liveRegion,
        isTrue,
      );
      handle.dispose();
    });

    testWidgets('can be filled with the keyboard only', (tester) async {
      await pumpForm(tester, const PakCheckoutForm());
      await tester.tap(textIn('fullName'));
      await tester.pump();
      expect(
        tester.widget<EditableText>(textIn('fullName')).focusNode.hasFocus,
        isTrue,
      );
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(
        tester.widget<EditableText>(textIn('mobile')).focusNode.hasFocus,
        isTrue,
      );
    });
  });

  group('PakKycForm', () {
    testWidgets('requires a valid CNIC and submits it formatted',
        (tester) async {
      PakFormValues? submitted;
      await pumpForm(tester, PakKycForm(onSubmitted: (v) => submitted = v));
      await fillValid(tester);
      await submit(tester);
      expect(submitted, isNull);
      expect(find.text('This field is required'), findsOneWidget);

      await enter(tester, 'cnic', '3520212345');
      await submit(tester);
      expect(find.text('Enter a valid CNIC'), findsOneWidget);

      await enter(tester, 'cnic', '3520212345671');
      await submit(tester);
      expect(submitted?.cnic, '35202-1234567-1');
      expect(submitted?.toMap()['cnic'], '35202-1234567-1');
    });
  });

  group('Urdu', () {
    testWidgets('switches labels, errors and direction', (tester) async {
      await pumpForm(tester, const PakKycForm(locale: PakFormLocale.ur));
      for (final label in [
        'نام',
        'موبائل نمبر',
        'شناختی کارڈ نمبر',
        'صوبہ',
        'ضلع',
        'شہر',
        'پتہ',
        'قریبی جگہ (اختیاری)',
        'پوسٹل کوڈ (اختیاری)',
        'جمع کریں',
      ]) {
        expect(find.text(label), findsWidgets, reason: label);
      }
      final dir = tester.widget<Directionality>(
        find
            .ancestor(
                of: find.byType(Form), matching: find.byType(Directionality))
            .first,
      );
      expect(dir.textDirection, TextDirection.rtl);

      await enter(tester, 'fullName', 'عائشہ');
      await submit(tester);
      expect(find.text('اپنا پتہ لکھیں'), findsOneWidget);
      expect(find.text('شہر کا نام لکھیں'), findsWidgets);
      expect(
          find.text('براہ کرم سرخ نشان والے خانے درست کریں۔'), findsOneWidget);
      // Values stay as typed.
      expect(find.text('عائشہ'), findsOneWidget);
    });

    testWidgets('Urdu labels can be overridden', (tester) async {
      await pumpForm(
        tester,
        const PakCheckoutForm(
          locale: PakFormLocale.ur,
          labels: {'fullName': 'پورا نام'},
        ),
      );
      expect(find.text('پورا نام'), findsWidgets);
      expect(find.text('موبائل نمبر'), findsWidgets);
    });
  });

  group('PakLocation', () {
    test('lists the 7 provinces and cascades from core data', () {
      expect(PakLocation.provinces, hasLength(7));
      expect(PakLocation.districts(null), isEmpty);
      expect(PakLocation.districts('Punjab'), contains('Lahore'));
      expect(PakLocation.tehsils('Lahore'), contains('Model Town'));
      expect(PakLocation.cities('Sindh', 'kar'), contains('Karachi'));
      expect(PakLocation.cities('Sindh', 'kar'), isNot(contains('Okara')));
      expect(PakLocation.cities('Sindh', ''), isEmpty);
    });
  });
}
