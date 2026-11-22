<!-- datasets: networks -->
## Mobile networks (`networks.json`)

`03XX` prefixes and the operator each was originally allocated to. PTA has no
current operator-by-prefix table. Its National Numbering Plan 2008 paper
(https://www.pta.gov.pk/assets/media/nnp_08_final.pdf, retrieved 2026-11-16)
gives the two-digit allocations: 30 Mobilink (Jazz), 31 Paktel (now Zong), 32
Warid (now Jazz), 33 Ufone, 34 Telenor, 35 SCO, 36 Instaphone, and 37 to 39
"for future use". Individual prefixes are cross-checked with Google
libphonenumber and operator announcements.

- `0329` (Jazz) and `0355` (SCO) included.
- `0370`–`0371` (Zong) included, from libphonenumber only. **Unverified:**
  two searches in November 2026 (PTA's annual reports for 2021 to 2024, its
  numbering documents and licensee list, the ITU page for Pakistan and
  zong.com.pk) found no official document that gives 037x to an operator. `0372`–`0379` are **not**
  included, as no allocation or use was found.
- `0364` (Instaphone, licence cancelled in 2008) is not included.
- `034x` is labelled Telenor, the original allocation. Telenor Pakistan was
  merged into PTML (Ufone) in July 2026: PTCL announced the "successful
  completion of the amalgamation" on 2 July 2026
  (https://ptcl.com.pk/Home/PressReleaseDetail/?ItemId=934&linkId=130,
  retrieved 2026-11-16). The label is kept because the dataset records the
  operator a prefix was allocated to, no new brand has been announced
  officially (PTCL still writes "Ufone 5G"), and PTA's own pages still list
  Telenor Pakistan. With number portability, the current operator can differ
  for any prefix.
