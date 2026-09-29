#!/usr/bin/env bash
set -euo pipefail
DIR="assets/img/cars/mg-midget-1964"
[[ -d "$DIR" ]] || { echo "No MG image dir; skip"; exit 0; }
shopt -s nullglob
# Prefer split parts if present
for i in 01 02 03 04 05 06; do
  out="$DIR/$i.jpg"
  if [[ -f "$DIR/$i.jpg.b64.1" && -f "$DIR/$i.jpg.b64.2" ]]; then
    echo "Decoding parts $i"
    cat "$DIR/$i.jpg.b64.1" "$DIR/$i.jpg.b64.2" | tr -d '\n' | base64 -d > "$out"
  elif [[ -f "$DIR/$i.jpg.b64" ]]; then
    echo "Decoding $i.jpg.b64"
    base64 -d "$DIR/$i.jpg.b64" > "$out"
  else
    echo "Skip $i (no sidecar)"
    continue
  fi
  head -c 3 "$out" | od -An -tx1 | grep -q "ff d8 ff"
  echo "OK $i $(wc -c < "$out") bytes"
done
echo "Decode complete"
