---
title: Install for Dart
description: Install pakdatakit from pub.dev for Dart.
---

```bash
dart pub add pakdatakit
```

```dart
import 'package:pakdatakit/pakdatakit.dart';

validateCNIC('35202-1234567-1'); // true
calculateSalaryTax(5000000, taxYear: 2027)?.tax; // 802000
```

Pure Dart, so it also works in Flutter apps, including Flutter web. For input formatters and form fields, see [Flutter](/install/flutter/).

Package: [pub.dev](https://pub.dev/packages/pakdatakit)
