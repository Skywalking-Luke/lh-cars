#!/usr/bin/env bash
set -euo pipefail
DIR="assets/img/cars/mg-midget-1964"
if [[ ! -d "$DIR" ]]; then
  echo "No MG image dir; skip decode"
  exit 0
fi
shopt -s nullglob
for f in "$DIR"/*.jpg.b64; do
  out="${f%.b64}"
  echo "Decoding $f -> $out"
  base64 -d "$f" > "$out"
  # sanity: JPEG magic
  head -c 3 "$out" | od -An -tx1 | grep -q "ff d8 ff"
  echo "OK $(wc -c < "$out") bytes"
done
echo "Decode complete"
