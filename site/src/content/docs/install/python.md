---
title: Install for Python
description: Install pakdatakit from PyPI for Python 3.9 and later.
---

```bash
pip install pakdatakit
```

Python 3.9 or later, no dependencies. The functions use snake_case (`validate_cnic`), options are keyword arguments, and results are small dataclasses.

```python
from pakdatakit import validate_cnic, calculate_salary_tax

validate_cnic("35202-1234567-1")  # True
calculate_salary_tax(5_000_000, tax_year=2027).tax  # 802000
```

Package: [PyPI](https://pypi.org/project/pakdatakit/) · Same results as every other port, checked on 32,000+ shared test vectors.
