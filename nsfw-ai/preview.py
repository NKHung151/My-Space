from pathlib import Path

import pandas as pd
from PIL import Image

m = pd.read_csv("manifest.csv")
out = Path("preview")
out.mkdir(exist_ok=True)
T, COLS, ROWS = 128, 8, 4
for (cls, src), df in m[m.split == "train"].groupby(["class", "source"]):
    paths = df["new_path"].sample(min(COLS * ROWS, len(df)), random_state=1).tolist()
    sheet = Image.new("RGB", (COLS * T, ROWS * T), (30, 30, 30))
    for i, p in enumerate(paths):
        with Image.open(p) as im:
            im = im.convert("RGB")
            im.thumbnail((T, T))
            sheet.paste(im, ((i % COLS) * T, (i // COLS) * T))
    sheet.save(out / f"{cls}_{src}.jpg", quality=85)
print("Xong ->", out.resolve())