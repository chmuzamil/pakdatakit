<!-- datasets: zakat-nisab -->

## Zakat nisab (`zakat-nisab.json`)

The nisab for compulsory Zakat deduction at source from savings, profit and
loss sharing and similar accounts (asset code 101), for each Zakat year from
1433 AH (2012) to 1447 AH (2026). Each record comes from two documents,
retrieved 2026-11-23:

- the Ministry of Poverty Alleviation & Social Safety's notification of the
  nisab fixed by the Administrator-General Zakat, which states it in
  figures and in words (they agree in every year); and
- the SBP BPRD circular letter that sends it to banks, with SBP's bank
  holiday circular for the deduction day where there is one.

SBP's www site blocks automated downloads, so the files were read from
SBP's own mirror, `archive.sbp.org.pk`, at the same paths. The scanned
notifications (2012-2024) were read from the page images.

| Zakat year | Notification label | Nisab (Rs) | Notification                                | SBP circular letter         |
| ---------- | ------------------ | ---------: | ------------------------------------------- | --------------------------- |
| 1433       | 1432-33            |     51,086 | CE-1001(36)/NISAB/1432-33/2012, 18 Jul 2012 | No. 18 of 2012, 19 Jul 2012 |
| 1434       | 1433-34            |     41,872 | CE3 1001(36)/NISAB/1433-34/2013, 5 Jul 2013 | No. 17 of 2013, 9 Jul 2013  |
| 1435       | 1434-35            |     38,810 | .../1434-35/2014/3494, 26 Jun 2014          | No. 20 of 2014, 26 Jun 2014 |
| 1436       | 1435-36            |     33,641 | .../1435-36/2015/, 16 Jun 2015              | No. 14 of 2015, 16 Jun 2015 |
| 1437       | 1436-37            |     35,557 | .../1436-37/2016, 3 Jun 2016                | No. 18 of 2016, 3 Jun 2016  |
| 1438       | 1437-38            |     38,406 | .../1437-38/2017, 24 May 2017               | No. 15 of 2017, 24 May 2017 |
| 1439       | 1438-39            |     39,198 | .../1438-39/2018/304, 14 May 2018           | No. 06 of 2018, 14 May 2018 |
| 1440       | 1439-40            |     44,415 | .../1439-40/2019/226, 3 May 2019            | No. 09 of 2019, 3 May 2019  |
| 1441       | 1440-41            |     46,329 | .../1440-41/2020, 20 Apr 2020               | No. 19 of 2020, 20 Apr 2020 |
| 1442       | 1441-42            |     80,933 | .../1441-42/2021/83, 8 Apr 2021             | No. 09 of 2021, 12 Apr 2021 |
| 1443       | 1442-43            |     88,927 | .../1442-43/2022, 30 Mar 2022               | No. 07 of 2022, 30 Mar 2022 |
| 1444       | 1443-44            |    103,159 | .../1443-44/2023-140, 17 Mar 2023           | No. 02 of 2023, 17 Mar 2023 |
| 1445       | 1444-45            |    135,179 | .../1444-45/2024/612, 6 Mar 2024            | No. 03 of 2024, 7 Mar 2024  |
| 1446       | 1445-46            |    179,689 | .../1445-46/2025-76, 26 Feb 2025            | No. 04 of 2025, 27 Feb 2025 |
| 1447       | 1446-47            |    503,529 | .../1446-47/2026-48, 16 Feb 2026            | No. 03 of 2026, 17 Feb 2026 |

**Rules** (Zakat and Ushr Ordinance 1980 and the Zakat (Collection and
Refund) Rules 1981, from pakistancode.gov.pk and pass.gov.pk):

- **Rate:** 2.5% of the balance at the start of the valuation date (First
  Schedule, S. No. 1).
- **Accounts:** the nisab applies to savings and similar accounts (asset
  code 101). Current accounts and foreign currency accounts are not subject
  to compulsory deduction (Second Schedule, S. No. 4).
- **Exemption:** a holder who files the declaration on Form CZ-50 at least
  30 days before the valuation date is not deducted (s. 1(3), proviso (a);
  rule 20).

**Conventions and limits:**

- `zakatYear` is the Hijri year of the valuation date, 1 Ramazan (`1447` is
  February 2026); the notification calls the same deduction "1446-47"
  (`label`). The Ordinance says a Zakat year starts on 1 Ramazan, which
  would name it 1447-48.
- **Boundary:** the notifications say no deduction where the balance is
  "less than" the nisab (2026: deduction on "Rs. 503,529/- or above"), so a
  balance equal to the nisab is deducted. The Ordinance's wording ("does
  not exceed") would not deduct it. The library follows the notifications.
- **Dates:** each notification says 1 Ramazan is "likely to fall on" one of
  two days. The confirmed day depends on the moon sighting, which is outside
  these sources, so a date on the first of the two days gives no Zakat year.
  `bankHolidayDate` is set where SBP's bank holiday circular names a
  Gregorian date (5 years).
- **Not covered:** years before 1433 AH (no nisab circular in SBP's indexes
  for 2005-2011) and any later amendment to the 1981 Rules or Form CZ-50
  (the Rules were read in their 1989 consolidation).
- Document quirks: the 1433 SBP circular prints the notification number as
  "CE-100(36)"; the 1442 notification, dated April 2021, prints the
  deduction month as "April, 2020".
