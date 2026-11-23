## Couriers

No dataset: `mapCourierStatus` maps only the statuses a courier documents
publicly. All pages were retrieved on 2026-11-18.

- **PostEx**: "Merchant API Integration Guide", version M- v4.1.9 (undated):
  order status IDs 1 to 9 and 15 to 18 (§3.15) and tracking history codes
  0001 to 0008 and 0013 (§3.8). The guide is PostEx's own, but it is hosted
  on Amazon S3
  (https://merchant-api-guide.s3.ap-south-1.amazonaws.com/PostEx-COD_API_Integration_Guide_V4.1.9.pdf)
  and not linked from postex.pk. Its history codes 0002, 0006 and 0007 all
  read "Returned"; "Package on Root" is mapped as written and also as "on
  route".
- **Leopards**: only "Returned to Shipper", defined in its e-commerce FAQ
  (https://ecom.leopardscourier.com/faqs). Its API documentation site
  (https://merchantapi.leopardscourier.com) has no content.
- **TCS, M&P, Trax and BlueEx**: no public status list. Their API documents
  are behind merchant or developer logins, so nothing is mapped. Copies on
  third-party sites were not used.
- **Tracking numbers**: no courier documents a format, so there is no
  tracking-number detection. PostEx's guide only uses the placeholder
  `CX-XXXXXXXXXXX`.

`normalizeCityForCourier`'s short forms (`LHR`, `Khi`, `Pindi`, `ISB`, `FSD`,
the former name Lyallpur, Urdu names and so on) are common usage, not an
official list. Each maps to a city in `cities.json`.
