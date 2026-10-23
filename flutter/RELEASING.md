# Releasing the Flutter package

The Flutter package `pakdatakit_flutter` is published to
[pub.dev](https://pub.dev/packages/pakdatakit_flutter) from GitHub Actions
when a tag like `flutter-v0.1.0` is pushed, using pub.dev's
[automated publishing](https://dart.dev/tools/pub/automated-publishing) with
GitHub's OIDC tokens, so no credentials are stored in the repository. See the
repository's [RELEASING.md](../RELEASING.md) for the release order across all
packages.

## Release order

`pakdatakit_flutter` depends on the Dart package `pakdatakit` (`dart/`). The
`pakdatakit` version required in `pubspec.yaml` must already be on pub.dev:
release the Dart package first (`dart-v…`, see
[dart/RELEASING.md](../dart/RELEASING.md)), then this one.

During development `pubspec_overrides.yaml` points `pakdatakit` at `../dart`.
It is excluded from the published package by `.pubignore`, so the published
package always uses `pakdatakit` from pub.dev.

## Before tagging

- `version` in `pubspec.yaml` is the version being released, and
  `CHANGELOG.md` has an entry for it (pub.dev shows it).
- The `pakdatakit` constraint in `pubspec.yaml` is satisfied by a version
  that is on pub.dev.
- From `flutter/`, everything passes:

  ```bash
  flutter pub get
  dart format --output=none --set-exit-if-changed .
  flutter analyze --fatal-infos
  flutter test
  flutter pub publish --dry-run
  ```

  and the example analyzes cleanly (`cd example && flutter pub get && flutter
  analyze --fatal-infos`).

## First release: publish manually

pub.dev only allows automated publishing for a package that already exists,
so the first version must be published by hand by an uploader, after
`pakdatakit` is on pub.dev:

```bash
cd flutter
flutter pub publish
```

## One-time setup

1. **Verified publisher (recommended).** Transfer the package to the same
   [verified publisher](https://dart.dev/tools/pub/verified-publishers) as
   `pakdatakit` (pub.dev → package → **Admin** → **Transfer to publisher**).
2. **Enable automated publishing.** On pub.dev → package → **Admin** →
   **Automated publishing**, enable **Publishing from GitHub Actions**:
   - Repository: `chmuzamil/pakdatakit`
   - Tag pattern: `flutter-v{{version}}`
   - Optionally require a GitHub Actions environment (e.g. `pub.dev`) and
     add protection rules to it, so a tag alone cannot publish.

## The workflow

A workflow (for example `.github/workflows/release-flutter.yml`) runs on tags
matching `flutter-v*`. It needs `permissions: id-token: write` so it can
request an OIDC token for pub.dev, and should:

1. Check that the tag matches `version` in `flutter/pubspec.yaml` (pub.dev
   also rejects a mismatch with the tag pattern).
2. Check that the required `pakdatakit` version is on pub.dev, and remove
   `pubspec_overrides.yaml` so the checks run against the published core.
3. Set up Flutter (e.g. `subosito/flutter-action`) and run the format,
   analyze and test steps above.
4. Publish from `flutter/` with `flutter pub publish --force` (pub.dev's
   OIDC token is picked up automatically when `id-token: write` is granted;
   `dart-lang/setup-dart` sets up the token exchange).
5. Create a GitHub release.

Then release with:

```bash
git tag flutter-v0.1.0
git push origin flutter-v0.1.0
```
