# Releasing

This repository publishes six packages, each from GitHub Actions when its
own tag is pushed. Nobody publishes from their own computer (except the very
first release of each new package, see below).

| Package                 | Registry     | Tag              | Workflow              | Version lives in        |
| ----------------------- | ------------ | ---------------- | --------------------- | ----------------------- |
| `pakdatakit`            | npm          | `v2.2.0`         | `release.yml`         | `package.json`          |
| `pakdatakit-react`      | npm          | `react-v0.1.0`   | `release-react.yml`   | `react/package.json`    |
| `pakdatakit` (Python)   | PyPI         | `python-v2.2.0`  | `release-python.yml`  | `python/pyproject.toml` |
| `pakdatakit-faker`      | npm          | `faker-v0.1.0`   | `release-faker.yml`   | `faker/package.json`    |
| `pakdatakit` (Dart)     | pub.dev      | `dart-v2.2.0`    | `release-dart.yml`    | `dart/pubspec.yaml`     |
| `pakdatakit_flutter`    | pub.dev      | `flutter-v0.1.0` | `release-flutter.yml` | `flutter/pubspec.yaml`  |
| API docs and `llms.txt` | GitHub Pages | `v2.2.0`         | `docs.yml`            | (built from the source) |

Each workflow checks that the tag matches the package's version, runs the
checks, publishes with provenance, and creates a GitHub release. If any step
fails, nothing is published.

## Release order

`pakdatakit-react` depends on `pakdatakit`, and the Python package must match
the TypeScript library, so release in this order:

1. `pakdatakit` (`v…`): also publishes the docs.
2. Python (`python-v…`), using the same version number as `pakdatakit`.
3. Dart (`dart-v…`), using the same version number as `pakdatakit`.
4. `pakdatakit-react` (`react-v…`) and `pakdatakit-faker` (`faker-v…`), once
   the `pakdatakit` version they need is on npm. Their workflows check this.
5. `pakdatakit_flutter` (`flutter-v…`), once the Dart `pakdatakit` version it
   needs is on pub.dev.

The Dart package is tested against the same shared test vectors as Python, and
its data is generated from `data/*.json` by `node scripts/generate-dart-data.mjs`
(CI fails if it is out of date).

## Release a new version

1. On a branch:
   - update `CHANGELOG.md` with a `## x.y.z` section;
   - set the version in `package.json` (`npm version x.y.z --no-git-tag-version`),
     and in `python/pyproject.toml` and `python/src/pakdatakit/__init__.py`;
   - if data changed, update `dataVersion` in `src/data-version.ts` and
     `python/src/pakdatakit/data_version.py`, and the date in `DATA.md`;
   - run `npm run build && node scripts/generate-test-vectors.mjs` and commit
     the updated `test-vectors/` and `python/src/pakdatakit/data/`.
2. Open a pull request, let CI pass, and merge it into `main`.
3. Tag the merge commit and push the tags, in the order above:

   ```bash
   git checkout main && git pull
   git tag vx.y.z && git push origin vx.y.z
   git tag python-vx.y.z && git push origin python-vx.y.z
   git tag react-va.b.c && git push origin react-va.b.c
   ```

## One-time setup

### npm: `pakdatakit` (done)

The trusted publisher on npmjs.com is `chmuzamil` / `pakdatakit` /
`release.yml` / environment `npm`.

### npm: `pakdatakit-react`

npm can only add a trusted publisher to a package that already exists, so:

1. Publish the first version by hand, approving with your passkey:

   ```bash
   cd react && npm ci && npm run build && npm publish --auth-type=web --access public
   ```

2. On npmjs.com, open `pakdatakit-react` → **Settings** → **Trusted
   Publisher** → **GitHub Actions**: `chmuzamil` / `pakdatakit` /
   `release-react.yml` / environment `npm`.

Later versions are then released by pushing a `react-v…` tag.

### npm: `pakdatakit-faker`

Same as `pakdatakit-react`: publish the first version by hand
(`cd faker && npm ci && npm run build && npm publish --auth-type=web --access public`),
then add the trusted publisher `chmuzamil` / `pakdatakit` / `release-faker.yml` /
environment `npm`.

### pub.dev: Dart `pakdatakit` and `pakdatakit_flutter`

pub.dev can only enable automated publishing for a package that exists, so:

1. Publish the first versions by hand, core first:

   ```bash
   cd dart && dart pub publish
   cd ../flutter && flutter pub publish
   ```

   For `flutter/`, temporarily remove `pubspec_overrides.yaml` (it points at
   `../dart`) or publish after the core is live so the dependency resolves.

2. On pub.dev, open each package → **Admin** → **Automated publishing** →
   **Enable publishing from GitHub Actions**: repository `chmuzamil/pakdatakit`,
   tag pattern `dart-v{{version}}` (core) or `flutter-v{{version}}` (Flutter),
   and require the GitHub Actions environment `pub.dev`.
3. Optional: publish under a **verified publisher** (a domain you own), so
   pub.dev shows a verified badge instead of a personal account.

### PyPI: Python `pakdatakit`

PyPI allows a _pending_ trusted publisher before the project exists:

1. Sign in to [pypi.org](https://pypi.org) → **Your account** →
   **Publishing** → **Add a new pending publisher** → **GitHub**:
   - PyPI project name: `pakdatakit`
   - Owner: `chmuzamil`
   - Repository name: `pakdatakit`
   - Workflow name: `release-python.yml`
   - Environment name: `pypi`
2. The first `python-v…` tag creates the project.

### GitHub Pages (done)

**Settings → Pages → Source: GitHub Actions.**

### Optional hardening

- Under **Settings → Environments**, add yourself as a required reviewer for
  the `npm` and `pypi` environments, so every publish waits for your approval.
- On npmjs.com, set each package's publishing access to **Require two-factor
  authentication and disallow tokens**.
