## Electricity and gas bill numbers

No dataset: `parseElectricityRef` and `validateGasConsumerNumber` check the
formats that the utilities' own bill pages ask for. All pages were retrieved
on 2026-11-18.

- **DISCO reference number**: 14 digits, with urban or rural chosen
  separately (`U`/`R`), on PITC's bill pages for all 11 companies
  (https://bill.pitc.com.pk/lescobill and the same for gepco, fesco, iesco,
  mepco, pesco, hazeco, hesco, sepco, qesco and tesco). PITC's illustration
  groups it as 2 + 5 + 7 digits, which is how `formatted` shows it.
- **DISCO customer ID**: 10 digits, or 11 for LESCO (the same PITC pages).
- **K-Electric account number**: "13 digits KE Account Number starting from
  04000" (https://beta.ke.com.pk/know-your-area-status/ and
  https://ke.com.pk/bills-e-payments/). K-Electric says its contract and
  consumer numbers are for its internal use, so they are not accepted.
- **SNGPL consumer number**: 11 digits
  (https://www.sngpl.com.pk/login.jsp?mdids=85).
- **SSGC customer number**: "10-digit Customer Number"
  (https://viewbill.ssgc.com.pk/web/).
- **Not published**: what the reference number's digit groups mean, which
  digits belong to which DISCO, and any check digit. So `disco` is `null`
  except for K-Electric, and only the format is checked. IESCO also notes
  that reference numbers can change
  (https://www.iesco.com.pk/search-reference-number).
