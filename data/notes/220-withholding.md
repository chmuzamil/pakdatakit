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

| Tax year | Card                                                                                                                                                                       | PDF date   | Also read                                                |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------- |
| 2027     | "Updated up to June 30, 2026 as per Finance Act, 2026" (https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf)                                  | 2026-08-11 | FBR's xlsx edition                                       |
| 2026     | "Updated up to June 30, 2025 as per Finance Act, 2025" (http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf)                                                | 2025-08-15 | FBR's xlsx edition                                       |
| 2025     | "Withholding Income Tax Regime (WHT Rates Card) ... updated up to June 30, 2024" (http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf) | 2024-08-21 | a scan; read from the page images and FBR's docx edition |

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

**Thresholds:** 231AB applies only when cash withdrawn in a day, all
withdrawals added up, exceeds Rs 50,000. That is in the section's text in
all three years, though no card shows it. 236C and 236K bands are by the
gross consideration or fair market value: up to Rs 50 million, up to Rs 100
million, and above.

Other notes: the 2025 card cites Division X for 236K, where the statute
has Division XVIII; the cards say "Independent Power Purchasers" where the
statute says "Producers"; clause (ba)'s 29% rate on the debt part of a
dividend received by a company is in the statute but not on the card, and
is not applied.

Not covered: every other section of the card (for example 152, 155, 156,
231B, 234, 235, 236, 236G, 236H, 236Y), exemptions, reduced-rate
certificates, and whether a deduction is adjustable, minimum or final.
