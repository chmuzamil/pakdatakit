#!/usr/bin/env bash
# Prepares a built site (site/dist) for release <id>: writes healthz.json,
# which the deploy health check reads, and pre-compresses text files for
# Nginx's gzip_static.
#
# Usage: bash site/package-release.sh <dist-dir> <release-id> [git-sha]
set -euo pipefail

out=${1:?dist dir}
id=${2:?release id}
sha=${3:-unknown}

[ -f "$out/index.html" ] || { echo "$out/index.html is missing: run npm run build in site/ first" >&2; exit 1; }

printf '{"release":"%s","sha":"%s","builtAt":"%s"}\n' \
  "$id" "$sha" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$out/healthz.json"

# gzip -k keeps the original next to the .gz; -n leaves out the timestamp.
find "$out" -type f \( -name '*.html' -o -name '*.css' -o -name '*.js' -o -name '*.mjs' \
  -o -name '*.svg' -o -name '*.json' -o -name '*.txt' -o -name '*.xml' -o -name '*.md' \) \
  -size +1k -exec gzip -9 -k -n -f {} +

echo "packaged $id in $out ($(find "$out" -type f | wc -l | tr -d ' ') files)"
