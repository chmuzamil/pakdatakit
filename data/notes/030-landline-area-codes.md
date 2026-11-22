<!-- datasets: area-codes -->
## Landline area codes (`area-codes.json`)

114 codes, from the numbering plan PTA sent to the ITU on 9 November 2021
(https://www.itu.int/dms_pub/itu-t/oth/02/02/T02020000A10002PDFE.pdf,
retrieved 2026-11-16), which lists every code with its district. The 73 codes
held before November 2026 came from PTCL's national dialling-code list
(https://ptcl.com.pk/Info/National-Dialing-Codes) and all appear in the ITU
plan with the same districts.

- **Added 2026-11-16 from the ITU plan:** 18 codes in Balochistan (`822`
  Zhob to `856` Awaran), 8 in Khyber Pakhtunkhwa (`924` Khyber and Mohmand,
  `932` Malakand, `939` Buner, `942` Bajaur, `944` Upper Dir, `945` Lower
  Dir, `965` South Waziristan, `996` Shangla), 7 in Gilgit-Baltistan (`5811`
  Gilgit to `5817` Astore) and 8 in Azad Jammu and Kashmir (`5821` Neelum to
  `5828` Bhimber).
- Names are the districts the plan gives, spelt as in `districts.json` so
  that `getAreaCode` finds them: the plan writes "Neelum", "Sudonthi",
  "Bhimer" and "K.Abdullah / Pishin" for Neelam, Sudhnuti, Bhimber and Killa
  Abdullah and Pishin. `832` is listed there as Bolan, the former name of
  Kachhi district; both names find it. For the two districts split since
  2021, the successors are listed with the plan's name: `835` Dera Bugti,
  North Dera Bugti and South Dera Bugti; `965` South Waziristan, Lower South
  Waziristan and Upper South Waziristan.
- PTCL's own list differs for Azad Jammu and Kashmir (Muzaffarabad "58",
  Kotli "574") and has no Mirpur or Gilgit entry. The ITU plan is the newer
  list from PTA, so it is followed.
- **Non-geographic numbers** (since 2.7.0), from PTA's documents only:
  - **UAN**: an area code, then `111` and six digits, 11 to 13 digits in all
    ("National Universal Access Number" in the ITU plan of 9 November 2021,
    page 1). Written without the area code (`111-123-456`), as UANs are
    advertised, it is accepted with `e164: null`.
  - **Toll-free**: `0800` and five or six digits. The ITU plan gives five
    ("National Toll Free Number", same page: `800 XXXXX`, 8 digits in all).
    PTA's National Numbering Plan 2008 gives six: "the numbers take the form
    of '0800' access code + 6-digit virtual number (e.g. 0800 544321)"
    (section 8.1) and the structure table "(0)800 XXXXXX" (section 8.1.4),
    in both its final version and version 4
    (https://www.pta.gov.pk/assets/media/num_plan_230108.pdf, section 8.1.4,
    retrieved 2026-11-22). Six-digit numbers are in use: Soneri Bank
    publishes `0800005000` (https://soneribank.com/complaint-and-suggestions,
    retrieved 2026-11-22). Both lengths are accepted since 2.7.1; 2.7.0
    accepted only five. An 8-digit form taken from libphonenumber was
    accepted before 2.7.0; no PTA document lists it, so it stays rejected.
  - **Premium rate**: `0900` and five digits. The 2021 plan does not list
    0900; PTA's National Numbering Plan 2008 (Consultation Paper, final
    version, 25 June 2008, section 9.1.4,
    https://www.pta.gov.pk/assets/media/nnp_08_final.pdf, retrieved
    2026-11-22) gives this as the "current structure". The 6-digit form in
    the same paper was a proposal.
  - **Personal (`0122`)**: seen in use, no PTA source, not supported
    (decided 2026-11-22). libphonenumber lists `0122` as personal numbers,
    but neither PTA's 2021 plan nor its 2008 paper does, so since 2.7.0
    `analyzeNumber` returns `null` for them and `validateLandline` rejects
    them with or without `services`. The `personal` number type is kept so
    existing code compiles, is never returned, and will be removed in 3.0.
  - For UANs the 2008 paper gives `111` and seven digits; the 2021 plan,
    which is newer and was sent to the ITU, gives an area code, `111` and
    six digits, and is followed. (2.7.0's notes called the paper's six-digit
    toll-free form a proposal too; that was wrong: section 8.1 states it as
    the form of 0800 numbers, and 2.7.1 accepts it.)
- **Number lengths** are not taken from the ITU plan (its length table could
  not be read reliably). The patterns in `numbers.ts` come from
  libphonenumber's PK metadata (v9.0.41), which already accepted numbers in
  all 41 added codes: ten digits in all for the `58xx` codes, so a four-digit
  code is followed by six digits.
