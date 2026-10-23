import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pakdatakit/pakdatakit.dart' show Gender, NetworkName;
import 'package:pakdatakit_flutter/pakdatakit_flutter.dart';

Widget app(Widget field, {GlobalKey<FormState>? formKey}) => MaterialApp(
      home: Scaffold(body: Form(key: formKey, child: field)),
    );

TextField textField(WidgetTester tester) =>
    tester.widget<TextField>(find.byType(TextField));

void main() {
  group('CnicField', () {
    testWidgets('formats input and reports state changes', (tester) async {
      final events = <(InputState, CNICInfo?)>[];
      await tester.pumpWidget(
        app(CnicField(onStateChanged: (s, i) => events.add((s, i)))),
      );
      expect(textField(tester).keyboardType, TextInputType.number);

      await tester.enterText(find.byType(TextField), '352');
      await tester.pump();
      expect(events.single.$1, InputState.incomplete);
      expect(events.single.$2, isNull);

      // Still incomplete: no new event.
      await tester.enterText(find.byType(TextField), '352021');
      await tester.pump();
      expect(find.text('35202-1'), findsOneWidget);
      expect(events, hasLength(1));

      await tester.enterText(find.byType(TextField), '3520212345671');
      await tester.pump();
      expect(find.text('35202-1234567-1'), findsOneWidget);
      expect(events.last.$1, InputState.valid);
      expect(events.last.$2!.province, 'Punjab');
      expect(events.last.$2!.gender, Gender.male);

      // A different valid CNIC: reported again with new info.
      await tester.enterText(find.byType(TextField), '3520212345672');
      await tester.pump();
      expect(events.last.$1, InputState.valid);
      expect(events.last.$2!.gender, Gender.female);

      await tester.enterText(find.byType(TextField), '');
      await tester.pump();
      expect(events.last, (InputState.empty, null));
    });

    testWidgets('shows an error only once the value is invalid',
        (tester) async {
      await tester.pumpWidget(app(const CnicField()));

      await tester.enterText(find.byType(TextField), '35202');
      await tester.pump();
      expect(find.text(PakValidators.defaultCnicMessage), findsNothing);

      await tester.enterText(find.byType(TextField), '05202');
      await tester.pump();
      expect(find.text(PakValidators.defaultCnicMessage), findsOneWidget);

      await tester.enterText(find.byType(TextField), '35202-12');
      await tester.pump();
      expect(find.text(PakValidators.defaultCnicMessage), findsNothing);
    });

    testWidgets('reports incomplete and missing values on submit',
        (tester) async {
      final formKey = GlobalKey<FormState>();
      await tester.pumpWidget(app(const CnicField(), formKey: formKey));

      expect(formKey.currentState!.validate(), isFalse);
      await tester.pump();
      expect(
        find.text(PakValidators.defaultRequiredMessage),
        findsOneWidget,
      );

      await tester.enterText(find.byType(TextField), '35202');
      await tester.pump();
      // After a submit, incomplete values are errors while typing too.
      expect(find.text(PakValidators.defaultCnicMessage), findsOneWidget);
      expect(formKey.currentState!.validate(), isFalse);

      await tester.enterText(find.byType(TextField), '3520212345671');
      await tester.pump();
      expect(find.text(PakValidators.defaultCnicMessage), findsNothing);
      expect(formKey.currentState!.validate(), isTrue);
    });

    testWidgets('optional field accepts an empty value', (tester) async {
      final formKey = GlobalKey<FormState>();
      await tester.pumpWidget(
        app(const CnicField(required: false), formKey: formKey),
      );
      expect(formKey.currentState!.validate(), isTrue);
    });

    testWidgets('uses custom messages and an extra validator', (tester) async {
      final formKey = GlobalKey<FormState>();
      await tester.pumpWidget(
        app(
          CnicField(
            invalidMessage: 'Galat CNIC',
            requiredMessage: 'Zaroori',
            validator: (value) => value!.startsWith('4') ? 'Punjab only' : null,
          ),
          formKey: formKey,
        ),
      );
      formKey.currentState!.validate();
      await tester.pump();
      expect(find.text('Zaroori'), findsOneWidget);

      await tester.enterText(find.byType(TextField), '0');
      await tester.pump();
      expect(find.text('Galat CNIC'), findsOneWidget);

      await tester.enterText(find.byType(TextField), '4220112345671');
      await tester.pump();
      expect(find.text('Punjab only'), findsOneWidget);
    });

    testWidgets('formats initialValue and works with a controller',
        (tester) async {
      await tester.pumpWidget(app(const CnicField(initialValue: '3520212')));
      expect(find.text('35202-12'), findsOneWidget);

      final controller = TextEditingController();
      addTearDown(controller.dispose);
      final states = <InputState>[];
      await tester.pumpWidget(
        app(
          CnicField(
            key: UniqueKey(),
            controller: controller,
            onStateChanged: (s, _) => states.add(s),
          ),
        ),
      );
      await tester.enterText(find.byType(TextField), '3520212345671');
      expect(controller.text, '35202-1234567-1');
      expect(states, [InputState.valid]);
    });

    testWidgets('can switch between own and given controllers', (tester) async {
      final states = <InputState>[];
      void record(InputState s, CNICInfo? _) => states.add(s);
      await tester.pumpWidget(app(CnicField(onStateChanged: record)));
      await tester.enterText(find.byType(TextField), '35202');

      final controller = TextEditingController(text: '35202-1234567-1');
      addTearDown(controller.dispose);
      await tester.pumpWidget(
        app(CnicField(controller: controller, onStateChanged: record)),
      );
      await tester.pump();
      expect(find.text('35202-1234567-1'), findsOneWidget);
      await tester.enterText(find.byType(TextField), '0');
      expect(controller.text, '0');

      await tester.pumpWidget(app(CnicField(onStateChanged: record)));
      await tester.pump();
      expect(find.text('0'), findsOneWidget);
      await tester.enterText(find.byType(TextField), '3520212345671');
      expect(states, [
        InputState.incomplete,
        InputState.invalid,
        InputState.valid,
      ]);
    });

    testWidgets('passes the decoration through', (tester) async {
      await tester.pumpWidget(
        app(const CnicField(decoration: InputDecoration(labelText: 'CNIC'))),
      );
      expect(find.text('CNIC'), findsOneWidget);
    });
  });

  group('PhoneField', () {
    testWidgets('formats, validates and reports the analysis', (tester) async {
      final events = <(InputState, PhoneAnalysis?)>[];
      await tester.pumpWidget(
        app(PhoneField(onStateChanged: (s, i) => events.add((s, i)))),
      );
      final field = textField(tester);
      expect(field.keyboardType, TextInputType.phone);
      expect(field.autofillHints, [AutofillHints.telephoneNumber]);

      await tester.enterText(find.byType(TextField), '0300');
      await tester.pump();
      expect(events.last.$1, InputState.incomplete);
      expect(find.text(PakValidators.defaultPhoneMessage), findsNothing);

      await tester.enterText(find.byType(TextField), '03001234567');
      await tester.pump();
      expect(find.text('0300-1234567'), findsOneWidget);
      expect(events.last.$1, InputState.valid);
      expect(events.last.$2!.formatted, '+923001234567');
      expect(events.last.$2!.network, NetworkName.jazz);

      await tester.enterText(find.byType(TextField), '0360');
      await tester.pump();
      expect(events.last.$1, InputState.invalid);
      expect(find.text(PakValidators.defaultPhoneMessage), findsOneWidget);
    });
  });

  group('IbanField', () {
    testWidgets('uppercases, validates and reports the bank', (tester) async {
      final events = <(InputState, BankInfo?)>[];
      await tester.pumpWidget(
        app(IbanField(onStateChanged: (s, i) => events.add((s, i)))),
      );
      final field = textField(tester);
      expect(field.keyboardType, TextInputType.text);
      expect(field.textCapitalization, TextCapitalization.characters);
      expect(field.autocorrect, isFalse);

      await tester.enterText(find.byType(TextField), 'pk36sc');
      await tester.pump();
      expect(find.text('PK36 SC'), findsOneWidget);
      expect(events.last.$1, InputState.incomplete);

      await tester.enterText(
        find.byType(TextField),
        'pk36scbl0000001123456702',
      );
      await tester.pump();
      expect(find.text('PK36 SCBL 0000 0011 2345 6702'), findsOneWidget);
      expect(events.last.$1, InputState.valid);
      expect(events.last.$2!.code, 'SCBL');

      await tester.enterText(find.byType(TextField), 'GB29');
      await tester.pump();
      expect(events.last.$1, InputState.invalid);
      expect(find.text(PakValidators.defaultIbanMessage), findsOneWidget);
    });
  });
}
