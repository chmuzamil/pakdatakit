# Data audit, November 2026

An audit of PakDataKit's bundled datasets (`data/*.json`) against official
sources, done on **16 November 2026**. Every source below was retrieved on
that date unless a line says otherwise.

- Only official sources are cited: the State Bank of Pakistan (SBP), the
  Pakistan Telecommunication Authority (PTA) and the plan it filed with the
  ITU, PTCL, Pakistan Post, the Pakistan Bureau of Statistics (PBS), the
  Cabinet Division, and provincial government sites.
- Each finding is marked **Verified** (the official page or file was read),
  **Snippet only** (seen only in search-result text from an official site) or
  **Not verified**.
- Section 7 lists the fixes applied with this audit. Section 8 lists what was
  left as proposals, with a rough size for each. Section 9 records what was
  then done with each proposal, and corrects three findings above.

## Summary

| Dataset         | Entries       | Result                                                                                                        |
| --------------- | ------------- | ------------------------------------------------------------------------------------------------------------- |
| Districts       | 177           | Matches official lists where one could be read; 19 newer districts could not be confirmed on an official site |
| Divisions       | 0             | Not held. 30 in the 2023 census                                                                               |
| Tehsils         | 0             | Not held. 591 in the 2023 census                                                                              |
| Cities          | 226           | No official list of cities exists to check against                                                            |
| Postal codes    | 109 (now 110) | 8 wrong codes fixed, 3 office names fixed; about 4% of Pakistan Post's directory                              |
| Banks           | 48 (now 50)   | 2 banks added, 2 names updated; no wrong code or type found; 14 codes have no official confirmation           |
| Mobile prefixes | 53            | None wrong; `0370` and `0371` have no official confirmation                                                   |
| Area codes      | 73            | None wrong; 41 official codes are missing                                                                     |
| Holidays        | 2020–2026     | All 2024–2026 dates and the fixed-date rules are right; 7 source links replaced with official ones            |

## 1. Geography

### What we hold

| Level                | Held | Count | Notes                                                                                              |
| -------------------- | ---- | ----- | -------------------------------------------------------------------------------------------------- |
| Province / territory | Yes  | 7     | Punjab, Sindh, Khyber Pakhtunkhwa, Balochistan, Islamabad Capital Territory, AJK, Gilgit-Baltistan |
| Division             | No   | 0     |                                                                                                    |
| District             | Yes  | 177   | `districts.json`: district → province                                                              |
| Tehsil / taluka      | No   | 0     |                                                                                                    |
| City                 | Yes  | 226   | `cities.json`: city → province. Not linked to a district                                           |

Districts by province: Punjab 41, Sindh 30, Khyber Pakhtunkhwa 40, Balochistan
41, Gilgit-Baltistan 14, AJK 10, Islamabad 1. Cities by province: Punjab 109,
Sindh 38, Khyber Pakhtunkhwa 33, Balochistan 30, AJK 9, Gilgit-Baltistan 6,
Islamabad 1.

### Official counts (2023 census)

