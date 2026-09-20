import argparse
from pathlib import Path

import pandas as pd
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument("--csv", required=True)
ap.add_argument("--label", type=int, required=True, help="0 = safe bị chặn nhầm, 1 = unsafe bị bỏ sót")
ap.add_argument("--source", default=None)
ap.add_argument("--n", type=int, default=20)
ap.add_argument("--tile", type=int, default=288)
a = ap.parse_args()

df = pd.read_csv(a.csv)
if a.source:
    df = df[df.source == a.source]
df = df[df.label == a.label].sort_values("conf", ascending=False).head(a.n)

COLS, T = 5, a.tile
rows = (len(df) + COLS - 1) // COLS
sheet = Image.new("RGB", (COLS * T, rows * T), (30, 30, 30))
draw = ImageDraw.Draw(sheet)
for i, (p, pu) in enumerate(zip(df.path, df.p_unsafe)):
    x, y = (i % COLS) * T, (i // COLS) * T
    with Image.open(p) as im:
        im = im.convert("RGB")
        im.thumbnail((T - 4, T - 4))
        sheet.paste(im, (x + 2, y + 2))
    draw.rectangle([x + 2, y + 2, x + 100, y + 18], fill=(0, 0, 0))
    draw.text((x + 5, y + 4), f"#{i + 1} p={pu:.2f}", fill=(255, 255, 0))

out = Path("runs") / f"view_{a.source or 'all'}_label{a.label}.jpg"
sheet.save(out, quality=90)
print("Đã lưu", out)