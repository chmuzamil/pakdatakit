---
title: Install for .NET
description: Install PakDataKit from NuGet for .NET 8, with DataAnnotations and FluentValidation packages.
---

```bash
dotnet add package PakDataKit
dotnet add package PakDataKit.DataAnnotations   # optional
dotnet add package PakDataKit.FluentValidation  # optional
```

```csharp
using PakDataKit;

Cnic.Validate("35202-1234567-1"); // true
IncomeTax.CalculateSalaryTax(5_000_000, new SalaryTaxOptions { TaxYear = 2027 })?.Tax; // 802000

// PakDataKit.DataAnnotations:  [Cnic] public string Cnic { get; set; }
// PakDataKit.FluentValidation: RuleFor(x => x.Cnic).IsCnic();
```

Packages: [PakDataKit](https://www.nuget.org/packages/PakDataKit), [DataAnnotations](https://www.nuget.org/packages/PakDataKit.DataAnnotations), [FluentValidation](https://www.nuget.org/packages/PakDataKit.FluentValidation). Each release on GitHub has the build-attested `.nupkg` files attached.
