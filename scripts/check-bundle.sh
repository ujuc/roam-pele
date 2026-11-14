#!/usr/bin/env bash
# Fails if extension.js uses remote code loading or network APIs
# (Roam Depot review items, see docs/roam-depot/SUBMISSION.md).
set -euo pipefail

file="${1:-extension.js}"
[ -f "$file" ] || { echo "$file not found; run ./build.sh first" >&2; exit 1; }

patterns=(
  '\bimport\s*\('
  '\beval\b'
  '\bnew\s+Function\b'
  'createElement\(\s*["'"'"'`]script'
  '\bfetch\b'
  'XMLHttpRequest'
  'sendBeacon'
  'WebSocket'
  'EventSource'
)

status=0
for p in "${patterns[@]}"; do
  if grep -nP "$p" "$file"; then
    echo "::error file=$file::forbidden pattern found: $p" >&2
    status=1
  fi
done

[ "$status" -eq 0 ] && echo "$file: no forbidden APIs (${#patterns[@]} patterns)"
exit "$status"
