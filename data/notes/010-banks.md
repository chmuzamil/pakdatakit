<!-- datasets: banks -->

## Banks (`banks.json`): IBAN bank codes

SBP does not publish a list of IBAN bank codes, and IBAN codes do not always
match SWIFT BIC prefixes (e.g. Silkbank is `SAUD`). Codes are therefore checked
against real IBANs. Names follow SBP's lists of regulated institutions
(https://www.sbp.org.pk/sbp-regulated-institutions/commercial-banks and
.../microfinance-banks, retrieved 2026-11-16), with a former name kept in
brackets where people still search for it.

- **Confirmed from IBANs printed by SBP:** 35 codes, from SBP's list of dam
  fund accounts at every bank
  (https://archive.sbp.org.pk/notifications/FD/DamFund/Detail-1.pdf, undated,
  about 2018, retrieved 2026-11-16): `AIIN`, `ABPA`, `ASCM`, `ALFH`, `BAHL`,
  `BKIP`, `KHYB`, `BPUN`, `BKCH`, `CITI`, `DEUT`, `DUIB`, `FAYS`, `FWOM`,
  `HABB`, `MPBL`, `ICBK`, `JSBL`, `MUCB`, `MCIB`, `MEZN`, `NBPA`, `SAMB`,
  `SAUD`, `SIND`, `SMES`, `SONE`, `SCBL`, `SUMB`, `UNIL`, `ZTBL` (Zarai
  Taraqiati Bank), `TMFB`, `WMBL`, `FMFB` and `SMFB` (Sindh Microfinance
  Bank). The same list shows an `SBPP` IBAN in use. `ZTBL` and `SMFB` were
  added on 2026-11-16 from this list. (It prints ICBC's IBAN with a digit `1`
  for the `I`; the checksum is only valid with `ICBK`.)
- **Also confirmed from IBANs printed by SBP:** `KHBL` (Khushhali), `JCMA`
  (Mobilink Microfinance Bank), `FINC` (ABHI, as FINCA), `UMBL`, `NRSP` and
  `APNA`, from SBP's account lists for the Prime Minister's Flood Relief Fund
  2022 (https://archive.sbp.org.pk/IBANs-of-PM-Flood-Relief-Fund.pdf) and the
  2023 relief fund for Türkiye and Syria
  (https://archive.sbp.org.pk/ReliefFund-Turkiye.pdf), both retrieved
  2026-11-16. That makes 41 codes confirmed by SBP documents.
- **Confirmed from published IBANs on smaller sites:** `SADA` (SadaPay), `NAYA`
  (NayaPay).
- **Confirmed from real account IBANs shared by a maintainer:** `RQMI` (Raqami
  Islamic Digital Bank) and `MSHQ` (Mashreq Bank Pakistan), both digital banks.
- **Legacy codes with no official source:** `MCBL`, `NBPB`, `TAMW` and `NIBP`.
- **Not included, because no code could be confirmed:** Punjab Provincial
  Cooperative Bank, LOLC Microfinance Bank (formerly Pak Oman), Halan
  Microfinance Bank (formerly Advans), ASA Microfinance Bank, the EMIs Finja,
  Akhtar Fuiou Technologies, E-Processing Systems, Wemsol and YAP Pakistan,
  HugoBank, KT Bank and Bank of AJK. A second search on 2026-11-16 (SBP's
  relief-fund lists and each institution's own website) found no printed IBAN
  for any of them.
- **Types** follow SBP's groups on its list of regulated institutions:
  "Public Sector Commercial Banks" are `public-sector` (National Bank of
  Pakistan, Sindh Bank, The Bank of Khyber, The Bank of Punjab), "Local
  Private Banks" are `commercial`, and "Islamic", "Foreign", "Specialized"
  and "Digital" banks have the type of the same name.
- **Spelling.** Names use each bank's own styling ("Bank Alfalah Limited",
  "Bank Al Habib Limited", "BankIslami Pakistan Limited", "Citibank N.A.
  Pakistan"). SBP's list spells some differently, and not consistently
  ("Bank Al-Falah Limited", "Bank Al-Habib Limited", "Al-Baraka Bank
  (Pakistan) Limited", "Bank Islami Pakistan Limited", "Citi Bank N.A",
  "Industrial & Commercial Bank of China", "Allied Bank limited"), so it is
  recorded here and not copied.
- **Closed:** `SMES` → "SME Bank Limited (in liquidation)", `active: false`.
  SBP cancelled its licence and de-scheduled it on 17 March 2025
  (https://archive.sbp.org.pk/notifications/bprd/2025/ntf6.htm). `NIBP` was
  de-scheduled on 7 July 2017 on its merger into MCB Bank
  (https://archive.sbp.org.pk/notifications/bprd/2017/ntf2.htm).
- **Merged or renamed** banks keep their code with the current name, e.g.
  `SAUD` → "Silkbank Limited (merged into United Bank Limited)" (de-scheduled
  by SBP on 10 March 2025,
  https://archive.sbp.org.pk/notifications/bprd/2025/ntf4.htm) and `TMFB` →
  "Easypaisa Bank Limited" (a scheduled bank from 23 January 2025,
  https://archive.sbp.org.pk/notifications/bprd/2025/ntf1.htm).
