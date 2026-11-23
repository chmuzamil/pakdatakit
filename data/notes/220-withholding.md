<!-- datasets: withholding-rates -->

## Withholding tax rates (`withholding-rates.json`)

Rates for persons on and not on FBR's Active Taxpayers List (ATL), for
sections 149 (salary), 150 (dividends), 151 (profit on debt), 153 (goods,
services and contracts), 154B (social media income, from tax year 2027),
231AB (cash withdrawal), 236C (sale of immovable property) and 236K
(purchase of immovable property). One record per section, case and tax
year, each with the card's own references.

Sources, all from FBR's rate card page
(https://fbr.gov.pk/withholding-taxes-rate-card/174298/174301), retrieved
2026-11-23. The cards print no date; the dates are the PDFs' creation dates.

- **Tax year 2027:** "Updated up to June 30, 2026 as per Finance Act,
  2026", PDF dated 2026-08-11, also read in FBR's xlsx edition
  (https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf).
- **Tax year 2026:** "Updated up to June 30, 2025 as per Finance Act,
  2025", PDF dated 2025-08-15, also read in FBR's xlsx edition
  (http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf).
- **Tax year 2025:** "Withholding Income Tax Regime (WHT Rates Card) ...
  updated up to June 30, 2024", PDF dated 2024-08-21; a scan, read from the
  page images and FBR's docx edition
  (http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf).

Every row was then checked against FBR's consolidated Income Tax Ordinance
2001 for its year: amended up to 30.06.2024 (tax year 2025), 31.07.2025
(2026) and 30 June 2026 (2027), with the Finance Act 2026
(https://download1.fbr.gov.pk/Docs/20266291261044366FinanceAct2026.pdf).
Of 124 card rows, 121 match. The card says the Ordinance prevails, so:

- **153(2), services to exporters, tax year 2027:** the card shows 1%
  (non-ATL 2%), but Finance Act 2026, s. 5(44)(b)(v)(B), substitutes 1.25%
  in Division IV, para (3), Part III of the First Schedule. The dataset uses
  1.25% (non-ATL 2.5%) and says so in `statuteOverride`.
- **150, "mutual funds deriving fifty percent or more income from profit
  on debt", 25%, tax years 2026 and 2027:** Finance Act 2025 replaced
  clause (b) without that proviso and inserted clause (ba) ("25% and 15%"
  by the fund's income from profit on debt). The row is left out for 2026
  and 2027 and kept for 2025, when it applied.

- **150, clause (ba), a company receiving the dividend (2026, 2027):** the
  proviso taxes the part derived from debt securities at 29% (FBR's
  Ordinance amended up to 31.07.2025 and up to 30 June 2026). No card shows
  it. It is its own case, `mutual-fund-debt-part-company`, at 29% (58% for a
  company not on the ATL: Tenth Schedule R.1; section 150 is not excluded
  by R.10).

The 153(2) citation was checked against the enacted Finance Act 2026
(Gazette of Pakistan, Extraordinary, Part I, 26 June 2026, pp. 583-584),
where the Income Tax Ordinance amendments are section 5; the Finance Bill
numbered them section 6.

**The non-ATL rule is each case's own** (Tenth Schedule), not one
multiplier:

- **Doubled** (R.1, "increased by hundred percent"): 150, 151 (2026,
  2027), 153 and 154B.
- **A fixed rate** (R.1, table): 236C (10% in 2025, 11.5% in 2026 and 2027) and 151 (35% in 2025).
- **Its own value bands** (R.1, proviso): 236K (12/16/20% in 2025,
  10.5/14.5/18.5% in 2026 and 2027).
- **Only for persons not on the ATL:** 231AB (excluded from R.1 by
  R.10(ga)); 0.6% in 2025, 0.8% in 2026 and 2027.
- **None:** 149 (excluded by R.10(a)); the salaried rate table applies to
  everyone.
- **Late filers** (R.1A, 2025 and 2026 only; omitted by Finance Act 2026):
  236C and 236K have their own value bands.

**Thresholds (settled):** 231AB is on the day's aggregate cash
withdrawals. Once it exceeds Rs 50,000, the tax is on the whole sum; Rs
50,000 itself is not taxed. The threshold is in the section's text in all
three years, though no card shows it. 236C and 236K bands are chosen by the
whole gross consideration or fair market value, not applied in slices:
up to Rs 50 million, up to Rs 100 million, and above. Rs 50 million and Rs
100 million fall in the lower band (FBR's wording is "does not exceed").

**Rounding:** the tax is rounded to the nearest rupee, as section 219 of
the Ordinance requires for "any amount of tax or refund payable under this
Ordinance" (under 50 paisa dropped, 50 paisa or more counted as a rupee).
It is computed exactly and rounded once.

**Sukuk (151, individual or AOP):** the statute gives 12.5% where the
return on investment is "more than one million" and 10% where it is "less
than one million". A return of exactly Rs 1 million is in neither, so the
library returns no rate for it, and a case that does not fit the return
(`returnOnInvestment`, default the amount) is rejected.

**154B (settled):** 5% for persons on the ATL and 10% for persons not on
it, residents and non-residents alike (TY2027 card; Tenth Schedule R.10
does not exclude 154B). Section 154B(3) makes it a minimum tax for a
resident and a final tax for a non-resident without a permanent
establishment in Pakistan.

**FBR's explanation:** Circular No. 02 of 2026-27 (8 September 2026)
confirms the 2027 service rates (paragraph 22: 7%, 15%, 12% and 14%) and
the 1.25% export rate (paragraph 30); those records cite it in `circular`.

**153(2A):** the e-commerce cases name section 153(2A) in their law
reference.

Other notes: the 2025 card cites Division X for 236K, where the statute
has Division XVIII; the cards say "Independent Power Purchasers" where the
statute says "Producers"; clause (ba)'s 29% rate on the debt part of a
dividend received by a company is in the statute but not on the card, and
is not applied.

Not covered: every other section of the card (for example 152, 155, 156,
231B, 234, 235, 236, 236G, 236H, 236Y), exemptions, reduced-rate
certificates, and whether a deduction is adjustable, minimum or final.
