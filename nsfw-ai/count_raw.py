from collections import Counter
from pathlib import Path

EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
for cls in ["safe", "unsafe"]:
    root = Path("data_raw") / cls
    if not root.exists():
        continue
    for sub in sorted(p for p in root.iterdir() if p.is_dir()):
        c = Counter(f.suffix.lower() for f in sub.rglob("*") if f.suffix.lower() in EXTS)
        print(f"{cls}/{sub.name}: {sum(c.values())} {dict(c)}")