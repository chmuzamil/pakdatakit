#!/usr/bin/env bash
# Prints "true" if <package> <version> is already on <registry>, "false" if
# it is not. Used by the release workflows so that a tag for a version that
# is already published (for example by hand, for a new package's first
# release) skips the publish and still succeeds.
#
# Usage: bash scripts/check-published.sh <npm|pypi|pub|nuget> <package> <version>
#
# Messages go to stderr (GitHub Actions reads ::notice:: from there too). If
# the registry can't be reached it fails rather than guessing, so a re-run
# never tries to publish a version that is already there.
set -euo pipefail

registry="${1:?registry}"
name="${2:?package}"
version="${3:?version}"

case "$registry" in
  npm)
    label=npm
    url="https://registry.npmjs.org/${name}/${version}"
    ;;
  pypi)
    label=PyPI
    url="https://pypi.org/pypi/${name}/${version}/json"
    ;;
  pub)
    label=pub.dev
    url="https://pub.dev/api/packages/${name}/versions/${version}"
    ;;
  nuget)
    label=NuGet
    id="$(printf '%s' "$name" | tr '[:upper:]' '[:lower:]')"
    url="https://api.nuget.org/v3-flatcontainer/${id}/${version}/${id}.nuspec"
    ;;
  *)
    echo "::error::Unknown registry '${registry}' (use npm, pypi, pub or nuget)" >&2
    exit 2
    ;;
esac

status="$(curl -s -o /dev/null -w '%{http_code}' --retry 3 --retry-delay 5 "$url" || true)"

case "$status" in
  200)
    echo "::notice::${name} ${version} is already on ${label}; skipping the publish" >&2
    echo true
    ;;
  404)
    echo "${name} ${version} is not on ${label} yet; it will be published" >&2
    echo false
    ;;
  *)
    echo "::error::Could not check ${label} for ${name} ${version} (HTTP ${status:-none}); re-run the workflow" >&2
    exit 1
    ;;
esac
