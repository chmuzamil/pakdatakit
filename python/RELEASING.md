# Releasing the Python package

The Python package `pakdatakit` is published to PyPI by
`.github/workflows/release-python.yml` when a tag like `python-v2.2.0` is
pushed. It uses [PyPI trusted publishing](https://docs.pypi.org/trusted-publishers/),
so no API token is stored. See the repository's [RELEASING.md](../RELEASING.md)
for the release order across all packages.

## Before tagging

- The version in `pyproject.toml` and `src/pakdatakit/__init__.py` matches the
  npm `pakdatakit` version being released.
- If data changed, `src/pakdatakit/data_version.py` matches `src/data-version.ts`.
- Regenerate and commit the shared test vectors and data copies:

  ```bash
  npm run build
  node scripts/generate-test-vectors.mjs
  ```

  CI and the release workflow fail if `test-vectors/` or
  `python/src/pakdatakit/data/` differ from what this produces.

## What the workflow does

1. Checks the tag matches `pyproject.toml`.
2. Rebuilds the TypeScript library, regenerates the vectors and data, and fails
   if they differ from the committed files.
3. Runs the tests on Python 3.9 and 3.13.
4. Builds the wheel and sdist with `uv build` and publishes them to PyPI.
5. Creates a GitHub release.

## One-time setup

On [pypi.org](https://pypi.org) → **Your account** → **Publishing** → **Add a
new pending publisher** → **GitHub**:

- PyPI project name: `pakdatakit`
- Owner: `chmuzamil`
- Repository name: `pakdatakit`
- Workflow name: `release-python.yml`
- Environment name: `pypi`

## Testing locally

```bash
cd python
uv run --python 3.9 --with pytest pytest -q
uv run --python 3.13 --with pytest pytest -q
uv build
```
