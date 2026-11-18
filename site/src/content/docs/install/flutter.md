---
title: Install for Flutter
description: Install pakdatakit_flutter for input formatters, form fields and a Raast QR widget.
---

```bash
flutter pub add pakdatakit_flutter
```

```dart
import 'package:pakdatakit_flutter/pakdatakit_flutter.dart';

TextFormField(
  inputFormatters: [CnicInputFormatter()],
  validator: PakValidators.cnic(),
);
```

It includes formatters that format CNICs, mobile numbers and IBANs as you type, `PakValidators` for forms, and a Raast QR widget. It builds on the [Dart package](/install/dart/).

Package: [pub.dev](https://pub.dev/packages/pakdatakit_flutter)