**Verified.** PBS, National Census Report 2023, Table 1.1 "Administrative
Units of Pakistan"
(https://www.pbs.gov.pk/wp-content/uploads/2020/07/National-Census-Report-2023.pdf):

| Area               | Divisions | Districts | Tehsils / talukas |
| ------------------ | --------- | --------- | ----------------- |
| Punjab             | 9         | 36        | 146               |
| Sindh              | 6         | 30        | 138               |
| Khyber Pakhtunkhwa | 7         | 35        | 148               |
| Balochistan        | 8         | 34        | 158               |
| Islamabad          | –         | 1         | 1                 |
| **Total**          | **30**    | **136**   | **591**           |

The table has no rows for AJK or Gilgit-Baltistan.

- **AJK, verified:** 3 divisions, 10 districts, 32 tehsils ("AJK at a Glance
  2023", Planning and Development Department,
  https://www.pndajk.gov.pk/uploadfiles/downloads/AJK%20at%20a%20Glance%202023.pdf).
  The three division names were seen in search text only.
- **Gilgit-Baltistan, snippet only:** 3 divisions and 10 districts, with four
  more districts "notified, but not functional" ("Gilgit Baltistan at a Glance
  2020", portal.pnd.gog.pk). That gives our 14.

### Our districts against the census

| Province           | Ours | Census 2023 | Difference                                                                                                          | Status                                                                                                                                                        |
| ------------------ | ---- | ----------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Punjab             | 41   | 36          | Murree, Talagang, Wazirabad, Kot Addu, Taunsa                                                                       | **Verified** as current districts on https://www.punjab.gov.pk/districts (41 districts, 10 divisions). PBS does not say why the census omits them             |
| Sindh              | 30   | 30          | None                                                                                                                | **Verified**                                                                                                                                                  |
| Khyber Pakhtunkhwa | 40   | 35          | Lower and Upper South Waziristan (one district in the census), Central Dir, Allai, Paharpur, Bar Swat               | **Snippet only** for Bar Swat and the two Waziristans (cmd.kp.gov.pk and the D.I. Khan divisional site). **Not verified** for Central Dir, Allai and Paharpur |
| Balochistan        | 41   | 34          | Quetta East and West, North and South Dera Bugti (one each in the census), Hub, Usta Muhammad, Barshore, Tump, Wadh | **Snippet only** for Hub and Usta Muhammad (divisional sites). **Not verified** for the July 2026 changes                                                     |
| Islamabad          | 1    | 1           | None                                                                                                                | **Verified**                                                                                                                                                  |
| AJK                | 10   | –           |                                                                                                                     | **Verified** (AJK at a Glance 2023)                                                                                                                           |
| Gilgit-Baltistan   | 14   | –           |                                                                                                                     | **Snippet only**                                                                                                                                              |

No district in `districts.json` is contradicted by an official source. The 19
districts marked "not verified" or "snippet only" rest on the news reports and
notifications cited in DATA.md.

### Divisions

**Verified** (census 2023, PBS province tables at
https://www.pbs.gov.pk/wp-content/uploads/census_tables/tables/table_1_punjab_province.pdf
and the same file name for `sindh`, `kp` and `balochistan`):

- Punjab (9): Bahawalpur, Dera Ghazi Khan, Faisalabad, Gujranwala, Lahore,
  Multan, Rawalpindi, Sahiwal, Sargodha. punjab.gov.pk now lists a tenth,
  Gujrat.
- Sindh (6): Hyderabad, Karachi, Larkana, Mirpur Khas, Shaheed Benazirabad,
  Sukkur.
- Khyber Pakhtunkhwa (7): Bannu, Dera Ismail Khan, Hazara, Kohat, Malakand,
  Mardan, Peshawar.
- Balochistan (8): Kalat, Loralai, Mekran, Nasirabad, Quetta, Rakhshan, Sibi,
  Zhob.

**Not verified:** today's division lists for Khyber Pakhtunkhwa and
Balochistan, and which division each post-census district belongs to.

### Tehsils: what it would take

**Verified:** PBS publishes every tehsil in the 2023 census, but only as PDF
tables (no Excel or CSV was found on https://www.pbs.gov.pk/census/):

- district → tehsil:
  https://www.pbs.gov.pk/wp-content/uploads/census_tables/tables/table_1_punjab_districts.pdf
  and the same name for `sindh`, `kp` and `balochistan`, plus
  `table_1_islamabad.pdf`;
- division → district: the `_province.pdf` files above.

Problems to solve:

- No file has division, district and tehsil together; the hierarchy is only
  implied by row order.
- Names are inconsistent: "TEHSIL" in Punjab, "TALUKA" in Sindh,
  "SUB-DIVISION" in Karachi and much of Balochistan; long names wrap over two
  lines; spellings differ between files ("TANDO AHYAR" and "TANDO ALLAHYAR")
  and from ours ("UMER KOT", "KAMBAR SHAHDAD KOT").
- The census is frozen at 136 districts. Our 177 include 17 districts created
  or split since, plus AJK and Gilgit-Baltistan, and no official list gives
  the tehsils of the new districts.
- AJK (32 tehsils) and Gilgit-Baltistan have no PBS table at all.

See proposal P1 in section 8.

## 2. Postal codes

### What Pakistan Post publishes

**Verified.** DATA.md used to say Pakistan Post had only a lookup tool. It
publishes full lists:

- "Post Code Directory of Delivery Post Offices" (Part I), a 45-page PDF dated
  February 2021 with about 2,520 offices:
  https://www.pakpost.gov.pk/images/national%20post%20code%20directory.pdf
- "List of Non-Delivery Post Offices" (Part II), dated April 2019, about 740
  offices:
  https://www.pakpost.gov.pk/images/LIST%20OF%20NON%20DELIVERY%20POs.pdf
- A web table, https://www.pakpost.gov.pk/postcodes.php, with 3,130 rows. Its
  delivery part is incomplete (Sialkot GPO and Sukkur GPO are missing, for
  example), so the PDF is the better source.

There is no Excel or CSV file. Pakistan Post's Annual Report 2024-25 counts
9,946 post offices
(https://www.pakpost.gov.pk/pdfForms/2026-01-09-Annual-Report-For-The-Year-2024-2025.pdf).

### Coverage

- 110 entries for 95 cities (Karachi 11, Lahore 5, Rawalpindi 2, one each for
  the rest): Punjab 47, Sindh 30, Khyber Pakhtunkhwa 16, Balochistan 9, AJK 5,
  Gilgit-Baltistan 2, Islamabad 1.
- That is about 4% of the 2,520 delivery post codes.
- 131 of the 226 cities in `cities.json` have no postal code.
- Only the main office of a city is held, so most area-level codes inside
  large cities return nothing.

### Accuracy

All 109 entries were checked against the Part I PDF and the web table.

**Verified wrong, fixed** (the code belonged to a nearby office):

| City             | Was   | Is    | The old code is              |
| ---------------- | ----- | ----- | ---------------------------- |
| Gilgit           | 15700 | 15100 | Karimabad                    |
| Dera Ismail Khan | 29120 | 29050 | Agricultural Research Center |
| Tank             | 29430 | 29400 | Pai                          |
| Badin            | 72220 | 72200 | Tando Ikram                  |
| Thatta           | 73020 | 73130 | Bulri Shah Karim             |
| Sujawal          | 73220 | 73050 | Filter Plant Gharo           |
| Matiari          | 70100 | 70150 | Saeedabad                    |
| Taxila           | 47040 | 47080 | Wah Cantt GPO                |

**Verified wrong office name, fixed:** Swat 19200 is Saidu Sharif GPO (not
Mingora), Sheikhupura 39350 is Qila Sheikhupura GPO, and Jamshoro 76080 is
"University New Campus Jamshoro".

**Verified right:** the other 101 codes.

**Left as is:** 17 entries we label "X GPO" are ordinary delivery offices in
the directory, not General Post Offices (Chiniot, Hafizabad, Pakpattan,
Nankana Sahib, Lodhran, Rajanpur, Kot Addu, Wazirabad, Mithi, Ghotki, Kashmore,
Swabi, Hangu, Gwadar, Chaman, Hub and Zhob). The codes
are right; only the label is loose. See proposal P3.

## 3. Banks

### SBP's current lists

**Verified.** SBP's list of regulated institutions
(https://www.sbp.org.pk/sbp-regulated-institutions/commercial-banks and
https://www.sbp.org.pk/sbp-regulated-institutions/microfinance-banks; the
pages carry no date) and its list of electronic money institutions
(https://www.sbp.org.pk/assets/document/List-of-EMIs.pdf, "Last Updated:
September 2, 2026"):

- **Public sector (4):** National Bank of Pakistan, Sindh Bank, The Bank of
  Khyber, The Bank of Punjab.
- **Local private (14):** Allied, Askari, Bank Alfalah, Bank Al Habib, First
  Women Bank, Habib Bank, Habib Metropolitan, JS Bank, MCB, Samba, Soneri,
  Standard Chartered (Pakistan), United Bank, Bank Makramah.
- **Islamic (6):** Al Baraka, BankIslami, Dubai Islamic, Faysal, MCB Islamic,
  Meezan.
- **Foreign (4):** Bank of China, Citibank, Deutsche Bank, ICBC.
- **Specialized (2):** Punjab Provincial Cooperative Bank, Zarai Taraqiati
  Bank.
- **Digital (3):** Easypaisa Bank, Mashreq Bank Pakistan, Raqami Islamic
  Digital Bank.
- **Microfinance (11):** HBL, NRSP, Khushhali, LOLC, U, Mobilink, Apna, Halan,
  Sindh, ABHI, ASA.
- **EMIs in commercial operation (7):** NayaPay, Finja, SadaPay, Akhtar Fuiou
  Technologies, E-Processing Systems, Wemsol, YAP Pakistan.

### Missing from `banks.json`

A bank can only be added when its four-letter IBAN code is confirmed. SBP's
list of dam fund accounts prints one IBAN for most banks
(https://archive.sbp.org.pk/notifications/FD/DamFund/Detail-1.pdf, undated,
about 2018).

| Bank                                                            | SBP list     | IBAN code                                         | Action      |
| --------------------------------------------------------------- | ------------ | ------------------------------------------------- | ----------- |
| Zarai Taraqiati Bank Limited                                    | Specialized  | `ZTBL`, **verified** (dam fund list)              | **Added**   |
| Sindh Microfinance Bank                                         | Microfinance | `SMFB`, **verified** (dam fund list)              | **Added**   |
| Punjab Provincial Cooperative Bank                              | Specialized  | Not found (the list gives a plain account number) | Proposal P4 |
| LOLC Microfinance Bank (formerly Pak Oman)                      | Microfinance | Not found                                         | Proposal P4 |
| Halan Microfinance Bank (formerly Advans)                       | Microfinance | Not found                                         | Proposal P4 |
| ASA Microfinance Bank (Pakistan)                                | Microfinance | Not found                                         | Proposal P4 |
| Finja, Akhtar Fuiou, E-Processing Systems, Wemsol, YAP Pakistan | EMI          | Not found                                         | Proposal P4 |

HugoBank and KT Bank are not on SBP's list of banks; SBP press releases name
them only as 2023 approval holders
(https://www.sbp.org.pk/assets/documents/press-release/Pr-28-Jan-2025.pdf).
Their current status, and KT Bank's reported new name, are **not verified**.
Bank of AJK is on no SBP list that was read.

### Renamed

| Code           | We had                                                    | SBP's name                     | Action                                                                                                                                              |
| -------------- | --------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TMFB`, `TAMW` | easypaisa Digital Bank                                    | Easypaisa Bank Limited         | **Fixed.** Declared a scheduled bank from 23 January 2025 (https://archive.sbp.org.pk/notifications/bprd/2025/ntf1.htm)                             |
| `JCMA`, `WMBL` | Mobilink Bank (JazzCash)                                  | Mobilink Microfinance Bank Ltd | **Fixed** to "Mobilink Microfinance Bank (JazzCash)", as on SBP's Raast page (https://www.sbp.org.pk/our-subsidiaries/raast/raast-person-to-person) |
| `FINC`         | ABHI Microfinance Bank (formerly FINCA Microfinance Bank) | ABHI Microfinance Bank Limited | Already right                                                                                                                                       |
| `SUMB`         | Bank Makramah Limited (formerly Summit Bank)              | Bank Makramah Limited          | Already right                                                                                                                                       |
| `FMFB`         | HBL Microfinance Bank (formerly First MicroFinance Bank)  | HBL Microfinance Bank Ltd      | Already right                                                                                                                                       |

SBP's spelling differs slightly for a few others ("Bank Al-Falah", "Bank
Al-Habib", "Al-Baraka", "Bank Islami", "Citi Bank N.A", "Industrial &
Commercial Bank of China"). These are left as they are; see proposal P5.

### Merged or no longer listed

| Code   | Bank             | Finding                                                                                                                                                                                                                                                                                             |
| ------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SAUD` | Silkbank         | **Verified.** De-scheduled on 10 March 2025 after merging into United Bank (https://archive.sbp.org.pk/notifications/bprd/2025/ntf4.htm). Our entry already says so                                                                                                                                 |
| `SMES` | SME Bank         | Not on SBP's current list, but still under specialized banks "as on 31st December, 2025" in SBP's Statistics on Scheduled Banks (https://www.sbp.org.pk/assets/document/publications/Download_Complete_Publication16_december2025.pdf). No de-scheduling notice found: **not verified**. Left as is |
| `NIBP` | NIB Bank         | Not on SBP's current list. The merger notice was not found: **not verified** from SBP. Our entry says merged into MCB                                                                                                                                                                               |
| `SAMB` | Samba Bank       | **Verified** still listed                                                                                                                                                                                                                                                                           |
| `FWOM` | First Women Bank | **Verified** still listed under that name, now among local private banks                                                                                                                                                                                                                            |

### Types

**Verified, no error found.** Faysal Bank is on SBP's Islamic list; Easypaisa,
Mashreq and Raqami are on the digital list; Standard Chartered is a local
private bank; Bank of China, Citibank, Deutsche Bank and ICBC are foreign
banks; SadaPay and NayaPay are EMIs. Our types do not separate public-sector
banks (National Bank, Sindh Bank, Bank of Khyber, Bank of Punjab) from other
commercial banks; see proposal P5.

### Codes

**Verified, no error found.** The dam fund list confirms 35 codes, including
`DEUT` and (as an IBAN in use) `SBPP`, which DATA.md had as "likely". The
list prints ICBC's IBAN with a digit `1` in place of the `I`; the checksum is
only valid with `ICBK`, so this is a misprint in the list.

**Not verified** from any SBP document read: `MCBL`, `NBPB`, `JCMA`, `TAMW`,
`NIBP`, `FINC`, `KHBL`, `NRSP`, `APNA`, `UMBL`, `NAYA`, `SADA`, `RQMI` and
`MSHQ`. DATA.md records what each rests on. The 2022 flood relief and 2023
earthquake relief account lists that DATA.md cites could not be found on
SBP's new website.

## 4. Mobile networks

### Official allocations

- **Verified.** PTA's National Numbering Plan 2008 paper, section 2.1.4
  (https://www.pta.gov.pk/assets/media/nnp_08_final.pdf): 30 Mobilink, 31
  Paktel, 32 Warid, 33 Ufone, 34 Telenor, 35 SCO, 36 Instaphone; 37, 38 and 39
  "for future use".
- **Verified.** The plan PTA sent to the ITU on 9 November 2021
  (https://www.itu.int/dms_pub/itu-t/oth/02/02/T02020000A10002PDFE.pdf):
  mobile numbers are `3A` plus 8 digits, "where A = 0-6". It names no
  operators.
- **Verified.** PTA's decision of 18 March 2026 on the Telenor and PTML merger
  refers to the codes "034 or 033" for the two operators
  (https://www.pta.gov.pk/category/authoritys-determinations-1069818154-2023-05-30,
  letter dated 18-3-2026).
- No official source gives four-digit prefixes (`0300` rather than `030x`),
  and PTA publishes no current table of operators by prefix. DATA.md said PTA
  "does not publish an allocation table"; that is corrected.

### Our prefixes

| Prefixes       | We say  | Official source                                                                                                   |
| -------------- | ------- | ----------------------------------------------------------------------------------------------------------------- |
| `0300`–`0309`  | Jazz    | **Verified**: 30 is Mobilink                                                                                      |
| `0320`–`0329`  | Jazz    | **Verified** that 32 was Warid's. Warid's merger into Jazz is **snippet only** (PTA's Mobilink–Warid merger page) |
| `0310`–`0319`  | Zong    | **Verified** that 31 was Paktel's. That Paktel became Zong (CMPak) is **not verified** from an official document  |
| `0330`–`0339`  | Ufone   | **Verified** (2008 plan and the 2026 decision)                                                                    |
| `0340`–`0349`  | Telenor | **Verified** (2008 plan and the 2026 decision)                                                                    |
| `0355`         | SCO     | **Verified** that 35 is SCO's. `0355` itself is **snippet only** (sco.gov.pk shows "SCOM No 0355-…")              |
| `0370`, `0371` | Zong    | **Not verified.** The 2008 plan reserves 37 and the 2021 ITU plan stops at 36. Not contradicted either            |

No prefix is wrong, and no officially allocated prefix is missing.
`0372`–`0379`, `038x` and `039x` have no official allocation, so leaving them
out is right. `036x` was Instaphone's and is still inside the ITU range; the
cancellation of Instaphone's licence is **not verified** from an official
source. Whether SCO uses `035x` prefixes other than `0355` is **not
verified**.

### Number portability and the Telenor merger

- **Verified.** PTA's Mobile Number Portability Regulations 2005 define
  portability as keeping the "Subscriber number along with Operator code" when
  changing operator (https://www.pta.gov.pk/assets/media/mnp_reg_fin.pdf). A
  prefix therefore shows the operator a number was first issued by, not the
  current one. `getNetwork` cannot do better: Pakistan has no public
  portability lookup.
- **Snippet only.** Portability began in 2007 (a PTA press release).
- **Verified.** PTCL completed the purchase of Telenor Pakistan on 31 December
  2025 (https://ptcl.com.pk/Home/PressReleaseDetail/?ItemId=927&linkId=130),
  and PTA approved the merger of Telenor Pakistan into PTML (Ufone) on 18
  March 2026, with conditions.
- **Not verified.** That the merger has legally completed, or any new brand
  name. PTA's page lists orders of July 2026 addressed to Telenor Pakistan and
  PTML separately. DATA.md said Telenor "merged into PTML (Ufone) in 2026";
  it now says the merger was approved.

## 5. Landline area codes

**Verified.** All 73 codes in `area-codes.json` appear with the same district
in the numbering plan PTA sent to the ITU in 2021
(https://www.itu.int/dms_pub/itu-t/oth/02/02/T02020000A10002PDFE.pdf). The 18
codes spot-checked against PTCL's list
(https://ptcl.com.pk/Info/National-Dialing-Codes) also match: 21 Karachi, 22
Hyderabad, 25 Dadu, 41 Faisalabad, 42 Lahore, 51 Islamabad and Rawalpindi, 52
Sialkot, 55 Gujranwala, 61 Multan, 71 Sukkur, 74 Larkana, 81 Quetta, 86
Gwadar, 91 Peshawar, 848 Khuzdar, 946 Swat, 966 Dera Ismail Khan and 992
Abbottabad. No code is wrong.

Names differ in a few places without being wrong: the plan says "Kech" for 852
(we say Turbat, its main city), and gives 925 as "Hangu / Orakzai", 928 as
"Bannu / N. Waziristan" and 997 as "Mansehra / Batagram".

**Verified missing:** the ITU plan has 41 codes we do not hold.

- Balochistan (18): 822 Zhob, 823 Killa Saifullah, 824 Loralai, 825 Chagai,
  826 Killa Abdullah and Pishin, 828 Musakhel, 829 Barkhan and Kohlu, 832
  Bolan, 833 Sibi and Ziarat, 835 Dera Bugti, 837 Jhal Magsi, 838 Jaffarabad
  and Nasirabad, 843 Mastung, 844 Kalat, 847 Kharan, 853 Lasbela, 855 Panjgur,
  856 Awaran.
- Khyber Pakhtunkhwa (8): 924 Khyber and Mohmand, 932 Malakand, 939 Buner, 942
  Bajaur, 944 Upper Dir, 945 Lower Dir, 965 South Waziristan, 996 Shangla.
- Gilgit-Baltistan (7): 5811 Gilgit, 5812 Diamer, 5813 Hunza, 5814 Ghizer,
  5815 Skardu, 5816 Ghanche, 5817 Astore.
- AJK (8): 5821 Neelum, 5822 Muzaffarabad, 5823 Bagh, 5824 Poonch, 5825
  Sudhnoti, 5826 Kotli, 5827 Mirpur, 5828 Bhimber.

DATA.md said the Muzaffarabad, Mirpur and Gilgit codes had only third-party
sources. The ITU plan is an official source for them. PTCL's own list
disagrees on two (Muzaffarabad "58", Kotli "574") and has no Mirpur or Gilgit
entry. The subscriber-number length for the four-digit codes is **not
verified**: the plan's length table did not extract cleanly.

These were not added with this audit because `validateLandline` checks number
lengths per code, and those lengths need confirming first. See proposal P2.

## 6. Public holidays

Sources: the Cabinet Division's yearly circulars and its notifications for
each Eid (scanned PDFs, read as images), and SBP's circular letters.

### Yearly circulars

- **2026, verified.**
  https://cabinet.gov.pk/SiteImage/Misc/files/Holidays/2026/Public-Holidays-2026.pdf
  (19 January 2026): Kashmir Day 5 February, Pakistan Day 23 March, Labour
  Day 1 May, Youm-e-Takbeer 28 May, Independence Day 14 August, Allama Iqbal
  Day 9 November, Quaid-e-Azam Day and Christmas 25 December, and 26 December
  for Christians only, plus the four Islamic holidays on "anticipated" dates.
  Our fixed dates match all of these.
- **2025, verified.**
  https://cabinet.gov.pk/SiteImage/Misc/files/Holidays/Public-Holidays-2025.pdf
  (23 December 2024). Same holidays; our fixed dates match.
- **2027, not yet published.** Nothing newer than November 2026 is on the
  Cabinet Division's holidays page, so 2027 Islamic dates stay marked
  `estimated`.

We name two holidays "Kashmir Solidarity Day" and "Iqbal Day"; the circular
says "Kashmir Day" and "Allama Iqbal Day". 28 May 2026 is both Youm-e-Takbeer
and an Eid ul Adha holiday, so `getPakistanHolidays(2026)` returns two entries
for that date, which is correct.

### Dates actually observed

All **verified**; every date in `holidays.json` for these years matches.

| Year | Eid ul Fitr      | Eid ul Adha | Ashura     | Eid Milad un Nabi |
| ---- | ---------------- | ----------- | ---------- | ----------------- |
| 2024 | 10–12 April      | 17–19 June  | 16–17 July | 17 September      |
| 2025 | 31 March–2 April | 6–9 June    | 5–6 July   | 6 September       |
| 2026 | 20–21 March      | 26–28 May   | 25–26 June | 26 August         |

The 2026 dates differ from the "anticipated" dates in the yearly circular
because the later notifications replace them; ours follow the notifications.
For 2024 only SBP's circulars were found, not the Cabinet Division's own
notifications.

### Source links

Every `source` link for 2025 and 2026 resolves. Seven links for 2024 to 2026
pointed to news sites, although DATA.md said entries came from Cabinet
Division notifications and SBP circulars. They are **replaced** with the
official document:

| Entry            | Was                  | Now                                                                                                              |
| ---------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 2024 Eid ul Fitr | thefridaytimes.com   | https://www.sbp.org.pk/circulars/bprd-circular-letter-no-08-of-2024                                              |
| 2024 Eid ul Adha | aaj.tv               | https://www.sbp.org.pk/circulars/bprd-circular-letter-no-11-of-2024                                              |
| 2025 Eid ul Fitr | arynews.tv           | https://cabinet.gov.pk/SiteImage/Misc/files/Holidays/Eid-ul-Fitr%202025%20Holidays%20-%2019-03-2025.pdf          |
| 2025 Ashura      | tribune.com.pk       | https://cabinet.gov.pk/SiteImage/Misc/files/Press%20Release/Ashura-Holidays-2025.pdf                             |
| 2026 Eid ul Fitr | app.com.pk           | https://cabinet.gov.pk/SiteImage/Misc/files/Holidays/EidulFitr%202026.pdf                                        |
| 2026 Eid ul Adha | pkrevenue.com        | https://cabinet.gov.pk/SiteImage/Misc/files/Holidays/2026/Eid-ul-Azha-holidays-Notification-20_05_2026.pdf       |
| 2026 Ashura      | dailypakistan.com.pk | https://cabinet.gov.pk/SiteImage/Misc/files/Press%20Release/Notification_Ashura%20Public%20Holiday%2C%202026.pdf |

Seven of the 16 sources for 2020 to 2023 are still news reports (2020 Ashura
and Eid Milad un Nabi, 2021 Ashura and Eid Milad un Nabi, 2022 Eid Milad un
Nabi, 2023 Eid ul Fitr and Ashura). Those years were not part of this
spot-check. See proposal P6.

### Fixed-date rules

- **Verified.** Iqbal Day was restored in 2022: the Cabinet Division
  notification of 8 November 2022 restores the holiday
  (https://cabinet.gov.pk/SiteImage/Misc/files/Holidays/Iqbal_Day.pdf), it is
  absent from the 2022 yearly list issued in December 2021, and present from
  2023 on. That it was dropped in 2015 is **not verified**.
- **Verified.** Youm-e-Takbeer became a holiday in 2024: it is not in the 2024
  yearly list, SBP closed on 28 May 2024 for it
  (https://www.sbp.org.pk/circulars/bprd-circular-letter-no-10-of-2024), and
  it is in the 2025 and 2026 lists.
- **Verified** for 2022 to 2026: no other fixed holiday was added or removed.
  27 October is not a holiday.
- **Not verified:** the 2020 and 2021 yearly lists, which could not be found.

## 7. Fixes applied

Data version `2026-11-07` → `2026-11-16`. The shared test vectors and the
data embedded in the Python, Dart, .NET and PHP ports were regenerated.

1. **Banks added:** `ZTBL` Zarai Taraqiati Bank Limited (specialized) and
   `SMFB` Sindh Microfinance Bank (microfinance).
2. **Banks renamed:** `TMFB` and `TAMW` to "Easypaisa Bank Limited (formerly
   Telenor / Tameer Microfinance Bank)"; `JCMA` and `WMBL` to "Mobilink
   Microfinance Bank (JazzCash)".
3. **Postal codes corrected:** Gilgit, Dera Ismail Khan, Tank, Badin, Thatta,
   Sujawal, Matiari and Taxila (table in section 2). `47040` now returns Wah
   Cantonment, whose GPO it is.
4. **Post office names corrected:** Saidu Sharif GPO, Qila Sheikhupura GPO,
   University New Campus Jamshoro.
5. **Holiday sources:** seven links replaced with official documents. No date
   changed.
6. **DATA.md:** provenance updated for banks, mobile networks, area codes,
   postal codes and holidays, including the three statements this audit found
   to be wrong (PTA publishes no allocation table; Pakistan Post has only a
   lookup tool; the Telenor merger is complete).

No mobile prefix or area code was changed: none was found wrong.

## 8. Proposals

Sizes are rough: **small** is under a day, **medium** is a few days, **large**
is a week or more.

| #   | Proposal                                     | Size       | Needs a decision on                              |
| --- | -------------------------------------------- | ---------- | ------------------------------------------------ |
| P1  | Divisions and tehsils                        | Large      | How to handle districts created after the census |
| P2  | 41 missing area codes                        | Medium     | Number lengths for AJK and Gilgit-Baltistan      |
| P3  | Import Pakistan Post's full directory        | Medium     | Package size and API shape                       |
| P4  | Codes for 9 institutions on SBP's lists      | Small each | Nothing; needs one real IBAN per bank            |
| P5  | Bank name spelling and a public-sector type  | Small      | Whether to change names users may match on       |
| P6  | Official sources for 2020–2023 holidays      | Small      | Nothing                                          |
| P7  | Confirm 19 newer districts on official sites | Small      | Nothing                                          |
| P8  | `0370`, `0371` and the Telenor label         | Small      | When to relabel `034x`                           |

**P1. Divisions and tehsils (large).**
Divisions are the easy half: 30 names from the PBS province tables, plus a
`division` field on each of the 136 census districts. That is about a day,
but the 41 post-census, AJK and Gilgit-Baltistan districts need a division
from provincial sources, most of which could not be read for this audit.
Tehsils are about 591 rows from five PDFs that need semi-manual cleaning
(suffixes, wrapped names, spellings), then mapping to our district names, a
new `tehsils.json` (roughly 40–50 KB), lookups in all five languages and new
test vectors. The open question is the 17 districts created or split since
the census: no official list says which tehsils moved to them. Options are to
ship tehsils under their 2023 census district and say so, or to wait for
provincial lists. AJK's 32 tehsils and Gilgit-Baltistan's have no PBS table.

**P2. Missing area codes (medium).**
The 26 Balochistan and Khyber Pakhtunkhwa codes are in both the ITU plan and
PTCL's list and are low risk; they need the subscriber-number length for each
checked against `numbers.ts` and new vectors. The 15 AJK and Gilgit-Baltistan
codes are four digits long, PTCL's list disagrees with the ITU plan on two of
them, and their number lengths are not verified, so they need a readable copy
of the plan's length table or confirmation from SCO first.

**P3. Full postal directory (medium).**
Import the roughly 2,520 delivery offices from the Part I PDF. The office
name and code columns extract cleanly; the province column is inconsistent
("KPK", "Punjba") and the account-office column needs care. Each office must
be mapped to a city or district, which is most of the work. The dataset would
grow from about 11 KB to roughly 150–200 KB, so it may belong in a separate
entry point. It would also settle the 17 loose "GPO" labels.

**P4. Codes for institutions on SBP's lists (small each).**
Punjab Provincial Cooperative Bank, LOLC, Halan and ASA microfinance banks,
and the EMIs Finja, Akhtar Fuiou, E-Processing Systems, Wemsol and YAP. Each
needs one real IBAN from an official page or an account holder. Not every
EMI issues IBANs.

**P5. Bank names and types (small).**
Decide whether to follow SBP's spelling exactly ("Bank Al-Falah Limited",
"Bank Islami Pakistan Limited", "Citi Bank N.A") or keep the banks' own
styling, which is what we have now. Decide whether to add a `public` type for
the four public-sector banks; that changes the `type` of four entries, which
users may depend on. Also settle `SMES` and `NIBP` once SBP's notices are
found.

**P6. Holiday sources for 2020–2023 (small).**
Replace the seven remaining news links with Cabinet Division or SBP
documents, as done for 2024–2026. The 2020 and 2021 yearly circulars could
not be found on cabinet.gov.pk.

**P7. Newer districts (small).**
Find the notification, or a provincial government page, for Central Dir,
Allai, Paharpur, Bar Swat and the two South Waziristans (Khyber
Pakhtunkhwa), for Hub, Usta Muhammad and the July 2026 changes (Balochistan),
and for Gilgit-Baltistan's four newer districts. None is contradicted; they
are simply not confirmed from an official site that could be read.

**P8. `0370`, `0371` and Telenor (small).**
Ask PTA or Zong for the 037x allocation, or keep the note that it rests on
libphonenumber. Relabel `034x` only when PTA or PTML announces that the
merger is complete and what the brand is; a note in the docs is enough until
then.

## 9. Follow-up: what was done with the proposals

Done on the `phase-3b-data-depth` branch on 16 November 2026. Sources were
retrieved that day. DATA.md has the provenance for each dataset.

| #   | Proposal                       | Outcome                                                                                            |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------------- |
| P1  | Divisions and tehsils          | **Done.** 30 divisions and 591 tehsils from the census; current district confirmed for Punjab only |
| P2  | 41 missing area codes          | **Done.** All 41 added                                                                             |
| P3  | Pakistan Post's full directory | **Done.** 2,560 codes                                                                              |
| P4  | Codes for 9 institutions       | **None found.** Nothing added                                                                      |
| P5  | Bank names and types           | **Type done** (`public-sector`). Names kept in the banks' own styling; SBP's spellings recorded    |
| P6  | Holiday sources for 2020–2023  | **Done.** All seven replaced with SBP circulars; dates unchanged                                   |
| P7  | Confirm 19 newer districts     | **Partly.** 7 confirmed, 12 still not confirmed; nothing changed                                   |
| P8  | `0370`, `0371` and Telenor     | **Unverified, unchanged.** No official 037x allocation found; the merger completed, label kept     |

**P1.** The census tables give exactly the totals of the census report: 30
divisions, 136 districts, 591 tehsil-level units. Each tehsil records its
census district. For the 17 census districts that have lost territory to a
new district, the current district is recorded only where an official list
confirms it: all 25 tehsils of the five Punjab parent districts, from the
Board of Revenue's list as on 31 December 2023 (Punjab Bureau of Statistics,
Statistical Pocket Book 2025,
https://bos.punjab.gov.pk/system/files/Statistical%20Pocket%20Book%202025%20Final.pdf).
The other 78 tehsils, in Khyber Pakhtunkhwa and Balochistan, are `null`.
Still open: tehsils created since the census, a division for post-census
districts, and Azad Jammu and Kashmir and Gilgit-Baltistan.

**P2.** `validateLandline` already accepted numbers in all 41 codes, because
its patterns come from libphonenumber. Adding the codes only fills in the
area code and district that `analyzeNumber` returns. The number length for
the four-digit `58xx` codes is libphonenumber's (ten digits in all); it was
not confirmed from the ITU plan.

**P3.** See DATA.md for how each office is given a city. No lookup that
worked before gives a different answer. The 740 non-delivery offices of Part
II are not imported.

**P4.** Searched: SBP's flood relief (2022) and Türkiye–Syria relief (2023)
IBAN lists, the dam fund list, and each institution's own website. No printed
IBAN was found for Punjab Provincial Cooperative Bank, LOLC, Halan or ASA
microfinance banks, or the EMIs Finja, Akhtar Fuiou, E-Processing Systems,
Wemsol and YAP. The two relief lists, which section 3 said could not be
found, are at https://archive.sbp.org.pk/IBANs-of-PM-Flood-Relief-Fund.pdf
and https://archive.sbp.org.pk/ReliefFund-Turkiye.pdf. They confirm six
codes that section 3 listed as not verified: `JCMA`, `FINC`, `KHBL`, `NRSP`,
`APNA` and `UMBL`. Still without an official source: `NAYA`, `SADA`, `RQMI`,
`MSHQ`, and the legacy codes `MCBL`, `NBPB`, `TAMW` and `NIBP`. One more
finding, not acted on: an SBP circular reproduced on a bank's website prints
an SBP account with the code `SBPD`.

**P5.** SBP's list has a "Public Sector Commercial Banks" group, so National
Bank of Pakistan, Sindh Bank, The Bank of Khyber and The Bank of Punjab are
now `public-sector`. SBP's spellings were not copied, because the list is
not consistent ("Allied Bank limited", "Citi Bank N.A"); they are recorded in
DATA.md. Section 3 said no notice was found for two banks; both exist. SME
Bank was de-scheduled on 17 March 2025 "as it has gone into liquidation"
(https://archive.sbp.org.pk/notifications/bprd/2025/ntf6.htm) and is now
marked inactive. NIB Bank was de-scheduled on 7 July 2017 on its merger into
MCB Bank (https://archive.sbp.org.pk/notifications/bprd/2017/ntf2.htm).

**P6.** SBP circular letters, each stating the dates we hold: 2020 Ashura
(No. 39 of 2020), 2020 Eid Milad un Nabi (No. 46 of 2020), 2021 Ashura (No.
27 of 2021), 2021 Eid Milad un Nabi (No. 31 of 2021), 2022 Eid Milad un Nabi
(No. 28 of 2022), 2023 Eid ul Fitr (No. 08 of 2023) and 2023 Ashura (No. 14
of 2023), at
`https://www.sbp.org.pk/circulars/bprd-circular-letter-no-NN-of-YYYY`. Every
`source` in `holidays.json` is now a Cabinet Division or SBP document.

**P7.** Nothing in `districts.json` was changed.

| District                                               | Result                                                                                                                                                                                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lower and Upper South Waziristan                       | **Verified.** Election Commission delimitation report, 27 September 2023: "South Waziristan has recently been bifurcated into two districts" (https://ecp.gov.pk/storage/uploads/bp8XWT0QfEUZB8y4uvlmCFGG8g3RrjiwJ99sLSz3.pdf) |
| Bar Swat                                               | **Verified.** Malakand Division's website lists it among 10 districts (cmd.kp.gov.pk)                                                                                                                                          |
| Hub                                                    | **Verified.** The same Election Commission report: "Hub district has been created from Lasbella district"                                                                                                                      |
| Usta Muhammad, Barshore, Tump                          | **Verified** as districts in Balochistan's 2026-27 budget documents (finance.gob.pk, June 2026)                                                                                                                                |
| Central Dir, Allai, Paharpur                           | **Not confirmed.** Malakand and Hazara divisions' websites list no Central Dir or Allai, and Khyber Pakhtunkhwa's Development Statistics 2026 still shows Allai and Paharpur as tehsils                                        |
| Quetta East and West, North and South Dera Bugti, Wadh | **Not confirmed.** Balochistan's government sites could not be reached; its June 2026 budget paper still writes "Wadh District Khuzdar"                                                                                        |
| Darel, Tangir, Gupis-Yasin, Roundu                     | **Not confirmed as working districts.** Gilgit-Baltistan's 2024-25 development programme treats them as sub-divisions of Diamer, Ghizer and Skardu                                                                             |

The 12 unconfirmed districts stay, on the notifications and reports cited
in DATA.md. The three in Khyber Pakhtunkhwa are the weakest: official pages
updated in November 2026 do not show them. Removing a district would change
`getDistrictProvince`, `searchDistricts` and the district counts, so it
needs a decision, with the notification in hand. News reports also mention a
new "West Chagai" district (October 2026); no official source was found.

**P8.** No document from PTA, the ITU or Zong gives `0370` or `0371` to an
operator, so both stay as they are, marked unverified in DATA.md. The
Telenor merger is complete: PTCL announced on 2 July 2026 the "successful
completion of the amalgamation of Telenor Pakistan into Pak Telecom Mobile
Limited (PTML), operating as Ufone 5G"
(https://ptcl.com.pk/Home/PressReleaseDetail/?ItemId=934&linkId=130). This
corrects section 4, which called it not verified. `034x` is still labelled
Telenor: the dataset records the operator a prefix was allocated to, and no
new brand has been announced officially.

### Still open

- Tehsils of today's districts in Khyber Pakhtunkhwa and Balochistan (78
  with no confirmed current district), and tehsils created since 2023.
- Divisions and tehsils of Azad Jammu and Kashmir and Gilgit-Baltistan.
- The 12 districts above.
- IBAN codes for the nine institutions, and an official source for `NAYA`,
  `SADA`, `RQMI` and `MSHQ`.
- An official 037x allocation.
- A district for each post office. The directory does not give one.

## Method and limits

- Pages and files were downloaded and read on 16 November 2026. Scanned PDFs
  (Cabinet Division notifications, the PTA merger decision) were read as
  images.
- sbp.org.pk and pta.gov.pk refuse some automated requests; where a page
  could not be fetched it is marked "not verified" rather than assumed.
  sco.gov.pk could not be read at all.
- PBS and Pakistan Post PDFs lose their column layout when converted to text.
  Names and codes were taken from the text; the dam fund IBAN list was
  re-read by position on the page to pair each bank with its IBAN.
- A missing official source does not make an entry wrong. "Not verified"
  means only that this audit could not confirm it officially.
