<!-- datasets: district-population tehsil-population -->

## Population (`district-population.json`, `tehsil-population.json`)

Population, households and the urban/rural split from the 7th Population and
Housing Census 2023 (Pakistan Bureau of Statistics), from PBS's detailed
results in Excel (https://www.pbs.gov.pk/result-excel/, published 25 August
2025, retrieved 2026-11-23):

- **Population, urban and rural:** Table 1, "Area, population by sex, sex
  ratio, population density, urban proportion, household size and annual
  growth rate", the "all sexes" figure on each unit's total, urban and rural
  rows (`table_1_<province>_districts.xlsx`).
- **Households:** Table 20, "Type of housing unit by region", the households
  column on the "all localities" row (`table_20_<province>_districts.xlsx`).
  Its national total, 38,292,556, is the census report's headline count.
  PBS does not define the column further.

The figures were checked three ways: every district's urban and rural
figures add up to its total; each district's tehsils add up to the
district; and the districts of each province add up to PBS's provincial
totals (Punjab 127,688,922, Sindh 55,696,147, Khyber Pakhtunkhwa
40,856,097, Balochistan 14,894,402, Islamabad 2,363,863). All 136 census
districts also match PBS's PDF edition of Table 1.

How districts are linked:

- **133 districts** match a census district. Names were matched by letter
  case and spacing, plus these aliases: Kolai-Palas (Kolai Palas Kohistan),
  Tor Ghar (Torghar), Sheerani (Sherani), Qambar Shahdadkot (Kambar Shahdad
  Kot), Malakand (Malakand District).
- **20 districts created after the census** have `null` figures. Each names
  the census district its area was part of (`censusDistrict`), from the
  district notes above; the figures are not estimated or split.
- **14 districts that lost area** to a new district (Rawalpindi, Chakwal,
  Gujranwala, Muzaffargarh, Dera Ghazi Khan, Swat, Upper Dir, Batagram,
  Dera Ismail Khan, Lasbela, Jaffarabad, Pishin, Kech and Khuzdar) keep the
  census figures for their census boundary, with `boundaryChanged: true`.
  For today's boundary, add up the tehsils with `getTehsilPopulation`.
- **Gilgit-Baltistan and Azad Jammu and Kashmir** (24 districts) were not
  enumerated by this census, so their figures are `null`.

Errors in PBS's files, corrected:

- Table 1 drops the letters "ALL" from some names in both the Excel and PDF
  editions ("TANDO AHYAR", "AI", "KAR KAHAR", "KAR SAYADDAN"); the names come
  from Table 20, whose rows are in the same order.
- Topi tehsil's rural figure in the Excel edition repeats its total; the PDF
  edition's 307,695 is used.
- The Panjgur sub-tehsil this dataset (and Table 1) calls "Kag" is printed
  "KALLAG" in Table 20, at the same position and with the same household
  size; the name is kept as in Table 1 and is unverified.
