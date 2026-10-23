# Releasing the Dart package

The Dart package `pakdatakit` is published to [pub.dev](https://pub.dev/packages/pakdatakit)
from GitHub Actions when a tag like `dart-v2.2.0` is pushed, using pub.dev's
[automated publishing](https://dart.dev/tools/pub/automated-publishing) with
GitHub's OIDC tokens, so no credentials are stored in the repository. See the
repository's [RELEASING.md](../RELEASING.md) for the release order across all
packages.

## Before tagging

- `version` in `pubspec.yaml` matches the npm `pakdatakit` version being
  released, and `CHANGELOG.md` has an entry for it (pub.dev shows it).
- If data changed, `lib/src/data_version.dart` matches `src/data-version.ts`.
- Regenerate and commit the embedded data, and the shared vectors if the
  TypeScript library changed:

  ```bash
  node scripts/generate-dart-data.mjs
  npm run build && node scripts/generate-test-vectors.mjs
  ```

- From `dart/`, everything passes:

  ```bash
  dart pub get
  dart format --output=none --set-exit-if-changed .
  dart analyze --fatal-infos
  dart test
  dart test -p node test/api_test.dart   # JavaScript (web) semantics
  dart pub publish --dry-run
  ```

## First release: publish manually

pub.dev only allows automated publishing for a package that already exists,
so the first version must be published by hand by an uploader:

```bash
cd dart
dart pub publish
```

## One-time setup

1. **Verified publisher (recommended).** Create a
   [verified publisher](https://dart.dev/tools/pub/verified-publishers) for a
   domain you own and transfer the package to it (pub.dev → package →
   **Admin** → **Transfer to publisher**). The package page then shows the
   verified domain instead of a personal email, and the publisher's members
   can manage it.
2. **Enable automated publishing.** On pub.dev → package → **Admin** →
   **Automated publishing**, enable **Publishing from GitHub Actions**:
   - Repository: `chmuzamil/pakdatakit`
   - Tag pattern: `dart-v{{version}}`
   - Optionally require a GitHub Actions environment (e.g. `pub.dev`) and
     add protection rules to it, so a tag alone cannot publish.

## The workflow

A workflow (for example `.github/workflows/release-dart.yml`) runs on tags
matching `dart-v*`. It needs `permissions: id-token: write` so it can request
an OIDC token for pub.dev, and should:

1. Check that the tag matches `version` in `dart/pubspec.yaml` (pub.dev also
   rejects a mismatch with the tag pattern).
2. Regenerate the embedded data and fail if it differs from the committed
   files.
3. Run the format, analyze and test steps above.
4. Publish from `dart/`, e.g. with the reusable workflow
   `dart-lang/setup-dart/.github/workflows/publish.yml@v1` (with
   `working-directory: dart`), or with `dart-lang/setup-dart` followed by
   `dart pub publish --force`.
5. Create a GitHub release.

Then release with:

```bash
git tag dart-v2.2.0
git push origin dart-v2.2.0
```
