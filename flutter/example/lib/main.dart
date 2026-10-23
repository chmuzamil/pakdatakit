import 'package:flutter/material.dart';
import 'package:pakdatakit_flutter/pakdatakit_flutter.dart';

void main() => runApp(const ExampleApp());

class ExampleApp extends StatelessWidget {
  const ExampleApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      title: 'pakdatakit_flutter',
      home: PaymentForm(),
    );
  }
}

class PaymentForm extends StatefulWidget {
  const PaymentForm({super.key});

  @override
  State<PaymentForm> createState() => _PaymentFormState();
}

class _PaymentFormState extends State<PaymentForm> {
  final _formKey = GlobalKey<FormState>();
  final _ibanController = TextEditingController();
  String _qrIban = 'PK36SCBL0000001123456702';
  String? _bank;

  @override
  void dispose() {
    _ibanController.dispose();
    super.dispose();
  }

  void _submit() {
    if (_formKey.currentState!.validate()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('All fields are valid')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('pakdatakit_flutter')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            CnicField(
              decoration: const InputDecoration(labelText: 'CNIC'),
              textInputAction: TextInputAction.next,
              onStateChanged: (state, info) =>
                  debugPrint('CNIC $state ${info?.province ?? ''}'),
            ),
            const SizedBox(height: 12),
            PhoneField(
              decoration: const InputDecoration(labelText: 'Mobile number'),
              textInputAction: TextInputAction.next,
              onStateChanged: (state, info) =>
                  debugPrint('Phone $state ${info?.network.value ?? ''}'),
            ),
            const SizedBox(height: 12),
            IbanField(
              controller: _ibanController,
              decoration: InputDecoration(labelText: 'IBAN', helperText: _bank),
              onStateChanged: (state, info) => setState(() {
                if (state == InputState.valid) _qrIban = _ibanController.text;
                _bank = info?.name;
              }),
            ),
            const SizedBox(height: 24),
            FilledButton(onPressed: _submit, child: const Text('Submit')),
            const SizedBox(height: 24),
            Center(
              child: RaastQr(
                iban: _qrIban,
                size: 220,
                onPayload: (payload) => debugPrint('Raast QR: $payload'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
