import argparse
from pathlib import Path

import pandas as pd
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("--csv", required=True)
ap.add_argument("--source", default=None, help="lọc theo nguồn, ví dụ handgun")
a = ap.parse_args()

df = pd.read_csv(a.csv)
if a.source:
    df = df[df.source == a.source]
T, COLS, ROWS = 128, 8, 4
out = Path("runs")
tag = f"_{a.source}" if a.source else ""
for name, part in [("fp_bi_chan_nham", df[df.label == 0]), ("fn_bi_bo_sot", df[df.label == 1])]:
    paths = part.sort_values("conf", ascending=False)["path"].head(COLS * ROWS).tolist()
    if not paths:
        continue
    sheet = Image.new("RGB", (COLS * T, ROWS * T), (30, 30, 30))
    for i, p in enumerate(paths):
        with Image.open(p) as im:
            im = im.convert("RGB")
            im.thumbnail((T, T))
            sheet.paste(im, ((i % COLS) * T, (i // COLS) * T))
    f = out / f"{name}{tag}.jpg"
    sheet.save(f, quality=85)
    print("Đã lưu", f)