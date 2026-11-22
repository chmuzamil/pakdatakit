<!-- datasets: divisions tehsils -->
## Divisions and tehsils (`divisions.json`, `tehsils.json`)

From Table 1 of the 2023 census (Pakistan Bureau of Statistics), which lists
every administrative unit with its area and population. Retrieved 2026-11-16:

- tehsils by district:
  https://www.pbs.gov.pk/wp-content/uploads/census_tables/tables/table_1_punjab_districts.pdf
  and the same file name for `sindh`, `kp` and `balochistan`, plus
  `table_1_islamabad.pdf`;
- districts by division: `table_1_punjab_province.pdf` and the same for the
  other three provinces.

The rows are extracted to `data/sources/census-2023-admin-units.csv`. The
totals match the census report's Table 1.1: **30 divisions, 136 districts and
591 tehsil-level units** (Punjab 146, Sindh 138, Khyber Pakhtunkhwa 148,
Balochistan 158, Islamabad 1).

- **Tehsil-level units** are what the census counts: 306 tehsils, 107
  talukas (Sindh), 134 sub-divisions (Karachi, the merged districts of Khyber
  Pakhtunkhwa and much of Balochistan), 43 sub-tehsils (Balochistan) and one
  de-excluded area (Rajanpur). Each entry has a `type`.
- **Census district.** Every tehsil has a `censusDistrict`: the district it
  was in at the census. The census had 136 districts; `districts.json` has
  the 177 of today. Three census districts have since been split and are no
  longer district names: Quetta, Dera Bugti and South Waziristan.
- **Current district.** `currentDistrict` is the same as `censusDistrict`
  for the 119 census districts that have not lost territory to a new
  district. For tehsils of the 17 that have (Rawalpindi, Chakwal,
  Gujranwala, Muzaffargarh, Dera Ghazi Khan, South Waziristan, Upper Dir,
  Batagram, Dera Ismail Khan, Swat, Lasbela, Jaffarabad, Quetta, Dera Bugti,
  Pishin, Kech and Khuzdar) it is set only where an official
  source confirms where the tehsil is now, and is `null` otherwise.
  - **Confirmed (Punjab, all 25 tehsils of the five parent districts):**
    Murree and Kotli Sattian are in Murree district; Talagang and Lawa in
    Talagang; Wazirabad in Wazirabad; Kot Addu and Chowk Sarwar Shaheed in
    Kot Addu; Taunsa and Koh-e-Suleman in Taunsa; the others stay in
    Rawalpindi, Chakwal, Gujranwala, Muzaffargarh and Dera Ghazi Khan.
    Source: the Board of Revenue's list of tehsils by district as on 31
    December 2023, in the Punjab Bureau of Statistics' Statistical Pocket
    Book 2025
    (https://bos.punjab.gov.pk/system/files/Statistical%20Pocket%20Book%202025%20Final.pdf,
    retrieved 2026-11-16). That list also has tehsils created since the
    census (Vehova, Alipur Chatha and others), which are not in this data.
  - **Not confirmed, so `null` (78 tehsils):** the tehsils of Swat, Upper
    Dir, Batagram, Dera Ismail Khan and South Waziristan (Khyber
    Pakhtunkhwa) and of Quetta, Dera Bugti, Pishin, Kech, Khuzdar, Lasbela
    and Jaffarabad (Balochistan). No official list of tehsils by district
    for today's districts could be read for either province.
- **Divisions** are the census's 30. Divisions created since (Gujrat in
  Punjab, listed on punjab.gov.pk) are not included, and districts created
  since the census have no division here.
- **Not covered:** Azad Jammu and Kashmir (3 divisions, 10 districts, 32
  tehsils per "AJK at a Glance 2023") and Gilgit-Baltistan. The census tables
  have no rows for them, and no official list of their tehsils was found.
- **Spelling** is the census's, in title case, with district names changed
  to ours ("UMER KOT" → Umerkot, "KAMBAR SHAHDAD KOT" → Qambar Shahdadkot,
  "TORGHAR" → Tor Ghar).
- **Repaired by hand.** The letters "LLA" are missing from four names in the
  district tables' text (the PDF prints them, but they do not come out of
  it). They are restored in `data/sources/census-2023-admin-units.csv`:

  | Census text    | Restored to     | Evidence                                                 |
  | -------------- | --------------- | -------------------------------------------------------- |
  | `AI`           | Allai           | Allai tehsil of Batagram; KP Development Statistics 2026 |
  | `KAR KAHAR`    | Kallar Kahar    | Punjab Board of Revenue tehsil list ("Kalar Kahar")      |
  | `KAR SAYADDAN` | Kallar Sayaddan | Punjab Board of Revenue tehsil list ("Kallar Syedan")    |
  | `TANDO AHYAR`  | Tando Allahyar  | The census's own province table prints "TANDO ALLAHYAR"  |
