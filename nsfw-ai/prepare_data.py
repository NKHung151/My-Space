import csv
import random
import re
import shutil
import sys
from collections import defaultdict
from pathlib import Path

import imagehash
from PIL import Image
from tqdm import tqdm

RAW, OUT = Path("data_raw"), Path("data")
CLASSES = ["safe", "unsafe"]
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
RATIOS = (0.70, 0.15, 0.15)          # train / val / test
MIN_SIZE = 64
MAX_PER_GROUP = 12                    # tối đa ảnh lấy từ 1 nhóm (1 video / 1 ảnh gốc)
DEFAULT_CAP = 2500                    # tối đa ảnh mỗi nguồn
CAPS = {"portrait_paintings": 600, "paintings": 500, "coco": 2000,
        "weapons2": 1500, "weapon1": 500, "handgun": 1000}
DRY = "--dry" in sys.argv
random.seed(42)


def group_of(p: Path) -> str:
    """Xác định ảnh này thuộc 'nhóm' nào để không chia tách các ảnh cùng nhóm."""
    if ".rf." in p.name:                                    # Roboflow: bỏ phần augment
        base = p.name.split(".rf.")[0]
        base = re.sub(r"^w\d+_.*?_(train|valid|test)_images_", "", base)
        base = re.sub(r"_(jpg|jpeg|png)$", "", base)
        m = re.match(r"^(.*?)frame\d+$", base)              # frame video -> mã video
        return "rf:" + (m.group(1) if m else base)
    if "__" in p.stem:                                       # frame tách từ video
        return "vid:" + p.stem.split("__")[0]
    return "img:" + str(p)                                   # ảnh lẻ: tự là 1 nhóm


# 1) Đọc ảnh, bỏ ảnh hỏng/nhỏ, tính hash
files = []
for cls in CLASSES:
    root = RAW / cls
    for p in sorted(root.rglob("*")):
        if p.suffix.lower() in EXTS:
            rel = p.relative_to(root).parts
            files.append((cls, rel[0] if len(rel) > 1 else "_root", p))

items, bad = [], 0
for cls, source, p in tqdm(files, desc="Đọc ảnh"):
    try:
        with Image.open(p) as im:
            im = im.convert("RGB")
            if min(im.size) < MIN_SIZE:
                raise ValueError("quá nhỏ")
            h = str(imagehash.phash(im))
        items.append((cls, source, group_of(p), p, h))
    except Exception:
        bad += 1

# 2) Loại trùng: cùng hash trong 1 lớp -> giữ 1; cùng hash ở 2 lớp -> bỏ hết
by_hash = defaultdict(list)
for it in items:
    by_hash[it[4]].append(it)
kept, dup, cross = [], 0, 0
for lst in by_hash.values():
    if len({x[0] for x in lst}) > 1:
        cross += len(lst)
        continue
    kept.append(lst[0])
    dup += len(lst) - 1

# 3) Gom theo (lớp, nguồn) -> nhóm
groups = defaultdict(lambda: defaultdict(list))
for it in kept:
    groups[(it[0], it[1])][it[2]].append(it)

# 4) Giới hạn số ảnh, rồi chia tập theo nhóm
assign = []
print(f"\nẢnh hỏng/nhỏ: {bad} | trùng: {dup} | lẫn 2 lớp: {cross}\n")
print(f"{'lớp/nguồn':32s} {'ảnh':>6s} {'nhóm':>6s} {'nhóm lớn nhất':>14s} {'chọn':>6s}")
for (cls, source), g in sorted(groups.items()):
    total = sum(len(v) for v in g.values())
    biggest = max(len(v) for v in g.values())
    gl = list(g.items())
    random.shuffle(gl)
    cap, picked, n = CAPS.get(source, DEFAULT_CAP), [], 0
    for gname, lst in gl:
        if n >= cap:
            break
        random.shuffle(lst)
        lst = lst[:min(MAX_PER_GROUP, cap - n)]
        picked.append((gname, lst))
        n += len(lst)
    print(f"{cls + '/' + source:32s} {total:6d} {len(g):6d} {biggest:14d} {n:6d}")
    a, b, run = n * RATIOS[0], n * (RATIOS[0] + RATIOS[1]), 0
    for gname, lst in picked:
        split = "train" if run < a else "val" if run < b else "test"
        run += len(lst)
        assign += [(split, it) for it in lst]

if DRY:
    print("\n[--dry] Chưa copy gì. Bỏ --dry để tạo thư mục data/.")
    sys.exit()

# 5) Ghi ra data/ (thu nhỏ, lưu JPEG) + manifest để truy vết
if OUT.exists():
    shutil.rmtree(OUT)
cnt = defaultdict(int)
with open("manifest.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["split", "class", "source", "group", "orig_path", "new_path"])
    for split, (cls, source, gname, p, h) in tqdm(assign, desc="Ghi ảnh"):
        d = OUT / split / cls
        d.mkdir(parents=True, exist_ok=True)
        cnt[(split, cls, source)] += 1
        new = d / f"{source}_{cnt[(split, cls, source)]:05d}.jpg"
        with Image.open(p) as im:
            im = im.convert("RGB")
            im.thumbnail((384, 384))
            im.save(new, "JPEG", quality=92)
        w.writerow([split, cls, source, gname, str(p), str(new)])
print("Xong. Chạy count_data.py để kiểm tra số lượng.")