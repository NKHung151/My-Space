import argparse
from pathlib import Path

import pandas as pd

ap = argparse.ArgumentParser()
ap.add_argument("--csv", required=True)
ap.add_argument("--label", type=int, required=True, help="0 = safe bị chặn nhầm, 1 = unsafe bị bỏ sót")
ap.add_argument("--source", default=None)
ap.add_argument("--n", type=int, default=32)
a = ap.parse_args()

norm = lambda s: Path(s).as_posix()
err = pd.read_csv(a.csv)
if a.source:
    err = err[err.source == a.source]
err = err[err.label == a.label].sort_values("conf", ascending=False).head(a.n).reset_index(drop=True)
man = pd.read_csv("manifest.csv")
man["key"] = man.new_path.map(norm)
err["key"] = err.path.map(norm)
out = err.merge(man[["key", "orig_path", "group"]], on="key", how="left")

for i, r in out.iterrows():
    print(f"#{i + 1:2d} (hàng {i // 8 + 1}, cột {i % 8 + 1}) | {r.source:18s} | p_unsafe={r.p_unsafe:.3f} | {r.orig_path}")