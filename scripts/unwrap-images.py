"""Convert photos stored as JPEG-in-SVG text (a workaround for text-only uploads)
into real JPEG binaries, so they work on any static host (GitHub Pages, Netlify)."""
import base64, pathlib, re
root = pathlib.Path("assets/img")
wrapped_left = 0
for f in sorted(root.rglob("*.jpg")):
    b = f.read_bytes()
    if b[:3] == b"\xff\xd8\xff":
        continue
    m = re.search(rb"base64,([A-Za-z0-9+/=]+)", b)
    if not m:
        print("skip (no data):", f); continue
    try:
        d = base64.b64decode(m.group(1), validate=True)
    except Exception as e:
        print("skip (bad base64):", f, e); wrapped_left += 1; continue
    if d[:3] != b"\xff\xd8\xff":
        print("skip (not JPEG):", f); wrapped_left += 1; continue
    f.write_bytes(d)
    print("unwrapped:", f, len(d), "bytes")
if wrapped_left == 0:
    # Photos are real JPEGs now: drop the old svg+xml content-type override.
    pathlib.Path("_headers").write_text("/assets/*\n  Cache-Control: public, max-age=86400\n")
    print("_headers updated")
