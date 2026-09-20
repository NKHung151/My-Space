import argparse
from pathlib import Path

import pandas as pd
import torch
from PIL import Image

from common import build_model, get_device, make_transforms

EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ckpt", required=True, help="đường dẫn checkpoint, ví dụ models\\resnet18_224_best.pt")
    ap.add_argument("--folder", required=True, help="thư mục chứa ảnh cần thử")
    ap.add_argument("--top", type=int, default=15, help="in ra bao nhiêu ảnh điểm cao nhất")
    ap.add_argument("--thr", type=float, default=0.5, help="ngưỡng đánh dấu unsafe")
    a = ap.parse_args()

    device = get_device()
    ck = torch.load(a.ckpt, map_location="cpu")
    model = build_model(ck["model"], False, pretrained=False)
    model.load_state_dict(ck["state_dict"])
    model.to(device).eval()
    _, tf = make_transforms(ck["size"])

    rows, skipped = [], 0
    files = [f for f in sorted(Path(a.folder).rglob("*")) if f.suffix.lower() in EXTS]
    if not files:
        print("Không tìm thấy ảnh nào trong", a.folder)
        return

    for f in files:
        try:
            with Image.open(f) as im:
                x = tf(im.convert("RGB")).unsqueeze(0).to(device)
        except Exception:
            skipped += 1
            continue
        with torch.no_grad():
            p = torch.softmax(model(x).float(), 1)[0, 1].item()
        rows.append((p, str(f)))

    rows.sort(reverse=True)
    print(f"\n{a.top} ảnh bị chấm 'unsafe' cao nhất:")
    for p, path in rows[:a.top]:
        print(f"  {p:.3f}  {Path(path).name}")

    flagged = sum(p >= a.thr for p, _ in rows)
    print(f"\n{flagged}/{len(rows)} ảnh bị đánh dấu unsafe (p >= {a.thr}).")
    if skipped:
        print(f"Bỏ qua {skipped} file không đọc được.")

    Path("runs").mkdir(exist_ok=True)
    out = Path("runs") / f"predict_{Path(a.folder).name}_{Path(a.ckpt).stem}.csv"
    pd.DataFrame(rows, columns=["p_unsafe", "path"]).to_csv(out, index=False)
    print("Đã lưu toàn bộ kết quả:", out)


if __name__ == "__main__":
    main()