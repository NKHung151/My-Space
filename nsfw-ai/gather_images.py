import shutil
import sys
from pathlib import Path

DST = Path(sys.argv[1])
PREFIX = sys.argv[2]
SRC = Path(sys.argv[3])
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

DST.mkdir(parents=True, exist_ok=True)
n = 0
for f in sorted(SRC.rglob("*")):
    if f.is_file() and f.suffix.lower() in EXTS:
        rel = "_".join(f.relative_to(SRC).parts)     # gồm cả train/valid/test để không trùng tên
        shutil.copy2(f, DST / f"{PREFIX}_{rel}")
        n += 1
print(n, "ảnh ->", DST)