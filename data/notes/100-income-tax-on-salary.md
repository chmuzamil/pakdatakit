<!-- datasets: income-tax-slabs -->

## Income tax on salary (`income-tax-slabs.json`)

The salaried rate table for each tax year: Division I of Part I of the First
Schedule to the Income Tax Ordinance 2001, clause (2), which applies where
salary is more than 75% of taxable income. Edited directly. Each year was
read from FBR's own consolidated Ordinance for that year, and checked against
the next year's consolidation, whose footnote quotes the table it replaced.
Every band's fixed amount equals the previous band's fixed amount plus its
rate on its width (the tests check this). All documents retrieved 2026-11-18.

| Tax year       | Law                                             | Source                                                                                                   |
| -------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 2020 (2019-20) | Finance Act 2019                                | https://download1.fbr.gov.pk/Docs/20199191692232848IncomeTaxOrdinance,2001amendedupto30-06-2019.pdf      |
| 2021 (2020-21) | Finance Act 2019, unchanged by Finance Act 2020 | https://download1.fbr.gov.pk/Docs/202011414113915861I.T.OrdinanceAmendedupto(30-06-2020).pdf             |
| 2022 (2021-22) | Finance Act 2019, unchanged by Finance Act 2021 | https://download1.fbr.gov.pk/Docs/20217141672549772IncomeTaxOrdinanceAmendedupto30.06.2021.pdf           |
| 2023 (2022-23) | Finance Act 2022                                | https://download1.fbr.gov.pk/Docs/202412215123222278IncomeTaxOrdinanceAmendedupto30.06.2022.pdf          |
| 2024 (2023-24) | Finance Act 2023                                | https://download1.fbr.gov.pk/Docs/202412215122448762IncomeTaxOrdinance,2001Amendedupto30.06.2023.pdf     |
| 2025 (2024-25) | Finance Act 2024                                | https://download1.fbr.gov.pk/Docs/2024751675120641IncomeTaxOrdinance,2001-amended-upto30.06.2024.pdf     |
| 2026 (2025-26) | Finance Act 2025                                | https://download1.fbr.gov.pk/Docs/2025881983148210Income-Tax-Ordinance,-2001-Amended-upto-31.07.2025.pdf |
| 2027 (2026-27) | Finance Act 2026                                | Finance Act 2026 (primary) and two further sources, listed below                                         |

Tax year 2027 has three sources, all retrieved 2026-11-18:

