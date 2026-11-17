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
| `chmuzamil/pakdatakit`  | Packagist    | `php-v2.3.0`     | `split-php.yml`       | `php/src/PakData.php`   |
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

## .NET packages (`dotnet/`)

`PakDataKit`, `PakDataKit.DataAnnotations` and `PakDataKit.FluentValidation`
share one version, set in `dotnet/Directory.Build.props`, and use the same
version number as `pakdatakit` on npm. They are not on NuGet yet and have no
release workflow: CI builds, tests and packs them (the `dotnet` job uploads
the `.nupkg` files as an artifact) but pushes nothing.

- The datasets are embedded from `data/*.json` when the project is built, so
  a data change needs no extra step for .NET.
- `dataVersion` is read from `src/data-version.ts` at build time.
- The tests run the shared vectors in `test-vectors/`, like Python and Dart.
- `dotnet/src/PakDataKit/Generated/unicode-case.json` comes from
  `node scripts/generate-dotnet-data.mjs` (CI fails if it is out of date).
  Regenerate it only when the pinned Node version in `ci.yml` changes.

To release by hand, once the NuGet package IDs are reserved:

```bash
cd dotnet
dotnet test -c Release
dotnet pack -c Release -o artifacts
dotnet nuget push "artifacts/*.nupkg" --source https://api.nuget.org/v3/index.json --api-key <key>
```

Publish `PakDataKit` first; the two adapter packages depend on the same
version of it. Add a `## x.y.z` section to `dotnet/CHANGELOG.md` and set
`<Version>` in `dotnet/Directory.Build.props` as part of the release branch.

## PHP package (`php/`)

`chmuzamil/pakdatakit` uses the same version number as `pakdatakit` on npm.
`php/composer.json` has no `version` field: the tag gives the version, and
`PakData::PACKAGE_VERSION` must say the same. CI (the `php` job) checks the
generated data and runs the tests on PHP 8.2 and 8.4 without the `intl`
extension.

- `php/data/*.php` is generated from `data/*.json` and from JavaScript's
  Unicode tables by `node scripts/generate-php-data.mjs` (CI fails if it is
  out of date). After a data change, run it and commit `php/data/`.
- The tests run the shared vectors in `test-vectors/`, like the other ports.

Packagist reads `composer.json` from the root of a repository, so it cannot
use this monorepo. `.github/workflows/split-php.yml` copies `php/` to the
read-only mirror **`chmuzamil/pakdatakit-php`** when a `php-v*` tag is pushed
and tags the mirror `vx.y.z`. This repository stays the source of truth; never
commit to the mirror by hand.

### One-time setup

1. Create an empty public repository `chmuzamil/pakdatakit-php` (no README,
   licence or .gitignore). Give it a description such as "Read-only mirror of
   pakdatakit/php. Send issues and pull requests to chmuzamil/pakdatakit" and
   turn off Issues.
2. Create a fine-grained personal access token: resource owner `chmuzamil`,
   repository access **only** `pakdatakit-php`, permission **Contents: Read
   and write**. Note the expiry date; the split fails once it expires.
3. In `chmuzamil/pakdatakit` → Settings → Secrets and variables → Actions,
   add a repository secret named **`PHP_SPLIT_TOKEN`** with that token.
   Without the secret the workflow runs and does nothing.
4. Push the first tag (see "Release" below) and check that the mirror has
   the files at its root and a `v2.3.0` tag.
5. Sign in at https://packagist.org with GitHub, choose **Submit**, and enter
   `https://github.com/chmuzamil/pakdatakit-php`. The package name comes from
   `composer.json` (`chmuzamil/pakdatakit`).
6. Let Packagist install its GitHub hook when it asks (or add it from the
   package page), so new tags appear without a manual update.

### Release

```bash
git checkout main && git pull
git tag php-vx.y.z && git push origin php-vx.y.z
```

The workflow fails if the tag does not match `PakData::PACKAGE_VERSION`. Then
check the mirror for the `vx.y.z` tag and Packagist for the new version.

## Vue and Angular packages (`vue/`, `angular/`)

`pakdatakit-vue` and `pakdatakit-angular` have their own versions (in
`vue/package.json` and `angular/package.json`), like `pakdatakit-react`. They
are not on npm yet and have no release workflows; CI lints, type-checks,
tests and builds them.

- Both declare `pakdatakit` as a peer dependency, so release them after the
  `pakdatakit` version they need is on npm.
- `pakdatakit-vue`: `npm run build` in `vue/`, then publish from `vue/`.
- `pakdatakit-angular`: `npm run build` in `angular/` writes the Angular
  package format to `angular/dist`; publish from **`angular/dist`**, not from
  `angular/`. It is built with Angular 17, the oldest version it supports.
  CI tests it on Angular 17, 18, 19 and the latest major (the `angular`
  matrix in `ci.yml`). When a new major is released, add it to the matrix
  and, if it passes, raise the upper bound of the peer range.
- The first release of each is published by hand (as for `pakdatakit-react`);
  add a `release-vue.yml` / `release-angular.yml` workflow and an npm trusted
  publisher before automating later ones.

## Release a new version

1. On a branch:
   - update `CHANGELOG.md` with a `## x.y.z` section;
   - set the version in `package.json` (`npm version x.y.z --no-git-tag-version`),
     in `python/pyproject.toml` and `python/src/pakdatakit/__init__.py`, and in
     `dart/pubspec.yaml`;
   - set `<Version>` in `dotnet/Directory.Build.props`, and
     `PakData::PACKAGE_VERSION` in `php/src/PakData.php`;
   - add a `## x.y.z` section to each port's CHANGELOG, and update the
     supported versions in `SECURITY.md` for a new minor version;
   - if data changed, update `dataVersion` in `src/data-version.ts`,
     `python/src/pakdatakit/data_version.py`, `dart/lib/src/data_version.dart`
     and `dart/test/api_test.dart`, and the date in `DATA.md`;
   - run `npm run check:metadata` (CI runs it too); it fails if any of the
     versions above, the data version, the repository URL, licence or author
     differ between the ports;
   - run `npm run test:ports`, which regenerates `test-vectors/`,
     `python/src/pakdatakit/data/`, `dart/lib/src/data/` and `php/data/` and
     runs every port's tests, and commit what it regenerated;
   - do **not** copy new data into `faker/src/snapshot/`. `pakdatakit-faker`
     picks from its own frozen lists so that a seed keeps giving the same
     output; replacing them changes seeded output for every user and needs a
     new minor version of the faker with a changelog note.
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
