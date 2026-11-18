"""Fails unless every job that ci-pass needs succeeded.

RESULTS is ${{ toJSON(needs) }}. OPTIONAL is a space-separated list of job
ids that are conditional on purpose; only for those is "skipped" accepted.
"""
import json
import os
import sys

results = json.loads(os.environ["RESULTS"])
optional = set(os.environ.get("OPTIONAL", "").split())

bad = []
for job, info in sorted(results.items()):
    result = info.get("result")
    print(f"{job}: {result}")
    if result == "success" or (result == "skipped" and job in optional):
        continue
    bad.append(f"{job} ({result})")

if bad:
    print(f"::error::Not successful: {', '.join(bad)}")
    sys.exit(1)
print(f"All {len(results)} jobs succeeded")
