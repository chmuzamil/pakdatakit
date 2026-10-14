# Releasing

Releases are published to npm by GitHub Actions (`.github/workflows/release.yml`)
when a version tag is pushed. Nobody publishes from their own computer.

## Release a new version

1. On a branch, update `CHANGELOG.md` with a `## x.y.z` section, and set the
   same version in `package.json`:

   ```bash
   npm version x.y.z --no-git-tag-version
   ```

2. Open a pull request, let CI pass, and merge it into `main`.
3. Tag the merge commit on `main` and push the tag:

   ```bash
   git checkout main && git pull
   git tag vx.y.z
   git push origin vx.y.z
   ```

The workflow then checks that the tag matches `package.json`, runs the full
checks, publishes to npm with a provenance attestation, and creates a GitHub
release from the CHANGELOG section. If any step fails, nothing is published.

## One-time setup

Trusted publishing lets npm accept releases from this workflow without an npm
token.

1. On npmjs.com, open the `pakdatakit` package → **Settings** →
   **Trusted Publisher** → **GitHub Actions**, and enter:
   - Organization or user: `chmuzamil`
   - Repository: `pakdatakit`
   - Workflow filename: `release.yml`
   - Environment name: `npm`
2. On GitHub, the `npm` environment is created on the first run. To require
   approval before each publish, add yourself as a required reviewer under
   **Settings → Environments → npm**.
3. Optional, once a release has gone through: in the package's **Settings** on
   npmjs.com, under **Publishing access**, choose **Require two-factor
   authentication and disallow tokens**, so the package can only be published
   by this workflow or by you with 2FA.
