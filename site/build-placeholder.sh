#!/usr/bin/env bash
# Builds the pakdatakit.dev placeholder into <out> for release <id>:
# copies site/placeholder/, writes healthz.json (which the deploy health
# check reads) and pre-compresses text files for Nginx's gzip_static.
#
# Usage: bash site/build-placeholder.sh <out-dir> <release-id> [git-sha]
# Phase 1 replaces this with the Astro build; the deploy steps stay the same.
set -euo pipefail

out=${1:?out dir}
id=${2:?release id}
sha=${3:-unknown}
here=$(cd "$(dirname "$0")" && pwd)

rm -rf "$out"
mkdir -p "$out"
cp -R "$here/placeholder/." "$out/"

printf '{"release":"%s","sha":"%s","builtAt":"%s"}\n' \
  "$id" "$sha" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$out/healthz.json"

# gzip -k keeps the original next to the .gz; -n leaves out the timestamp.
find "$out" -type f \( -name '*.html' -o -name '*.css' -o -name '*.js' -o -name '*.mjs' \
  -o -name '*.svg' -o -name '*.json' -o -name '*.txt' -o -name '*.xml' -o -name '*.wasm' \) \
  -size +1k -exec gzip -9 -k -n -f {} +

echo "built $id into $out ($(find "$out" -type f | wc -l | tr -d ' ') files)"
