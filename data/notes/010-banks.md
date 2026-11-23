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

### Websites and SWIFT/BIC codes (2.8.0)

Kept in `data/sources/bank-details.json` and merged into `banks.json` by
`scripts/generate-data.mjs`. All checked 2026-11-23.

- **Websites (47):** from SBP's lists of regulated institutions
  (https://www.sbp.org.pk/sbp-regulated-institutions/commercial-banks and
  .../microfinance-banks). Where the bank now uses another domain, `website`
  is the bank's current one and `websiteSbpListed` keeps SBP's: Askari
  (`askaribank.com.pk`), ABHI (`finca.pk`), Mobilink (`waseelabank.com`) and
  Standard Chartered (`standardchartered.com.pk`). Bank Alfalah's SBP link is
  an Outlook "safelinks" redirect; the plain URL is used. Deutsche Bank and
  Mashreq point to the Pakistan page of the group site. Bank of China, ICBC,
  NayaPay and SadaPay have no website in SBP's lists; theirs come from their
  own sites. NIBP and SAUD (merged) and SMES (in liquidation) have none, with
  `status` and `mergedInto` naming the successor where there is one.
- **SWIFT/BIC (16 codes, 15 banks):** only codes printed by SBP or on the
  institution's own domain, stored as the 8-character BIC, with the printed
  form, URL, page and date (`swiftSource`). Not used: codes derived from
  SBP's list of Roshan Digital Account codes or from branch codes, NBP's
  code in an S&P Global profile hosted on its site, aggregator sites, and
  BankIslami's 10-character "BKIPPKKXXX". SWIFT's own directory search is
  behind a CAPTCHA and was not used.
