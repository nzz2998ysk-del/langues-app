#!/usr/bin/env python3
"""Prepare the Papote brand images for the app.

Inputs (drop them in design-system/brand/):
  logo.png      the Papote logo (cat + "Papote" bubble)
  mascotte.png  the mascot sheet: a 4 x 4 grid of expressions (row by row)

Outputs (design-system/brand/):
  mascot/<mood>.png   16 trimmed, transparent expressions (max 360 px)
  logo-512.png        logo, max 512 px (login page, splash)
  icon-512.png, icon-192.png, apple-touch-icon.png, favicon-32.png
  brand.json          which files exist (read by the server)

AI-generated sheets often have a fake "transparency" checkerboard painted in:
light, unsaturated pixels connected to the border are made transparent.

  pip install pillow && python3 scripts/brand/process-brand.py
"""
import json
import os
import sys
from collections import deque

from PIL import Image

ROOT = os.environ.get("BRAND_DIR") or os.path.join(os.path.dirname(__file__), "..", "..", "design-system", "brand")
# Order of the expressions in the 4 x 4 sheet, row by row.
MOODS = [
    "hello", "wave", "question", "wink",
    "sleep", "amazed", "shy", "laugh",
    "surprised", "cool", "stretch", "love",
    "cheer", "peek", "sad", "celebrate",
]


def is_background(px):
    r, g, b = px[:3]
    a = px[3] if len(px) > 3 else 255
    if a < 20:
        return True
    hi, lo = max(r, g, b), min(r, g, b)
    return lo >= 200 and hi - lo <= 22  # white / light grey, unsaturated


def remove_background(img):
    """Flood-fill from the borders: background-looking pixels become transparent."""
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h:
            continue
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        if not is_background(px[x, y]):
            continue
        px[x, y] = (255, 255, 255, 0)
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    # Soften the 1-px fringe left around the drawing.
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            r, g, b, a = px[x, y]
            if a and is_background((r, g, b)) and any(px[x + dx, y + dy][3] == 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                px[x, y] = (r, g, b, 110)
    return img


def trim(img, pad=6):
    box = img.getbbox()
    if not box:
        return img
    l, t, r, b = box
    return img.crop((max(0, l - pad), max(0, t - pad), min(img.width, r + pad), min(img.height, b + pad)))


def fit(img, size):
    img = img.copy()
    img.thumbnail((size, size), Image.LANCZOS)
    return img


def square(img, size, bg=None, margin=0.08):
    canvas = Image.new("RGBA", (size, size), bg or (0, 0, 0, 0))
    inner = int(size * (1 - 2 * margin))
    im = fit(img, inner)
    canvas.alpha_composite(im, ((size - im.width) // 2, (size - im.height) // 2))
    return canvas


def main():
    out = {"logo": False, "mascot": [], "icons": False}
    logo_path = os.path.join(ROOT, "logo.png")
    sheet_path = os.path.join(ROOT, "mascotte.png")
    if os.path.exists(logo_path):
        logo = trim(remove_background(Image.open(logo_path)))
        fit(logo, 512).save(os.path.join(ROOT, "logo-512.png"), optimize=True)
        square(logo, 512, (255, 255, 255, 255)).convert("RGB").save(os.path.join(ROOT, "icon-512.png"), optimize=True)
        square(logo, 192, (255, 255, 255, 255)).convert("RGB").save(os.path.join(ROOT, "icon-192.png"), optimize=True)
        square(logo, 180, (255, 255, 255, 255), 0.06).convert("RGB").save(os.path.join(ROOT, "apple-touch-icon.png"), optimize=True)
        square(logo, 32, None, 0).save(os.path.join(ROOT, "favicon-32.png"), optimize=True)
        out["logo"] = out["icons"] = True
        print("logo: ok")
    else:
        print("logo.png missing - skipped")
    if os.path.exists(sheet_path):
        sheet = remove_background(Image.open(sheet_path))
        os.makedirs(os.path.join(ROOT, "mascot"), exist_ok=True)
        cw, ch = sheet.width / 4, sheet.height / 4
        for i, mood in enumerate(MOODS):
            r, c = divmod(i, 4)
            cell = sheet.crop((int(c * cw), int(r * ch), int((c + 1) * cw), int((r + 1) * ch)))
            cell = fit(trim(cell), 360)
            cell.save(os.path.join(ROOT, "mascot", mood + ".png"), optimize=True)
            out["mascot"].append(mood)
        print("mascot: %d expressions" % len(out["mascot"]))
    else:
        print("mascotte.png missing - skipped")
    with open(os.path.join(ROOT, "brand.json"), "w") as f:
        json.dump(out, f, indent=2)
    return 0


if __name__ == "__main__":
    sys.exit(main())