1. **Primary: the Finance Act, 2026**, Gazette of Pakistan (Extraordinary),
   Part I, 26 June 2026
   (https://download1.fbr.gov.pk/Docs/20266291261044366FinanceAct2026.pdf).
   - Section 5(44)(a)(i) substitutes the table in clause (2) of Division I,
     Part I, First Schedule (Gazette page 580). Its eight bands, fixed
     amounts and rates match `income-tax-slabs.json` exactly.
   - Section 1(2) brings the Act into force on 1 July 2026, the first day of
     tax year 2027.
   - Section 5(2)(b) replaces the 9% salaried surcharge in the proviso to
     section 4AB with "no surcharge shall be payable".
   - This is the URL in the dataset's `source` field for 2027.
2. **FBR's explanation: Circular No. 02 of 2026-27 (Income Tax)**, C. No.
   1(50)S(ITP)/2026, 8 September 2026
   (https://download1.fbr.gov.pk/Docs/202698139527880CircularNo.2of2026-27.pdf).
   - Paragraph 7 restates the same table.
   - Paragraph 8 confirms that the 9% surcharge on salaried individuals is
     withdrawn, while the 10% surcharge on other individuals and associations
     of persons continues.
   - The circular does not name a tax year, which is why the commencement
     comes from the Act.
3. **FBR's consolidated Ordinance**
   (https://download1.fbr.gov.pk/Docs/2026724177725705IncomeTaxOrdinanace2001.pdf).
   It prints the same table, with a footnote quoting the 2026 table it
   replaced.

How sure we are, and what is left out:

- **Verified** from FBR's consolidated Ordinance for each year. For 2027 the
  table was also checked against the Finance Act, 2026 as gazetted and FBR
  Circular No. 02 of 2026-27. For earlier years the Finance Act texts
  (Gazette) were not read; FBR's consolidations are the source.
- **Not applied** (out of scope): tax credits, exemptions, the separate
  rate for pension from a former employer (2026 onwards: 0% up to Rs 10
  million, 5% above), super tax under section 4C, and withholding
  adjustments. The section 4AB surcharge is applied on request; see below.
- Tax is rounded half up to the paisa; the Ordinance's own rounding to whole
  rupees is left to the caller.

### Surcharge under section 4AB (`surcharge` in `income-tax-slabs.json`)

Since 2.7.0 each tax year carries the section 4AB surcharge, which
`calculateSalaryTax` adds with `includeSurcharge: true` (off by default in
2.x). The section's wording, the same in every version: a surcharge "at the
rate of ten percent of the income tax imposed under Division I of Part I of
the First Schedule where the taxable income exceeds rupees ten million". It
is a percentage of the whole tax from the rate table, not of the tax on the
income above Rs 10 million, so one rupee over the threshold adds it in full
(there is no marginal relief in the section). All documents retrieved
2026-11-22.

| Tax year  | Salaried rate | Law                                                                                                                                                                                                                                                             | Source                                                                                                   |
| --------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 2020–2024 | none          | Section 4AB did not exist (it is absent from FBR's consolidated Ordinance amended up to 30.06.2023)                                                                                                                                                             | https://download1.fbr.gov.pk/Docs/202412215122448762IncomeTaxOrdinance,2001Amendedupto30.06.2023.pdf     |
| 2025      | 10%           | Finance Act 2024, s. 8(2), Gazette of Pakistan (Extraordinary), 30 June 2024, p. 279: inserts section 4AB; in force 1 July 2024 (s. 1(2))                                                                                                                       | https://download1.fbr.gov.pk/Docs/2024630146346801FinanceAct-2024.pdf                                    |
| 2026      | 9%            | Finance Act 2025: adds the proviso "in case of an individual deriving income chargeable under the head Salary, a surcharge shall be payable at the rate of nine percent", per FBR's consolidated Ordinance amended up to 31.07.2025 (footnote 5 to section 4AB) | https://download1.fbr.gov.pk/Docs/2025881983148210Income-Tax-Ordinance,-2001-Amended-upto-31.07.2025.pdf |
| 2027      | none          | Finance Act 2026, s. 5(2)(b): the proviso now reads "no surcharge shall be payable"                                                                                                                                                                             | https://download1.fbr.gov.pk/Docs/20266291261044366FinanceAct2026.pdf                                    |

Supporting FBR documents:

- **Circular No. 01 of 2025-26 (Income Tax)**, C. No. 4(32) IT-Budget/2025,
  2 August 2025, page 3: the employer collects the "surcharge, if applicable
  under the provision of section 4AB, at the rate of 9%"
  (https://download1.fbr.gov.pk/Docs/2025841183918948CircularNo01of2025-26IncomeTax.pdf).
- **Circular No. 02 of 2026-27 (Income Tax)**, 8 September 2026, paragraph
  8: the nine percent surcharge on salaried individuals is withdrawn, and the
  ten percent surcharge on other individuals and associations of persons
  continues (https://download1.fbr.gov.pk/Docs/202698139527880CircularNo.2of2026-27.pdf).
- **FBR's consolidated Ordinance (2026)** prints section 4AB with the 2026
  proviso and footnotes for each amendment
  (https://download1.fbr.gov.pk/Docs/2026724177725705IncomeTaxOrdinanace2001.pdf).

How sure we are:

- **Verified** from the section's text in each consolidation and, for 2025
  and 2027, from the Finance Act as gazetted. The Finance Act 2025 itself
  was not read: FBR's budget pages returned HTTP 403 on 2026-11-22. The 9%
  rate for 2026 rests on FBR's consolidation and Circular No. 01 of 2025-26.
- **Only salaried individuals are covered**, because only the salaried rate
  table is: the 10% rate for other individuals and associations of persons
  is not applied.
- The surcharge is rounded half up to the paisa, like the tax.
