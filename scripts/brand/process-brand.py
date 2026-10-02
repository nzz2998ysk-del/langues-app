#!/usr/bin/env python3
"""Prepare the Pap’pote brand images for the app.

Inputs (drop them in design-system/brand/):
  logo.png      the Pap’pote logo (cat + "Pap’pote" bubble)
  mascotte.png  the mascot sheet: a 4 x 4 grid of expressions (row by row)

Outputs (design-system/brand/):
  mascotte/mascotte-<name>.png   16 trimmed, transparent expressions (max 360 px)
  logo-512.png        logo, max 512 px (login page, splash)
  icon-512.png, icon-192.png, apple-touch-icon.png, favicon-32.png
  brand.json          which files exist (read by the server)

AI-generated sheets often have a fake "transparency" checkerboard painted in.
The sheet is cut with a silhouette mask: light unsaturated pixels are
background, the drawing's outline is closed morphologically and its inside
filled (so the white fur stays opaque), enclosed pockets that still look like
the grey checkerboard are dropped, and every connected piece (cat, "zzz",
sparkles, hearts...) goes to the cell that holds its centre - so nothing from
a neighbouring expression leaks into a cut.

  pip install pillow numpy scipy && python3 scripts/brand/process-brand.py
"""
import json
import os
import sys
from collections import deque

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.environ.get("BRAND_DIR") or os.path.join(os.path.dirname(__file__), "..", "..", "design-system", "brand")
# Order of the expressions in the 4 x 4 sheet, row by row -> file names
# design-system/brand/mascotte/mascotte-<name>.png
MOODS = [
    "happy", "wave", "thinking", "wink",
    "sleeping", "amazed", "curious", "laughing",
    "surprised", "cool", "stretching", "heart",
    "excited", "peek", "sad", "playful",
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


def cut_sheet(sheet, rows=4, cols=4):
    """Return one transparent RGBA image per cell of the sheet (row by row)."""
    rgb = np.asarray(sheet.convert("RGB")).astype(np.int16)
    hi, lo = rgb.max(axis=2), rgb.min(axis=2)
    bg = (lo >= 222) & (hi - lo <= 16)
    fg = ndimage.binary_opening(~bg, iterations=1)
    disk = np.hypot(*np.mgrid[-5:6, -5:6]) <= 5
    closed = ndimage.binary_closing(fg, structure=disk)
    filled = ndimage.binary_fill_holes(closed)
    # Pockets enclosed by the drawing (between an arm and the body...) are
    # background again when they carry the checkerboard's grey squares.
    holes, n = ndimage.label(filled & ~closed)
    grey = (lo >= 228) & (hi <= 244) & (hi - lo <= 8)
    for i, sl in enumerate(ndimage.find_objects(holes), 1):
        region = holes[sl] == i
        if region.sum() > 900 and grey[sl][region].mean() > 0.3:
            filled[sl][region] = False
    labels, n = ndimage.label(filled, structure=np.ones((3, 3)))
    sizes = ndimage.sum(filled, labels, range(1, n + 1))
    centres = ndimage.center_of_mass(filled, labels, range(1, n + 1))
    h, w = filled.shape
    cells = [[] for _ in range(rows * cols)]
    for i, (size, (cy, cx)) in enumerate(zip(sizes, centres), 1):
        if size < 120:
            continue
        cells[min(rows - 1, int(cy * rows / h)) * cols + min(cols - 1, int(cx * cols / w))].append(i)
    # Pull the edge in by 1 px: the painted outline's anti-aliasing is light grey.
    alpha_all = ndimage.gaussian_filter(ndimage.binary_erosion(filled, iterations=2).astype(np.float32), 0.8)
    src = np.asarray(sheet.convert("RGBA")).copy()
    out = []
    for ids in cells:
        mask = np.isin(labels, ids)
        near = ndimage.binary_dilation(mask, iterations=2)
        a = np.where(near, alpha_all, 0) * 255
        ys, xs = np.nonzero(mask)
        img = src.copy()
        img[..., 3] = a.clip(0, 255).astype(np.uint8)
        out.append(Image.fromarray(img).crop((xs.min() - 6, ys.min() - 6, xs.max() + 7, ys.max() + 7)))
    return out


def main():
    out = {"logo": False, "mascot": [], "icons": False}
    logo_path = os.path.join(ROOT, "logo.png")
    sheet_path = os.path.join(ROOT, "mascotte.png")
    if os.path.exists(logo_path):
        logo = Image.open(logo_path).convert("RGBA")
        if logo.getextrema()[3][0] == 255:  # no real transparency: remove a painted background
            logo = remove_background(logo)
        logo = trim(logo)
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
        os.makedirs(os.path.join(ROOT, "mascotte"), exist_ok=True)
        for mood, cell in zip(MOODS, cut_sheet(Image.open(sheet_path))):
            fit(cell, 360).save(os.path.join(ROOT, "mascotte", "mascotte-" + mood + ".png"), optimize=True)
            out["mascot"].append(mood)
        print("mascot: %d expressions" % len(out["mascot"]))
    else:
        print("mascotte.png missing - skipped")
    with open(os.path.join(ROOT, "brand.json"), "w") as f:
        json.dump(out, f, indent=2)
    return 0


if __name__ == "__main__":
    sys.exit(main())
