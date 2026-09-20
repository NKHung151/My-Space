import argparse
from pathlib import Path

import pandas as pd
import torch
from sklearn.metrics import confusion_matrix, precision_recall_fscore_support

from common import build_model, get_device, get_loader, run_eval


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ckpt", required=True)
    ap.add_argument("--split", default="val", choices=["val", "test"])
    ap.add_argument("--batch", type=int, default=64)
    ap.add_argument("--low", type=float, default=0.3, help="dưới ngưỡng này: tự APPROVED")
    ap.add_argument("--high", type=float, default=0.7, help="từ ngưỡng này trở lên: tự REJECTED")
    a = ap.parse_args()
    if not 0.0 <= a.low < a.high <= 1.0:
        ap.error("cần 0 <= --low < --high <= 1")

    device = get_device()
    ck = torch.load(a.ckpt, map_location="cpu")
    model = build_model(ck["model"], ck.get("freeze", False), pretrained=False)
    model.load_state_dict(ck["state_dict"])
    model.to(device)

    loader = get_loader(a.split, ck["size"], a.batch)
    _, acc, probs, labels = run_eval(model, loader, device)
    print(f"\n{a.ckpt} | tập {a.split} | accuracy @0.5 = {acc:.4f}")

    pred = (probs >= 0.5).astype(int)
    print("\nConfusion matrix (hàng = thật, cột = dự đoán; thứ tự: safe, unsafe)")
    print(confusion_matrix(labels, pred))

    print("\nĐổi ngưỡng cho lớp unsafe:")
    print("ngưỡng | precision | recall |   f1")
    for t in [0.1, 0.3, 0.5, 0.7, 0.9]:
        p, r, f, _ = precision_recall_fscore_support(
            labels, (probs >= t).astype(int), pos_label=1, average="binary", zero_division=0)
        print(f"  {t:.1f}  |   {p:.3f}   | {r:.3f}  | {f:.3f}")

    paths = [s[0] for s in loader.dataset.samples]
    src = [Path(p).stem.rsplit("_", 1)[0] for p in paths]      # tên file: <nguồn>_<số>.jpg
    df = pd.DataFrame({"path": paths, "source": src, "label": labels, "p_unsafe": probs})
    df["ok"] = ((df.p_unsafe >= 0.5).astype(int) == df.label)

    print("\nĐộ chính xác theo nguồn:")
    print(df.groupby("source").agg(n=("ok", "size"), acc=("ok", "mean"),
                                   mean_p_unsafe=("p_unsafe", "mean")).round(3))

    # Cơ chế 3 ngưỡng: p < low -> APPROVED, p >= high -> REJECTED, còn lại -> REVIEW
    low, high = a.low, a.high
    is_auto = (df.p_unsafe < low) | (df.p_unsafe >= high)
    auto, review = df[is_auto], df[~is_auto]
    n_err = int((~df.ok).sum())
    err_in_review = int((~review.ok).sum())
    auto_err = (~auto.ok).mean() if len(auto) else float("nan")

    print(f"\n3 ngưỡng ({low}/{high}):")
    print(f"  tự quyết định : {len(auto) / len(df):.1%} ảnh, sai trong số đó {auto_err:.2%}")
    print(f"  vào REVIEW    : {len(review) / len(df):.1%} ảnh ({len(review)} ảnh)")
    if n_err:
        print(f"  REVIEW bắt được {err_in_review}/{n_err} ảnh model đoán sai "
              f"({err_in_review / n_err:.0%})")

    Path("runs").mkdir(exist_ok=True)
    out = f"runs/errors_{Path(a.ckpt).stem}_{a.split}.csv"
    df[~df.ok].assign(conf=lambda d: (d.p_unsafe - 0.5).abs()).sort_values(
        "conf", ascending=False).to_csv(out, index=False)
    print(f"Ảnh đoán sai (sai tự tin nhất ở đầu file): {out}")


if __name__ == "__main__":
    main()