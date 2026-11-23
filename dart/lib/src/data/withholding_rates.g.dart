// GENERATED — do not edit; run node scripts/generate-dart-data.mjs

/// Contents of `data/withholding-rates.json`.
const List<Object?> withholdingRatesJson = <Object?>[
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '231AB',
    'subType': 'cash-withdrawal',
    'description':
        'cash withdrawal by a person whose name is not appearing in the active taxpayers\' list',
    'atl': <String, Object?>{
      'rate': null,
      'exempt': true,
    },
    'nonAtl': <String, Object?>{
      'rule': 'fixed',
      'rate': 0.6,
      'law': 'Section 231AB; Tenth Schedule R.10(ga) excludes it from R.1',
    },
    'threshold': <String, Object?>{
      'amount': 50000,
      'per': 'day',
      'aggregate': true,
      'law':
          'Section 231AB: on the sum total of the payments for cash withdrawal in a day exceeding fifty thousand rupees (aggregate of the day)',
    },
    'cardRef': 'TY2025 PDF (scanned) p.10; docx T1 R75',
    'lawRef': 'Section 231AB of Income Tax Ordinance, 2001',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
    'note': 'Collected only from persons not on the Active Taxpayers List.',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '236C',
    'subType': 'sale',
    'description': 'Transfer of Immovable Property',
    'atl': <String, Object?>{
      'slabs': <Object?>[
        <String, Object?>{
          'over': 0,
          'upTo': 50000000,
          'rate': 3,
        },
        <String, Object?>{
          'over': 50000000,
          'upTo': 100000000,
          'rate': 3.5,
        },
        <String, Object?>{
          'over': 100000000,
          'upTo': null,
          'rate': 4,
        },
      ]
    },
    'nonAtl': <String, Object?>{
      'rule': 'fixed',
      'rate': 10,
      'law': 'Tenth Schedule R.1, table',
    },
    'lateFiler': <String, Object?>{
      'slabs': <Object?>[
        <String, Object?>{
          'over': 0,
          'upTo': 50000000,
          'rate': 6,
        },
        <String, Object?>{
          'over': 50000000,
          'upTo': 100000000,
          'rate': 7,
        },
        <String, Object?>{
          'over': 100000000,
          'upTo': null,
          'rate': 8,
        },
      ]
    },
    'cardRef':
        'TY2025 PDF (scanned) p.19; docx T1 R148; TY2025 PDF (scanned) p.19; docx T1 R149; TY2025 PDF (scanned) p.19-20; docx T1 R150',
    'lawRef':
        'Division X of Part IV of the First Schedule read with Rules 1 and 1A of 10th Sch.',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '236K',
    'subType': 'purchase',
    'description': 'Advance Tax on purchase of immovable property',
    'atl': <String, Object?>{
      'slabs': <Object?>[
        <String, Object?>{
          'over': 0,
          'upTo': 50000000,
          'rate': 3,
        },
        <String, Object?>{
          'over': 50000000,
          'upTo': 100000000,
          'rate': 3.5,
        },
        <String, Object?>{
          'over': 100000000,
          'upTo': null,
          'rate': 4,
        },
      ]
    },
    'nonAtl': <String, Object?>{
      'rule': 'slabs',
      'slabs': <Object?>[
        <String, Object?>{
          'over': 0,
          'upTo': 50000000,
          'rate': 12,
        },
        <String, Object?>{
          'over': 50000000,
          'upTo': 100000000,
          'rate': 16,
        },
        <String, Object?>{
          'over': 100000000,
          'upTo': null,
          'rate': 20,
        },
      ],
      'law': 'Tenth Schedule R.1, second proviso',
    },
    'lateFiler': <String, Object?>{
      'slabs': <Object?>[
        <String, Object?>{
          'over': 0,
          'upTo': 50000000,
          'rate': 6,
        },
        <String, Object?>{
          'over': 50000000,
          'upTo': 100000000,
          'rate': 7,
        },
        <String, Object?>{
          'over': 100000000,
          'upTo': null,
          'rate': 8,
        },
      ]
    },
    'cardRef':
        'TY2025 PDF (scanned) p.21; docx T1 R159; TY2025 PDF (scanned) p.21; docx T1 R160; TY2025 PDF (scanned) p.21; docx T1 R161',
    'lawRef':
        'Division X of Part IV of the First Schedule read with Rules 1 and 1A of 10th Sch. (as printed on card)',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
    'note':
        'The card cites Division X of Part IV; the statute is Division XVIII.',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '151',
    'subType': 'bank-deposit',
    'description':
        'Profit on debt falling under clause (a), (b), (c), or (d) of sub-section (1)',
    'atl': <String, Object?>{'rate': 15},
    'nonAtl': <String, Object?>{
      'rule': 'fixed',
      'rate': 35,
      'law': 'Tenth Schedule R.1, table: section 151, 35%',
    },
    'cardRef': 'TY2025 PDF (scanned) p.4; docx T1 R26',
    'lawRef':
        'Division-IA, Part-III of First Schedule Read with R.1 of 10th Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
    'note':
        'Tax year 2025 has one rate for clauses (a) to (d) of section 151(1).',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '151',
    'subType': 'government-securities',
    'description':
        'Profit on debt falling under clause (a), (b), (c), or (d) of sub-section (1)',
    'atl': <String, Object?>{'rate': 15},
    'nonAtl': <String, Object?>{
      'rule': 'fixed',
      'rate': 35,
      'law': 'Tenth Schedule R.1, table: section 151, 35%',
    },
    'cardRef': 'TY2025 PDF (scanned) p.4; docx T1 R26',
    'lawRef':
        'Division-IA, Part-III of First Schedule Read with R.1 of 10th Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
    'note':
        'Tax year 2025 has one rate for clauses (a) to (d) of section 151(1).',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '151',
    'subType': 'other',
    'description':
        'Profit on debt falling under clause (a), (b), (c), or (d) of sub-section (1)',
    'atl': <String, Object?>{'rate': 15},
    'nonAtl': <String, Object?>{
      'rule': 'fixed',
      'rate': 35,
      'law': 'Tenth Schedule R.1, table: section 151, 35%',
    },
    'cardRef': 'TY2025 PDF (scanned) p.4; docx T1 R26',
    'lawRef':
        'Division-IA, Part-III of First Schedule Read with R.1 of 10th Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
    'note':
        'Tax year 2025 has one rate for clauses (a) to (d) of section 151(1).',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '151',
    'subType': 'sukuk-company',
    'description': 'Company',
    'atl': <String, Object?>{'rate': 25},
    'nonAtl': <String, Object?>{
      'rule': 'fixed',
      'rate': 35,
      'law': 'Tenth Schedule R.1, table: section 151, 35%',
    },
    'cardRef': 'TY2025 PDF (scanned) p.4; docx T1 R27',
    'lawRef':
        'Division-IB, Part-III of First Schedule, Read with R.1 of 10th Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '151',
    'subType': 'sukuk-individual-above-1m',
    'description': 'Individual, AOP return above 1 Million',
    'atl': <String, Object?>{'rate': 12.5},
    'nonAtl': <String, Object?>{
      'rule': 'fixed',
      'rate': 35,
      'law': 'Tenth Schedule R.1, table: section 151, 35%',
    },
    'cardRef': 'TY2025 PDF (scanned) p.4; docx T1 R28',
    'lawRef':
        'Division-IB, Part-III of First Schedule, Read with R.1 of 10th Schedule',
    'returnBand': <String, Object?>{'over': 1000000},
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '151',
    'subType': 'sukuk-individual-below-1m',
    'description': 'Individual, AOP return below 1 Million',
    'atl': <String, Object?>{'rate': 10},
    'nonAtl': <String, Object?>{
      'rule': 'fixed',
      'rate': 35,
      'law': 'Tenth Schedule R.1, table: section 151, 35%',
    },
    'cardRef': 'TY2025 PDF (scanned) p.4; docx T1 R29',
    'lawRef':
        'Division-IB, Part-III of First Schedule, Read with R.1 of 10th Schedule',
    'returnBand': <String, Object?>{'under': 1000000},
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '150',
    'subType': 'ipp',
    'description':
        '(a) Paid by Independent Power Purchasers (IPPs) where such dividend is pass through item',
    'atl': <String, Object?>{'rate': 7.5},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 15,
    },
    'cardRef': 'TY2025 PDF (scanned) p.3; docx T1 R20',
    'lawRef':
        'Division-I, Part-III of First Schedule Read with R.1 of 10th Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '150',
    'subType': 'other',
    'description':
        '(b) mutual funds, Real Estate Investment Trust (REIT) and cases other than (a), (c) and (d)',
    'atl': <String, Object?>{'rate': 15},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 30,
    },
    'cardRef': 'TY2025 PDF (scanned) p.3; docx T1 R21',
    'lawRef':
        'Division-I, Part-III of First Schedule Read with R.1 of 10th Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '150',
    'subType': 'mutual-fund-mostly-debt',
    'description':
        '(c) mutual funds deriving fifty percent or more income from profit on debt',
    'atl': <String, Object?>{'rate': 25},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 50,
    },
    'cardRef': 'TY2025 PDF (scanned) p.3; docx T1 R22',
    'lawRef':
        'Division-I, Part-III of First Schedule Read with R.1 of 10th Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
    'note': 'A proviso to clause (b) in the statute; the card letters it (c).',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '150',
    'subType': 'reit-from-spv',
    'description':
        '(d) Dividend received by a REIT scheme from Special Purpose Vehicle',
    'atl': <String, Object?>{'rate': 0},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 0,
    },
    'cardRef': 'TY2025 PDF (scanned) p.3; docx T1 R23',
    'lawRef':
        'Division-I, Part-III of First Schedule Read with R.1 of 10th Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '150',
    'subType': 'others-from-spv',
    'description':
        '(e) Dividend received by others from Special Purpose Vehicle as defined under the Real Estate Investment Trust Regulations, 2015',
    'atl': <String, Object?>{'rate': 35},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 70,
    },
    'cardRef': 'TY2025 PDF (scanned) p.3; docx T1 R24',
    'lawRef':
        'Division-I, Part-III of First Schedule Read with R.1 of 10th Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '150',
    'subType': 'exempt-company',
    'description':
        '(f) A company where no tax is payable by such company, due to exemption of income or carry forward of business losses under Part VIII Chapter III or claim of tax credits under Part X of Chapter III.',
    'atl': <String, Object?>{'rate': 25},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 50,
    },
    'cardRef': 'TY2025 PDF (scanned) p.4; docx T1 R25',
    'lawRef':
        'Division-I, Part-III of First Schedule Read with R.1 of 10th Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '153',
    'subType': 'rice-cotton-seed-edible-oil',
    'description': 'in case of sale of rice, cotton seed or edible oils',
    'atl': <String, Object?>{'rate': 1.5},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 3,
    },
    'cardRef': 'TY2025 PDF (scanned) p.7; docx T1 R48',
    'lawRef':
        'Division III of Part III of the First Schedule Read with R.1 of 10th Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '153',
    'subType': 'goods-toll-company',
    'description': 'in case of sale of goods (toll manufacturing): Company',
    'atl': <String, Object?>{'rate': 9},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 18,
    },
    'cardRef': 'TY2025 PDF (scanned) p.7; docx T1 R49',
    'lawRef':
        'Division III of Part III of the First Schedule Read with R.1 of 10th Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '153',
    'subType': 'goods-company',
    'description':
        'in case of sale of goods (other than toll manufacturing): Company',
    'atl': <String, Object?>{'rate': 5},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 10,
    },
    'cardRef': 'TY2025 PDF (scanned) p.7; docx T1 R50',
    'lawRef':
        'Division III of Part III of the First Schedule Read with R.1 of 10th Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '153',
    'subType': 'goods-toll-other',
    'description':
        'in case of sale of goods (toll manufacturing): Any other case',
    'atl': <String, Object?>{'rate': 11},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 22,
    },
    'cardRef': 'TY2025 PDF (scanned) p.8; docx T1 R51',
    'lawRef':
        'Division III of Part III of the First Schedule Read with R.1 of 10th Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '153',
    'subType': 'goods-other',
    'description':
        'in case of sale of goods (other than toll manufacturing): Any other case',
    'atl': <String, Object?>{'rate': 5.5},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 11,
    },
    'cardRef': 'TY2025 PDF (scanned) p.8; docx T1 R52',
    'lawRef':
        'Division III of Part III of the First Schedule Read with R.1 of 10th Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '153',
    'subType': 'certain-services',
    'description': 'in case of certain services.',
    'atl': <String, Object?>{'rate': 4},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 8,
    },
    'cardRef': 'TY2025 PDF (scanned) p.8; docx T1 R53',
    'lawRef':
        'Division III of Part III of the First Schedule Read with R.1 of 10th Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '153',
    'subType': 'other-services-company',
    'description': 'for services other than mentioned above: Company',
    'atl': <String, Object?>{'rate': 9},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 18,
    },
    'cardRef': 'TY2025 PDF (scanned) p.8; docx T1 R54',
    'lawRef':
        'Division III of Part III of the First Schedule Read with R.1 of 10th Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '153',
    'subType': 'other-services-other',
    'description': 'for services other than mentioned above: In any other case',
    'atl': <String, Object?>{'rate': 11},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 22,
    },
    'cardRef': 'TY2025 PDF (scanned) p.8; docx T1 R55',
    'lawRef':
        'Division III of Part III of the First Schedule Read with R.1 of 10th Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '153',
    'subType': 'media',
    'description':
        'In respect of persons making payments to electronic and print media for advertising services',
    'atl': <String, Object?>{'rate': 1.5},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 3,
    },
    'cardRef': 'TY2025 PDF (scanned) p.8; docx T1 R56',
    'lawRef':
        'Division III of Part III of the First Schedule Read with R.1 of 10th Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '153',
    'subType': 'sportsperson',
    'description': 'In case of sportsperson',
    'atl': <String, Object?>{'rate': 10},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 20,
    },
    'cardRef': 'TY2025 PDF (scanned) p.8; docx T1 R57',
    'lawRef':
        'Division III of Part III of the First Schedule Read with R.1 of 10th Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '153',
    'subType': 'contract-company',
    'description': 'Company',
    'atl': <String, Object?>{'rate': 7.5},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 15,
    },
    'cardRef': 'TY2025 PDF (scanned) p.8; docx T1 R58',
    'lawRef':
        'Division III of Part III of the First Schedule Read with R.1 of 10th Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '153',
    'subType': 'contract-other',
    'description': 'Any other case',
    'atl': <String, Object?>{'rate': 8},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 16,
    },
    'cardRef': 'TY2025 PDF (scanned) p.9; docx T1 R59',
    'lawRef':
        'Division III of Part III of the First Schedule Read with R.1 of 10th Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '153',
    'subType': 'exporter-services',
    'description':
        'Services to exporters or export houses (section 153(2)); the card gives no description',
    'atl': <String, Object?>{'rate': 1},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 2,
    },
    'cardRef': 'TY2025 PDF (scanned) p.9; docx T1 R60',
    'lawRef':
        'Division III of Part III of the First Schedule Read with R.1 of 10th Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
  },
  <String, Object?>{
    'taxYear': 2025,
    'from': '2024-07-01',
    'to': '2025-06-30',
    'section': '149',
    'subType': 'salary',
    'description':
        'Salary: the salaried rate table of the tax year (calculateSalaryTax)',
    'atl': <String, Object?>{'salarySlabs': 'income-tax-slabs'},
    'nonAtl': <String, Object?>{
      'rule': 'not-applicable',
      'rate': null,
      'law': 'Tenth Schedule R.10(a) excludes section 149',
    },
    'cardRef':
        'TY2025 PDF (scanned) p.2; docx T1 R12/14; TY2025 PDF (scanned) p.2; docx T1 R12/15; TY2025 PDF (scanned) p.2; docx T1 R12/16; TY2025 PDF (scanned) p.2; docx T1 R12/17; TY2025 PDF (scanned) p.2; docx T1 R12/18; TY2025 PDF (scanned) p.2; docx T1 R12/19',
    'lawRef':
        'Division-I, Part-I of First Schedule Read with R.10(a) of 10th Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20248211184455183WithholdingTaxRegimeRatesCard2024.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '231AB',
    'subType': 'cash-withdrawal',
    'description':
        'Cash withdrawal by a person whose name is not appearing in the Active Taxpayers\' List',
    'atl': <String, Object?>{
      'rate': null,
      'exempt': true,
    },
    'nonAtl': <String, Object?>{
      'rule': 'fixed',
      'rate': 0.8,
      'law': 'Section 231AB; Tenth Schedule R.10(ga) excludes it from R.1',
    },
    'threshold': <String, Object?>{
      'amount': 50000,
      'per': 'day',
      'aggregate': true,
      'law':
          'Section 231AB: on the sum total of the payments for cash withdrawal in a day exceeding fifty thousand rupees (aggregate of the day)',
    },
    'cardRef': 'TY2026 PDF p.8; xlsx row No.81',
    'lawRef': 'Section 231AB',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
    'note': 'Collected only from persons not on the Active Taxpayers List.',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '236C',
    'subType': 'sale',
    'description': 'Transfer of Immovable Property',
    'atl': <String, Object?>{
      'slabs': <Object?>[
        <String, Object?>{
          'over': 0,
          'upTo': 50000000,
          'rate': 4.5,
        },
        <String, Object?>{
          'over': 50000000,
          'upTo': 100000000,
          'rate': 5,
        },
        <String, Object?>{
          'over': 100000000,
          'upTo': null,
          'rate': 5.5,
        },
      ]
    },
    'nonAtl': <String, Object?>{
      'rule': 'fixed',
      'rate': 11.5,
      'law': 'Tenth Schedule R.1, table',
    },
    'lateFiler': <String, Object?>{
      'slabs': <Object?>[
        <String, Object?>{
          'over': 0,
          'upTo': 50000000,
          'rate': 7.5,
        },
        <String, Object?>{
          'over': 50000000,
          'upTo': 100000000,
          'rate': 8.5,
        },
        <String, Object?>{
          'over': 100000000,
          'upTo': null,
          'rate': 9.5,
        },
      ]
    },
    'cardRef':
        'TY2026 PDF p.12; xlsx row No.135; TY2026 PDF p.13; xlsx row No.136; TY2026 PDF p.13; xlsx row No.137',
    'lawRef':
        'Division-X of Part-IV of First Schedule read with R.1 and R.1A of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '236K',
    'subType': 'purchase',
    'description': 'Purchase of Immovable Property',
    'atl': <String, Object?>{
      'slabs': <Object?>[
        <String, Object?>{
          'over': 0,
          'upTo': 50000000,
          'rate': 1.5,
        },
        <String, Object?>{
          'over': 50000000,
          'upTo': 100000000,
          'rate': 2,
        },
        <String, Object?>{
          'over': 100000000,
          'upTo': null,
          'rate': 2.5,
        },
      ]
    },
    'nonAtl': <String, Object?>{
      'rule': 'slabs',
      'slabs': <Object?>[
        <String, Object?>{
          'over': 0,
          'upTo': 50000000,
          'rate': 10.5,
        },
        <String, Object?>{
          'over': 50000000,
          'upTo': 100000000,
          'rate': 14.5,
        },
        <String, Object?>{
          'over': 100000000,
          'upTo': null,
          'rate': 18.5,
        },
      ],
      'law': 'Tenth Schedule R.1, proviso',
    },
    'lateFiler': <String, Object?>{
      'slabs': <Object?>[
        <String, Object?>{
          'over': 0,
          'upTo': 50000000,
          'rate': 4.5,
        },
        <String, Object?>{
          'over': 50000000,
          'upTo': 100000000,
          'rate': 5.5,
        },
        <String, Object?>{
          'over': 100000000,
          'upTo': null,
          'rate': 6.5,
        },
      ]
    },
    'cardRef':
        'TY2026 PDF p.13; xlsx row No.145; TY2026 PDF p.13; xlsx row No.146; TY2026 PDF p.13; xlsx row No.147',
    'lawRef':
        'Division-XVIII of Part-IV of First Schedule read with R.1 and R.1A of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '151',
    'subType': 'bank-deposit',
    'description':
        'On yield or profit paid by a banking company or financial institution on an account or deposit maintained with such company or institution',
    'atl': <String, Object?>{'rate': 20},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 40,
    },
    'cardRef': 'TY2026 PDF p.3; xlsx row No.28',
    'lawRef':
        'Division-IA, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '151',
    'subType': 'government-securities',
    'description':
        'On yield or profit on Government securities under clause (c) of sub-section (1) of section 151 paid to any person other than an individual',
    'atl': <String, Object?>{'rate': 20},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 40,
    },
    'cardRef': 'TY2026 PDF p.3; xlsx row No.29',
    'lawRef':
        'Division-IA, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
    'note': 'Paid to a person other than an individual.',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '151',
    'subType': 'other',
    'description':
        'On yield or profit in cases other than mentioned in clauses (a) and (b) of Division-IA, Part-III of First Schedule',
    'atl': <String, Object?>{'rate': 15},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 30,
    },
    'cardRef': 'TY2026 PDF p.3; xlsx row No.30',
    'lawRef':
        'Division-IA, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '151',
    'subType': 'sukuk-company',
    'description': 'When sukuk-holder is a company',
    'atl': <String, Object?>{'rate': 25},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 50,
    },
    'cardRef': 'TY2026 PDF p.3; xlsx row No.31',
    'lawRef':
        'Division-IB, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '151',
    'subType': 'sukuk-individual-above-1m',
    'description':
        'When sukuk-holder is an individual or AOP with return on investment greater than Rs. 1 million',
    'atl': <String, Object?>{'rate': 12.5},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 25,
    },
    'cardRef': 'TY2026 PDF p.3; xlsx row No.32',
    'lawRef':
        'Division-IB, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'returnBand': <String, Object?>{'over': 1000000},
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '151',
    'subType': 'sukuk-individual-below-1m',
    'description':
        'When sukuk-holder is an individual or AOP with return on investment less than Rs. 1 million',
    'atl': <String, Object?>{'rate': 10},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 20,
    },
    'cardRef': 'TY2026 PDF p.3; xlsx row No.33',
    'lawRef':
        'Division-IB, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'returnBand': <String, Object?>{'under': 1000000},
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '150',
    'subType': 'ipp',
    'description': 'Paid by Independent Power Purchasers (IPPs)',
    'atl': <String, Object?>{'rate': 7.5},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 15,
    },
    'cardRef': 'TY2026 PDF p.2; xlsx row No.21',
    'lawRef':
        'Division-I, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '150',
    'subType': 'other',
    'description':
        'Real Estate Investment Trust (REIT) and cases other than those mentioned in clauses (a), (ba), (c) and (d) of Division-I, Part-III of First Schedule',
    'atl': <String, Object?>{'rate': 15},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 30,
    },
    'cardRef': 'TY2026 PDF p.2; xlsx row No.22',
    'lawRef':
        'Division-I, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '150',
    'subType': 'mutual-fund-debt-part',
    'description':
        'Mutual funds, contingent upon proportional income derived from average annual investment in debt securities and equities respectively',
    'atl': <String, Object?>{'rate': 25},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 50,
    },
    'cardRef': 'TY2026 PDF p.3; xlsx row No.23',
    'lawRef':
        'Division-I, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
    'note':
        'Clause (ba): 25% on the part of the dividend matching the fund\'s income from profit on debt, 15% on the rest. Not for a company recipient: use mutual-fund-debt-part-company (29%).',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '150',
    'subType': 'mutual-fund-debt-part-company',
    'description':
        'Mutual funds, clause (ba): the part of the dividend derived from debt securities, received by a company',
    'atl': <String, Object?>{'rate': 29},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 58,
    },
    'cardRef': 'TY2026 PDF p.3; xlsx row No.23',
    'lawRef':
        'Division-I, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
    'statuteOverride':
        'Not on the card. Clause (ba), proviso, Division I, Part III of the First Schedule (inserted by the Finance Act 2025): where a corporate entity receives the dividend, the component derived from debt securities is taxed at 29%. Non-ATL doubled under Tenth Schedule R.1 (section 150 is not excluded by R.10).',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '150',
    'subType': 'mutual-fund-other-part',
    'description':
        'Mutual funds, contingent upon proportional income derived from average annual investment in debt securities and equities respectively',
    'atl': <String, Object?>{'rate': 15},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 30,
    },
    'cardRef': 'TY2026 PDF p.3; xlsx row No.23',
    'lawRef':
        'Division-I, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
    'note':
        'Clause (ba): the part of the dividend not matching income from profit on debt.',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '150',
    'subType': 'reit-from-spv',
    'description':
        'Dividend received by a REIT scheme from Special Purpose Vehicle',
    'atl': <String, Object?>{'rate': 0},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 0,
    },
    'cardRef': 'TY2026 PDF p.3; xlsx row No.25',
    'lawRef':
        'Division-I, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '150',
    'subType': 'others-from-spv',
    'description':
        'Dividend received by others from Special Purpose Vehicle as defined under the Real Estate Investment Trust Regulations, 2015',
    'atl': <String, Object?>{'rate': 35},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 70,
    },
    'cardRef': 'TY2026 PDF p.3; xlsx row No.26',
    'lawRef':
        'Division-I, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '150',
    'subType': 'exempt-company',
    'description':
        'A company where no tax is payable by such company due to exemption of income or carry forward of business losses under Part VIII, Chapter III or claim of tax credits under Part X of Chapter III',
    'atl': <String, Object?>{'rate': 25},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 50,
    },
    'cardRef': 'TY2026 PDF p.3; xlsx row No.27',
    'lawRef':
        'Division-I, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '153',
    'subType': 'rice-cotton-seed-edible-oil',
    'description': 'In case of sale of rice, cotton seed or edible oils',
    'atl': <String, Object?>{'rate': 1.5},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 3,
    },
    'cardRef': 'TY2026 PDF p.5; xlsx row No.54',
    'lawRef':
        'Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '153',
    'subType': 'goods-toll-company',
    'description': 'For companies in cases of toll manufacturing',
    'atl': <String, Object?>{'rate': 9},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 18,
    },
    'cardRef': 'TY2026 PDF p.5; xlsx row No.55',
    'lawRef':
        'Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '153',
    'subType': 'goods-company',
    'description': 'For companies other than cases of toll manufacturing',
    'atl': <String, Object?>{'rate': 5},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 10,
    },
    'cardRef': 'TY2026 PDF p.6; xlsx row No.56',
    'lawRef':
        'Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '153',
    'subType': 'goods-toll-other',
    'description': 'In cases other than companies, for toll manufacturing',
    'atl': <String, Object?>{'rate': 11},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 22,
    },
    'cardRef': 'TY2026 PDF p.6; xlsx row No.57',
    'lawRef':
        'Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '153',
    'subType': 'goods-other',
    'description':
        'In cases other than companies, other than toll manufacturing',
    'atl': <String, Object?>{'rate': 5.5},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 11,
    },
    'cardRef': 'TY2026 PDF p.6; xlsx row No.58',
    'lawRef':
        'Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '153',
    'subType': 'certain-services',
    'description': 'In case of certain services',
    'atl': <String, Object?>{'rate': 6},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 12,
    },
    'cardRef': 'TY2026 PDF p.6; xlsx row No.59',
    'lawRef':
        'Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '153',
    'subType': 'it-services',
    'description':
        'In case of IT & IT enabled services as defined in section 2',
    'atl': <String, Object?>{'rate': 4},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 8,
    },
    'cardRef': 'TY2026 PDF p.6; xlsx row No.60',
    'lawRef':
        'Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '153',
    'subType': 'other-services',
    'description':
        'For services other than mentioned in sub-para (i) of para (2) of Division-III of Part-III of First Schedule',
    'atl': <String, Object?>{'rate': 15},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 30,
    },
    'cardRef': 'TY2026 PDF p.6; xlsx row No.61',
    'lawRef':
        'Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '153',
    'subType': 'media',
    'description':
        'In respect of persons making payments to electronic and print media for advertising services',
    'atl': <String, Object?>{'rate': 1.5},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 3,
    },
    'cardRef': 'TY2026 PDF p.6; xlsx row No.62',
    'lawRef':
        'Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '153',
    'subType': 'sportsperson',
    'description': 'In case of sportspersons',
    'atl': <String, Object?>{'rate': 15},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 30,
    },
    'cardRef': 'TY2026 PDF p.6; xlsx row No.63',
    'lawRef':
        'Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '153',
    'subType': 'contract-company',
    'description': 'Company',
    'atl': <String, Object?>{'rate': 7.5},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 15,
    },
    'cardRef': 'TY2026 PDF p.6; xlsx row No.64',
    'lawRef':
        'Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '153',
    'subType': 'contract-other',
    'description': 'Any other case',
    'atl': <String, Object?>{'rate': 8},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 16,
    },
    'cardRef': 'TY2026 PDF p.6; xlsx row No.65',
    'lawRef':
        'Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '153',
    'subType': 'exporter-services',
    'description':
        'For rendering of or providing certain services to exporters or export houses',
    'atl': <String, Object?>{'rate': 1},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 2,
    },
    'cardRef': 'TY2026 PDF p.6; xlsx row No.66',
    'lawRef':
        'Division-IV of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '153',
    'subType': 'ecommerce-digital',
    'description':
        'Through digital means or banking channels by payment intermediary',
    'atl': <String, Object?>{'rate': 1},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 2,
    },
    'cardRef': 'TY2026 PDF p.6; xlsx row No.67',
    'lawRef':
        'Section 153(2A); Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '153',
    'subType': 'ecommerce-cod',
    'description': 'Cash on delivery by courier service',
    'atl': <String, Object?>{'rate': 2},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 4,
    },
    'cardRef': 'TY2026 PDF p.7; xlsx row No.68',
    'lawRef':
        'Section 153(2A); Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2026,
    'from': '2025-07-01',
    'to': '2026-06-30',
    'section': '149',
    'subType': 'salary',
    'description':
        'Salary: the salaried rate table of the tax year (calculateSalaryTax)',
    'atl': <String, Object?>{'salarySlabs': 'income-tax-slabs'},
    'nonAtl': <String, Object?>{
      'rule': 'not-applicable',
      'rate': null,
      'law': 'Tenth Schedule R.10(a) excludes section 149',
    },
    'cardRef': 'TY2026 PDF p.1; xlsx row No.11',
    'lawRef':
        'Division-I, Part-I of First Schedule read with R.10(a) of Tenth Schedule',
    'card':
        'http://download1.fbr.gov.pk/Docs/20258181281745641WHT-RateCard.pdf',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '231AB',
    'subType': 'cash-withdrawal',
    'description':
        'Cash withdrawal by a person whose name is not appearing in the Active Taxpayers\' List',
    'atl': <String, Object?>{
      'rate': null,
      'exempt': true,
    },
    'nonAtl': <String, Object?>{
      'rule': 'fixed',
      'rate': 0.8,
      'law': 'Section 231AB; Tenth Schedule R.10(ga) excludes it from R.1',
    },
    'threshold': <String, Object?>{
      'amount': 50000,
      'per': 'day',
      'aggregate': true,
      'law':
          'Section 231AB: on the sum total of the payments for cash withdrawal in a day exceeding fifty thousand rupees (aggregate of the day)',
    },
    'cardRef': 'TY2027 PDF p.10; xlsx row No.89',
    'lawRef': 'Section 231AB',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
    'note': 'Collected only from persons not on the Active Taxpayers List.',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '236C',
    'subType': 'sale',
    'description': 'Transfer of Immovable Property',
    'atl': <String, Object?>{'rate': 2.75},
    'nonAtl': <String, Object?>{
      'rule': 'fixed',
      'rate': 11.5,
      'law': 'Tenth Schedule R.1, table',
    },
    'cardRef':
        'TY2027 PDF p.16; xlsx row No.143; TY2027 PDF p.16; xlsx row No.144; TY2027 PDF p.16; xlsx row No.145',
    'lawRef':
        'Division-X of Part-IV of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
    'note':
        'Finance Act 2026 replaced the value slabs with one rate and omitted the late-filer rule R.1A.',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '236K',
    'subType': 'purchase',
    'description': 'Purchase of Immovable Property',
    'atl': <String, Object?>{'rate': 1.25},
    'nonAtl': <String, Object?>{
      'rule': 'slabs',
      'slabs': <Object?>[
        <String, Object?>{
          'over': 0,
          'upTo': 50000000,
          'rate': 10.5,
        },
        <String, Object?>{
          'over': 50000000,
          'upTo': 100000000,
          'rate': 14.5,
        },
        <String, Object?>{
          'over': 100000000,
          'upTo': null,
          'rate': 18.5,
        },
      ],
      'law': 'Tenth Schedule R.1, proviso',
    },
    'cardRef':
        'TY2027 PDF p.17; xlsx row No.150; TY2027 PDF p.17; xlsx row No.151; TY2027 PDF p.17; xlsx row No.152',
    'lawRef':
        'Division-XVIII of Part-IV of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '151',
    'subType': 'bank-deposit',
    'description':
        'On yield or profit paid by a banking company or financial institution on an account or deposit maintained with such company or institution',
    'atl': <String, Object?>{'rate': 20},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 40,
    },
    'cardRef': 'TY2027 PDF p.4; xlsx row No.29',
    'lawRef':
        'Division-IA, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '151',
    'subType': 'government-securities',
    'description':
        'On yield or profit on Government securities under clause (c) of sub-section (1) of section 151 paid to any person other than an individual',
    'atl': <String, Object?>{'rate': 20},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 40,
    },
    'cardRef': 'TY2027 PDF p.4; xlsx row No.30',
    'lawRef':
        'Division-IA, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
    'note': 'Paid to a person other than an individual.',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '151',
    'subType': 'other',
    'description':
        'On yield or profit in cases other than mentioned in clauses (a) and (b) of Division-IA, Part-III of First Schedule',
    'atl': <String, Object?>{'rate': 15},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 30,
    },
    'cardRef': 'TY2027 PDF p.4; xlsx row No.31',
    'lawRef':
        'Division-IA, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '151',
    'subType': 'sukuk-company',
    'description': 'When sukuk-holder is a company',
    'atl': <String, Object?>{'rate': 25},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 50,
    },
    'cardRef': 'TY2027 PDF p.4; xlsx row No.32',
    'lawRef':
        'Division-IB, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '151',
    'subType': 'sukuk-individual-above-1m',
    'description':
        'When sukuk-holder is an individual or AOP with return on investment greater than Rs. 1 million',
    'atl': <String, Object?>{'rate': 12.5},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 25,
    },
    'cardRef': 'TY2027 PDF p.4; xlsx row No.33',
    'lawRef':
        'Division-IB, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'returnBand': <String, Object?>{'over': 1000000},
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '151',
    'subType': 'sukuk-individual-below-1m',
    'description':
        'When sukuk-holder is an individual or AOP with return on investment less than Rs. 1 million',
    'atl': <String, Object?>{'rate': 10},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 20,
    },
    'cardRef': 'TY2027 PDF p.4; xlsx row No.34',
    'lawRef':
        'Division-IB, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'returnBand': <String, Object?>{'under': 1000000},
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '150',
    'subType': 'ipp',
    'description': 'Paid by Independent Power Purchasers (IPPs)',
    'atl': <String, Object?>{'rate': 7.5},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 15,
    },
    'cardRef': 'TY2027 PDF p.3; xlsx row No.22',
    'lawRef':
        'Division-I, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '150',
    'subType': 'other',
    'description':
        'Real Estate Investment Trust (REIT) and cases other than those mentioned in clauses (a), (ba), (c) and (d) of Division-I, Part-III of First Schedule',
    'atl': <String, Object?>{'rate': 15},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 30,
    },
    'cardRef': 'TY2027 PDF p.3; xlsx row No.23',
    'lawRef':
        'Division-I, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '150',
    'subType': 'mutual-fund-debt-part',
    'description':
        'Mutual funds, contingent upon proportional income derived from average annual investment in debt securities and equities respectively',
    'atl': <String, Object?>{'rate': 25},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 50,
    },
    'cardRef': 'TY2027 PDF p.3; xlsx row No.24',
    'lawRef':
        'Division-I, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
    'note':
        'Clause (ba): 25% on the part of the dividend matching the fund\'s income from profit on debt, 15% on the rest. Not for a company recipient: use mutual-fund-debt-part-company (29%).',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '150',
    'subType': 'mutual-fund-debt-part-company',
    'description':
        'Mutual funds, clause (ba): the part of the dividend derived from debt securities, received by a company',
    'atl': <String, Object?>{'rate': 29},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 58,
    },
    'cardRef': 'TY2027 PDF p.3; xlsx row No.24',
    'lawRef':
        'Division-I, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
    'statuteOverride':
        'Not on the card. Clause (ba), proviso, Division I, Part III of the First Schedule (inserted by the Finance Act 2025): where a corporate entity receives the dividend, the component derived from debt securities is taxed at 29%. Non-ATL doubled under Tenth Schedule R.1 (section 150 is not excluded by R.10).',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '150',
    'subType': 'mutual-fund-other-part',
    'description':
        'Mutual funds, contingent upon proportional income derived from average annual investment in debt securities and equities respectively',
    'atl': <String, Object?>{'rate': 15},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 30,
    },
    'cardRef': 'TY2027 PDF p.3; xlsx row No.24',
    'lawRef':
        'Division-I, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
    'note':
        'Clause (ba): the part of the dividend not matching income from profit on debt.',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '150',
    'subType': 'reit-from-spv',
    'description':
        'Dividend received by a REIT scheme from Special Purpose Vehicle',
    'atl': <String, Object?>{'rate': 0},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 0,
    },
    'cardRef': 'TY2027 PDF p.3; xlsx row No.26',
    'lawRef':
        'Division-I, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '150',
    'subType': 'others-from-spv',
    'description':
        'Dividend received by others from Special Purpose Vehicle as defined under the Real Estate Investment Trust Regulations, 2015',
    'atl': <String, Object?>{'rate': 35},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 70,
    },
    'cardRef': 'TY2027 PDF p.3; xlsx row No.27',
    'lawRef':
        'Division-I, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '150',
    'subType': 'exempt-company',
    'description':
        'A company where no tax is payable by such company due to exemption of income or carry forward of business losses under Part VIII, Chapter III or claim of tax credits under Part X of Chapter III',
    'atl': <String, Object?>{'rate': 25},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 50,
    },
    'cardRef': 'TY2027 PDF p.3; xlsx row No.28',
    'lawRef':
        'Division-I, Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '153',
    'subType': 'rice-cotton-seed-edible-oil',
    'description': 'In case of sale of rice, cotton seed or edible oils',
    'atl': <String, Object?>{'rate': 1.5},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 3,
    },
    'cardRef': 'TY2027 PDF p.7; xlsx row No.59',
    'lawRef':
        'Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '153',
    'subType': 'goods-toll-company',
    'description': 'For companies in cases of toll manufacturing',
    'atl': <String, Object?>{'rate': 9},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 18,
    },
    'cardRef': 'TY2027 PDF p.7; xlsx row No.60',
    'lawRef':
        'Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '153',
    'subType': 'goods-company',
    'description': 'For companies other than cases of toll manufacturing',
    'atl': <String, Object?>{'rate': 5},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 10,
    },
    'cardRef': 'TY2027 PDF p.7; xlsx row No.61',
    'lawRef':
        'Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '153',
    'subType': 'goods-toll-other',
    'description': 'In cases other than companies, for toll manufacturing',
    'atl': <String, Object?>{'rate': 11},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 22,
    },
    'cardRef': 'TY2027 PDF p.7; xlsx row No.62',
    'lawRef':
        'Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '153',
    'subType': 'goods-other',
    'description':
        'In cases other than companies, other than toll manufacturing',
    'atl': <String, Object?>{'rate': 5.5},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 11,
    },
    'cardRef': 'TY2027 PDF p.7; xlsx row No.63',
    'lawRef':
        'Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '153',
    'subType': 'certain-services',
    'description': 'In case of certain services',
    'atl': <String, Object?>{'rate': 7},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 14,
    },
    'cardRef': 'TY2027 PDF p.7; xlsx row No.64',
    'lawRef':
        'Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
    'circular': <String, Object?>{
      'reference':
          'FBR Circular No. 02 of 2026-27 (Income Tax), C. No. 1(50)S(ITP)/2026, 8 September 2026, paragraph 22',
      'url':
          'https://download1.fbr.gov.pk/Docs/202698139527880CircularNo.2of2026-27.pdf',
    },
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '153',
    'subType': 'it-services',
    'description':
        'In case of IT & IT enabled services as defined in section 2',
    'atl': <String, Object?>{'rate': 4},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 8,
    },
    'cardRef': 'TY2027 PDF p.8; xlsx row No.65',
    'lawRef':
        'Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '153',
    'subType': 'professional-services',
    'description':
        'In the case of independent professional services such as doctors, lawyers, architects, accountants, software engineers or developers, working independently',
    'atl': <String, Object?>{'rate': 15},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 30,
    },
    'cardRef': 'TY2027 PDF p.8; xlsx row No.66',
    'lawRef':
        'Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
    'circular': <String, Object?>{
      'reference':
          'FBR Circular No. 02 of 2026-27 (Income Tax), C. No. 1(50)S(ITP)/2026, 8 September 2026, paragraph 22',
      'url':
          'https://download1.fbr.gov.pk/Docs/202698139527880CircularNo.2of2026-27.pdf',
    },
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '153',
    'subType': 'port-terminal-company',
    'description':
        'companies for rendering or providing terminal and port operating services',
    'atl': <String, Object?>{'rate': 12},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 24,
    },
    'cardRef': 'TY2027 PDF p.8; xlsx row No.68',
    'lawRef':
        'Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
    'circular': <String, Object?>{
      'reference':
          'FBR Circular No. 02 of 2026-27 (Income Tax), C. No. 1(50)S(ITP)/2026, 8 September 2026, paragraph 22',
      'url':
          'https://download1.fbr.gov.pk/Docs/202698139527880CircularNo.2of2026-27.pdf',
    },
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '153',
    'subType': 'other-services',
    'description':
        'For services other than mentioned in sub-para (i)(ii)(iii) & (iv) of para (2) of Division-III of Part-III of First Schedule',
    'atl': <String, Object?>{'rate': 14},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 28,
    },
    'cardRef': 'TY2027 PDF p.8; xlsx row No.69',
    'lawRef':
        'Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
    'circular': <String, Object?>{
      'reference':
          'FBR Circular No. 02 of 2026-27 (Income Tax), C. No. 1(50)S(ITP)/2026, 8 September 2026, paragraph 22',
      'url':
          'https://download1.fbr.gov.pk/Docs/202698139527880CircularNo.2of2026-27.pdf',
    },
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '153',
    'subType': 'media',
    'description':
        'In respect of persons making payments to electronic and print media for advertising services',
    'atl': <String, Object?>{'rate': 1.5},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 3,
    },
    'cardRef': 'TY2027 PDF p.8; xlsx row No.67',
    'lawRef':
        'Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '153',
    'subType': 'sportsperson',
    'description': 'In case of sportspersons',
    'atl': <String, Object?>{'rate': 15},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 30,
    },
    'cardRef': 'TY2027 PDF p.8; xlsx row No.70',
    'lawRef':
        'Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '153',
    'subType': 'contract-company',
    'description': 'Company',
    'atl': <String, Object?>{'rate': 7.5},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 15,
    },
    'cardRef': 'TY2027 PDF p.8; xlsx row No.71',
    'lawRef':
        'Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '153',
    'subType': 'contract-other',
    'description': 'Any other case',
    'atl': <String, Object?>{'rate': 8},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 16,
    },
    'cardRef': 'TY2027 PDF p.9; xlsx row No.72',
    'lawRef':
        'Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '153',
    'subType': 'exporter-services',
    'description':
        'For rendering of or providing certain services to exporters or export houses',
    'atl': <String, Object?>{'rate': 1.25},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 2.5,
    },
    'cardRef': 'TY2027 PDF p.9; xlsx row No.73',
    'lawRef':
        'Division-IV of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
    'statuteOverride':
        'The card shows 1% (non-ATL 2%). The Finance Act 2026 as enacted (Gazette of Pakistan, Extraordinary, Part I, 26 June 2026, pp. 583-584), s. 5(44)(b)(v)(B), substitutes 1.25% for 1% in paragraph (3) of Division IV, Part III of the First Schedule (s. 6(44)(b)(v)(B) in the Finance Bill); the card says the Ordinance prevails.',
    'circular': <String, Object?>{
      'reference':
          'FBR Circular No. 02 of 2026-27 (Income Tax), C. No. 1(50)S(ITP)/2026, 8 September 2026, paragraph 30',
      'url':
          'https://download1.fbr.gov.pk/Docs/202698139527880CircularNo.2of2026-27.pdf',
    },
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '153',
    'subType': 'ecommerce-digital',
    'description':
        'Through digital means or banking channels by payment intermediary',
    'atl': <String, Object?>{'rate': 1},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 2,
    },
    'cardRef': 'TY2027 PDF p.9; xlsx row No.74',
    'lawRef':
        'Section 153(2A); Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '153',
    'subType': 'ecommerce-cod',
    'description': 'Cash on delivery by courier service',
    'atl': <String, Object?>{'rate': 2},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 4,
    },
    'cardRef': 'TY2027 PDF p.9; xlsx row No.75',
    'lawRef':
        'Section 153(2A); Division-III of Part-III of First Schedule read with R.1 of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '154B',
    'subType': 'social-media',
    'description':
        'Revenues received from social media platforms by digital content creators/social media influencers',
    'atl': <String, Object?>{'rate': 5},
    'nonAtl': <String, Object?>{
      'rule': 'double',
      'rate': 10,
    },
    'cardRef': 'TY2027 PDF p.9; xlsx row No.80',
    'lawRef':
        'Division IIIAB of Part III of the First Schedule read with R.1 of Tenth Schedule',
    'taxNature': <String, Object?>{
      'resident': 'minimum',
      'nonResident': 'final',
    },
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
    'note':
        'Section 154B(3): minimum tax for a resident person; final tax for a non-resident person without a permanent establishment in Pakistan. The rate is the same; Tenth Schedule R.1 applies to persons not on the ATL either way (154B is not excluded by R.10).',
  },
  <String, Object?>{
    'taxYear': 2027,
    'from': '2026-07-01',
    'to': '2027-06-30',
    'section': '149',
    'subType': 'salary',
    'description':
        'Salary: the salaried rate table of the tax year (calculateSalaryTax)',
    'atl': <String, Object?>{'salarySlabs': 'income-tax-slabs'},
    'nonAtl': <String, Object?>{
      'rule': 'not-applicable',
      'rate': null,
      'law': 'Tenth Schedule R.10(a) excludes section 149',
    },
    'cardRef': 'TY2027 PDF p.1; xlsx row No.11',
    'lawRef':
        'Division-I, Part-I of First Schedule read with R.10(a) of Tenth Schedule',
    'card':
        'https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf',
  },
];
