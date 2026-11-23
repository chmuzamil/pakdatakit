## Urdu alphabetical order (no dataset)

`compareUrdu` follows the Unicode CLDR collation tailoring for Urdu
(`common/collation/ur.xml`, "standard", CLDR release 49, unchanged since
2015), https://github.com/unicode-org/cldr/blob/release-49/common/collation/ur.xml,
retrieved 2026-11-18. Its own reference is the CRULP/PAN Localization paper
"Urdu Encoding and Collation Sequence". The government's National Language
Promotion Department (https://nlpd.gov.pk) does not publish a sort order
online, so CLDR is the order cited. The implementation was checked against
ICU's `ur` collator (Node.js, CLDR 48, identical rules) on 200,000 random
pairs of Urdu words.
