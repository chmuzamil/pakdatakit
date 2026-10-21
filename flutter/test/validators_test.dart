import 'package:flutter_test/flutter_test.dart';
import 'package:pakdatakit_flutter/pakdatakit_flutter.dart';

void main() {
  group('PakValidators', () {
    test('cnic', () {
      final validate = PakValidators.cnic();
      expect(validate('35202-1234567-1'), isNull);
      expect(validate('3520212345671'), isNull);
      expect(validate('35202-1234567'), PakValidators.defaultCnicMessage);
      expect(validate('05202-1234567-1'), PakValidators.defaultCnicMessage);
    });

    test('phone', () {
      final validate = PakValidators.phone();
      expect(validate('0300-1234567'), isNull);
      expect(validate('+92 300 1234567'), isNull);
      expect(validate('۰۳۰۰۱۲۳۴۵۶۷'), isNull);
      expect(validate('0300-123'), PakValidators.defaultPhoneMessage);
      expect(validate('042-35761234'), PakValidators.defaultPhoneMessage);
    });

    test('iban', () {
      final validate = PakValidators.iban();
      expect(validate('PK36 SCBL 0000 0011 2345 6702'), isNull);
      expect(validate('pk36scbl0000001123456702'), isNull);
      expect(
        validate('PK37SCBL0000001123456702'),
        PakValidators.defaultIbanMessage,
      );
    });

    test('ntn', () {
      final validate = PakValidators.ntn();
      expect(validate('1234567'), isNull);
      expect(validate('1234567-8'), isNull);
      expect(validate('35202-1234567-1'), isNull);
      expect(validate('12345'), PakValidators.defaultNtnMessage);
    });

    test('strn', () {
      final validate = PakValidators.strn();
      expect(validate('1234567890123'), isNull);
      expect(validate('12-34-5678-901-23'), isNull);
      expect(validate('123456789012'), PakValidators.defaultStrnMessage);
    });

    test('landline', () {
      final validate = PakValidators.landline();
      expect(validate('042-35761234'), isNull);
      expect(validate('0300-1234567'), PakValidators.defaultLandlineMessage);
    });

    test('empty values depend on required', () {
      final validators = [
        PakValidators.cnic,
        PakValidators.phone,
        PakValidators.iban,
        PakValidators.ntn,
        PakValidators.strn,
        PakValidators.landline,
      ];
      for (final create in validators) {
        final required = create(message: null, required: true);
        final optional = create(message: null, required: false);
        for (final empty in [null, '', '   ']) {
          expect(required(empty), PakValidators.defaultRequiredMessage);
          expect(optional(empty), isNull);
        }
      }
    });

    test('messages can be replaced', () {
      final validate = PakValidators.cnic(
        message: 'Galat CNIC',
        requiredMessage: 'CNIC zaroori hai',
      );
      expect(validate('123'), 'Galat CNIC');
      expect(validate(''), 'CNIC zaroori hai');
      expect(PakValidators.phone(required: false)('12'),
          PakValidators.defaultPhoneMessage);
    });
  });
}