- **1LINK IMD codes:** not included. There is no official public source;
  1LINK shares them with members only (its members page returns 404, and
  SBP's pages do not list them).

| Code   | SWIFT/BIC  | Printed as    | Source                                                                                                                                              |
| ------ | ---------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ABPA` | `ABPAPKKA` | `ABPAPKKA`    | bank-site: https://www.abl.com/business-banking/accounts/home-remmittances/nostro-account-and-swift-code/                                           |
| `ASCM` | `ASCMPKKA` | `ASCM PKKA`   | bank-site: https://askaribank.com/investor-relations/useful-information-for-shareholders                                                            |
| `BAHL` | `BAHLPKKA` | `BAHLPKKA`    | bank-site: https://www.bankalhabib.com/alhabib-roshan-digital-account                                                                               |
| `BKCH` | `BKCHPKKA` | `BKCHPKKA`    | bank-site: https://www.boc.cn/english/thisisboc/gls/ovs/202601/t20260106_25640027.html                                                              |
| `CITI` | `CITIPKKX` | `CITIPKKX`    | bank-site: https://depositaryreceipts.citi.com/adr/guides/dspcustodian.aspx?pageId=15&subpageID=151&cusip=695849109&cstdn_id=CPAK                   |
| `DEUT` | `DEUTPKKA` | `DEUTPKKAXXX` | bank-site: https://country.db.com/mea/documents/Deutsche-Bank-AG-Pakistan-SSI.pdf, p. 1                                                             |
| `HABB` | `HABBPKKA` | `HABBPKKA`    | bank-site: https://www.hbl.com/assets/documents/Nostros_and_SSI_for_HBL_Pakistan_-_JAN_2026.pdf, p. 1                                               |
| `ICBK` | `ICBKPKKA` | `ICBKPKKAXXX` | bank-site: https://www.icbc-ltd.com/en/page/721852698013237261.html                                                                                 |
| `JSBL` | `JSBLPKKA` | `JSBLPKKA`    | bank-site: https://jsbl.com/wp-content/uploads/2020/01/SSI-for-website.pdf, p. 1                                                                    |
| `MCBL` | `MUCBPKKA` | `MUCBPKKA`    | bank-site: https://mopss.mcb.com.pk/assets/pdf/Guidelines%20for%20remitting%20funds%20to%20your%20MCB%20Bank%20Roshan%20Digital%20Account.pdf, p. 1 |
| `MCIB` | `MCIBPKKI` | `MCIBPKKI`    | bank-site: https://www.mcbislamicbank.com/investor-relations/investor-information/                                                                  |
| `MEZN` | `MEZNPKKA` | `MEZN PK KA`  | bank-site: https://www.meezanbank.com/wp-content/themes/mbl/downloads/NOSTRO.pdf, p. 1                                                              |
| `MUCB` | `MUCBPKKA` | `MUCBPKKA`    | bank-site: https://mopss.mcb.com.pk/assets/pdf/Guidelines%20for%20remitting%20funds%20to%20your%20MCB%20Bank%20Roshan%20Digital%20Account.pdf, p. 1 |
| `SBPP` | `SBPPPKKA` | `SBPPPKKA`    | sbp: https://archive.sbp.org.pk/dmmd/2019/C2.htm                                                                                                    |
| `SCBL` | `SCBLPKKX` | `SCBLPKKX`    | bank-site: https://www.sc.com/pk/donation-goals/                                                                                                    |
| `UNIL` | `UNILPKKA` | `UNILPKKA`    | bank-site: https://www.ubldigital.com/Portals/0/Remittance/FXServices/UBLSSIs.pdf, p. 1                                                             |

No SWIFT/BIC code, and why:

- `AIIN` (Al Baraka Bank (Pakistan) Limited): No page on the bank's own domain prints a BIC.
- `ALFH` (Bank Alfalah Limited): Only the Roshan Digital Account branch code ALFHPKKARDA is printed (SBP list, bank pages); the 8-character code would be derived.
- `APNA` (Apna Microfinance Bank): Microfinance bank; no BIC printed on its own domain (it may have none).
- `BKIP` (BankIslami Pakistan Limited): The bank's site prints "BKIPPKKXXX", which has 10 characters and is not a valid BIC.
- `BPUN` (The Bank of Punjab): The bank's trade pages are behind an Imperva security check; not bypassed. Only branch codes appear in search results.
- `DUIB` (Dubai Islamic Bank Pakistan Limited): Only the Roshan Digital Account branch code DUIBPKKARDA is printed (SBP list, dibpak.com).
- `FAYS` (Faysal Bank Limited): The bank's document that prints it is behind a Cloudflare challenge; not bypassed.
- `FINC` (ABHI Microfinance Bank (formerly FINCA Microfinance Bank)): Microfinance bank; no BIC printed on its own domain (it may have none).
- `FMFB` (HBL Microfinance Bank (formerly First MicroFinance Bank)): Microfinance bank; no BIC printed on its own domain (it may have none).
- `FWOM` (First Women Bank Limited): No page on the bank's own domain prints a BIC.
- `JCMA` (Mobilink Microfinance Bank (JazzCash)): Microfinance bank; no BIC printed on its own domain (it may have none).
- `KHBL` (Khushhali Microfinance Bank): Microfinance bank; no BIC printed on its own domain (it may have none).
- `KHYB` (The Bank of Khyber): Only a branch code is printed ("khybpkka 024"); the page that may print it returns "Access denied".
- `MPBL` (Habib Metropolitan Bank Limited): Only the Roshan Digital Account branch code MPBLPKKARDA is printed (SBP list); no habibmetro.com page prints the code.
- `MSHQ` (Mashreq Bank Pakistan Limited): No Mashreq Pakistan page prints a BIC.
- `NAYA` (NayaPay): Electronic money institution, not a bank; no BIC printed.
- `NBPA` (National Bank of Pakistan): Only printed in an S&P Global profile hosted on nbp.com.pk, not an NBP document; NBP's own documents print only the branch code NBPAPKKAMBR.
- `NBPB` (National Bank of Pakistan): Only printed in an S&P Global profile hosted on nbp.com.pk, not an NBP document; NBP's own documents print only the branch code NBPAPKKAMBR.
- `NIBP` (NIB Bank Limited (merged into MCB Bank)): Merged into MCB Bank.
- `NRSP` (NRSP Microfinance Bank): Microfinance bank; no BIC printed on its own domain (it may have none).
- `RQMI` (Raqami Islamic Digital Bank Limited): No page on the bank's own domain prints a BIC.
- `SADA` (SadaPay): Electronic money institution, not a bank; no BIC printed.
- `SAMB` (Samba Bank Limited): Only the Roshan Digital Account branch code SAMBPKKARDA is printed (SBP list); the bank FAQ that printed it is gone.
- `SAUD` (Silkbank Limited (merged into United Bank Limited)): Merged into United Bank Limited.
- `SIND` (Sindh Bank Limited): No page on the bank's own domain prints a BIC (its IBFT page shows only the short code SND).
- `SMES` (SME Bank Limited (in liquidation)): In liquidation.
- `SMFB` (Sindh Microfinance Bank): Microfinance bank; no BIC printed on its own domain (it may have none).
- `SONE` (Soneri Bank Limited): Only branch codes are printed (SONEPKKACTO, SONEPKKALHR, SONEPKKASIK); the 8-character code would be derived.
- `SUMB` (Bank Makramah Limited (formerly Summit Bank)): No page on the bank's own domain prints a BIC.
- `TAMW` (Easypaisa Bank Limited (formerly Tameer Microfinance Bank)): No page on the bank's own domain prints a BIC.
- `TMFB` (Easypaisa Bank Limited (formerly Telenor Microfinance Bank)): No page on the bank's own domain prints a BIC.
- `UMBL` (U Microfinance Bank): Microfinance bank; its site calls the 4-letter IBAN code "UMBL" a SWIFT code, which it is not.
- `WMBL` (Mobilink Microfinance Bank (JazzCash)): Microfinance bank; no BIC printed on its own domain (it may have none).
- `ZTBL` (Zarai Taraqiati Bank Limited): No page on the bank's own domain prints a BIC.
