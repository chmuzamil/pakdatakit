---
title: Install for PHP and Laravel
description: Install chmuzamil/pakdatakit from Packagist for PHP 8.2+, with Laravel rules and casts.
---

```bash
composer require chmuzamil/pakdatakit
```

Needs PHP 8.2+ with the `mbstring`, `ctype` and `json` extensions (standard in most builds); no `intl`.

```php
use PakDataKitCnic;
use PakDataKitIncomeTax;

Cnic::validate('35202-1234567-1'); // true
IncomeTax::calculateSalary(5000000, ['taxYear' => 2027])?->tax; // 802000

// Laravel (auto-discovered):
$request->validate(['cnic' => ['required', 'pk_cnic'], 'phone' => 'pk_phone']);
```

Package: [Packagist](https://packagist.org/packages/chmuzamil/pakdatakit)
