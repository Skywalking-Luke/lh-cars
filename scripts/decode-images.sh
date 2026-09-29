#!/usr/bin/env bash
set -euo pipefail
DIR="assets/img/cars/mg-midget-1964"
[[ -d "$DIR" ]] || { echo "No MG image dir; skip"; exit 0; }
shopt -s nullglob
for f in "$DIR"/*.jpg.b64; do
  out="${f%.b64}"
  echo "Decoding $f -> $out"
  base64 -d "$f" > "$out"
  head -c 3 "$out" | od -An -tx1 | grep -q "ff d8 ff"
  echo "OK $(wc -c < "$out") bytes"
done
echo "Decode complete"
