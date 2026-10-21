import 'package:pakdatakit/pakdatakit.dart';

void main() {
  // CNIC
  print(validateCNIC('35202-1234567-1')); // true
  print(getCNICInfo('35202-1234567-1')?.province); // Punjab

  // Mobile numbers
  print(formatPhone('0300 1234567')); // +923001234567
  print(getNetwork('0345-1234567').value); // Telenor
  print(createWhatsAppLink('03001234567', 'Salam!'));

  // IBAN and banks
  print(validateIBAN('PK36 SCBL 0000 0011 2345 6702')); // true
  print(getBankFromIBAN('PK36SCBL0000001123456702'));
  print(getBankInfo('MEZN')?.type); // BankType.islamic

  // Places and addresses
  print(getProvince('Lahore')); // Punjab
  print(getPostalCode('Karachi')); // 74200
  final address = parseAddress('House 12, Street 5, Model Town Lahore 54000');
  print('${address.city}, ${address.province} ${address.postalCode}');

  // Money
  print(formatPKR(150000)); // Rs. 150,000
  print(formatLakh(2500000)); // 25 Lakh
  print(amountInWords(125000, cheque: true));
  print(numberToWords(125000, language: WordsLanguage.ur));

  // Dates
  print(formatHijri(DateTime(2026, 3, 3))); // 14 Ramadan 1447
  for (final holiday in getPakistanHolidays(2026).take(3)) {
    print('${holiday.date} ${holiday.name}');
  }

  // Raast QR codes
  final payload = createRaastP2PQr(
    iban: 'PK36SCBL0000001123456702',
    amount: 1500,
    expiresIn: '1d',
  );
  print(validateRaastQr(payload).valid); // true

  // Form fields, as the user types
  print(formatCNICInput('3520212')); // 35202-12
  print(checkPhoneInput('0300 12')); // InputState.incomplete
}
