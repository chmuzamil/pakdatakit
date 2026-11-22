<!-- datasets: postal-codes post-offices -->
## Postal codes (`postal-codes.json`, `post-offices.json`)

Both files come from Pakistan Post's "Post Code Directory of Delivery Post
Offices" (Part I), a 45-page PDF dated February 2021
(https://www.pakpost.gov.pk/images/national%20post%20code%20directory.pdf,
retrieved 2026-11-16). Its office name, code, account office and province
columns are extracted to `data/sources/pakpost-delivery-post-offices.csv`
(2,564 rows), and `scripts/generate-data.mjs` builds both files from it.

- **`post-offices.json`** (2,560 entries, for `getPostOffice` and
  `searchPostOffices`): every office, as `code`, `office` (the directory's
  name in title case), `town`, `district` and `province`. The directory
  lists four codes twice, for the same place under two spellings (`22190`,
  `40520`, `56320`, `63050`); the first row is kept.
- **`postal-codes.json`** (457 entries, for `getCityByPostalCode`,
  `getPostalCode`, `getPostalCodes`, `getPostalAreas` and
  `searchPostalCodes`): only the offices that belong to a city in
  `cities.json`, as `city`, `postalCode`, `area` (the office name),
  `province`, and `district` and `primary` where they apply.
- **Which city an office belongs to.** The directory has no city column, so
  this is worked out:
  1. the 110 entries checked by hand before the import keep their city
     (including the eight codes corrected in November 2026);
  2. an office named after a city in `cities.json`, in the same province,
     belongs to that city ("ABBOTTABAD GPO" → Abbottabad);
  3. every office under the Karachi, Lahore and Islamabad account offices
     belongs to that city;
  4. an office whose name starts or ends with the city of its own account
     office belongs to that city ("GULISTAN COLONY, FAISALABAD").

  Any other office is in a town or village that is not on the city list. It
  is only in `post-offices.json`, where `town` is the office's own name
  ("Dulmial"); `getCityByPostalCode` returns `null` for it.

- **District** is given only where the town is the headquarters a district
  is named after (349 offices). An account office can serve several
  districts, so it is not used to guess one.
- **Province** is the directory's, with its spelling normalised ("Azad
  Kashmir" → Azad Jammu and Kashmir, "Federal Capital" → Islamabad Capital
  Territory, and the misprints "Punjba" and "SIndh").
- **Primary.** `getPostalCode(city)` returns the hand-checked code for the 95
  cities that had one. For 63 more cities it returns the code of the office
  named "<city> GPO", or else the office named after the city.
- **Names** are converted from the directory's capitals to title case; its
  spellings are kept, including misprints ("Islamabad Primr Minister
  Sectt.").
- **Not included:** the 740 or so non-delivery post offices of Part II
  (https://www.pakpost.gov.pk/images/LIST%20OF%20NON%20DELIVERY%20POs.pdf).
- The directory is dated 2021. Pakistan Post's web table
  (https://www.pakpost.gov.pk/postcodes.php) is missing many offices, so it
  is not the source; it was used for the spot-check below.
