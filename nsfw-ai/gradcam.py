import argparse
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import torch
import torch.nn.functional as F
from PIL import Image

from common import build_model, get_device, make_transforms


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ckpt", required=True)
    ap.add_argument("--csv", default=None,
                    help="errors_*.csv để xem ảnh sai; bỏ trống = mẫu ngẫu nhiên từ val")
    ap.add_argument("--source", default=None, help="lọc theo nguồn, ví dụ handgun")
    ap.add_argument("--label", type=int, default=None, choices=[0, 1],
                    help="0 = safe, 1 = unsafe (theo nhãn thật)")
    ap.add_argument("--n", type=int, default=12)
    a = ap.parse_args()

    device = get_device()
    ck = torch.load(a.ckpt, map_location="cpu")
    model = build_model(ck["model"], False, pretrained=False)   # freeze=False để gradient chạy được
    model.load_state_dict(ck["state_dict"])
    model.to(device).eval()
    size = ck["size"]
    _, tf = make_transforms(size)

    layer = model.layer4 if hasattr(model, "layer4") else model.features
    feats, grads = {}, {}

    def fwd(_m, _i, out):
        feats["v"] = out
        out.register_hook(lambda g: grads.__setitem__("v", g))

    layer.register_forward_hook(fwd)

    if a.csv:
        df = pd.read_csv(a.csv)
        if a.source:
            df = df[df.source == a.source]
        if a.label is not None:
            df = df[df.label == a.label]
        df = df.sort_values("conf", ascending=False).head(a.n)
        rows = list(zip(df.path, df.source, df.label))
    else:
        m = pd.read_csv("manifest.csv")
        m = m[m.split == "val"]
        if a.source:
            m = m[m.source == a.source]
        if a.label is not None:
            m = m[m["class"] == ("unsafe" if a.label == 1 else "safe")]
        m = m.sample(min(a.n, len(m)), random_state=1)
        rows = list(zip(m.new_path, m.source, (m["class"] == "unsafe").astype(int)))
    if not rows:
        print("Không có ảnh nào khớp.")
        return

    cols = 4
    nrows = (len(rows) + cols - 1) // cols
    fig, axes = plt.subplots(nrows, cols, figsize=(cols * 3.2, nrows * 3.4))
    axes = np.atleast_1d(axes).ravel()
    for ax in axes:
        ax.axis("off")

    for ax, (path, source, label) in zip(axes, rows):
        with Image.open(path) as im:
            im = im.convert("RGB")
        x = tf(im).unsqueeze(0).to(device)
        model.zero_grad(set_to_none=True)
        logits = model(x)
        p = torch.softmax(logits.float(), 1)[0, 1].item()
        logits[0, 1].backward()                      # gradient theo lớp unsafe
        w = grads["v"].mean(dim=(2, 3), keepdim=True)
        cam = F.relu((w * feats["v"]).sum(1, keepdim=True)).detach()
        cam = F.interpolate(cam, size=x.shape[-2:], mode="bilinear", align_corners=False)[0, 0]
        cam = ((cam - cam.min()) / (cam.max() - cam.min() + 1e-8)).cpu().numpy()
        ax.imshow(im.resize((size, size)))
        ax.imshow(cam, cmap="jet", alpha=0.4)
        ax.set_title(f"{source} | thật={'unsafe' if label else 'safe'} | p={p:.2f}", fontsize=8)

    parts = [a.source or "all"]
    if a.csv:
        parts.append("loi")
    if a.label is not None:
        parts.append(f"label{a.label}")
    Path("runs").mkdir(exist_ok=True)
    out = Path("runs") / f"gradcam_{Path(a.ckpt).stem}_{'_'.join(parts)}.jpg"
    fig.savefig(out, dpi=100, bbox_inches="tight")
    print("Đã lưu", out)


if __name__ == "__main__":
    main()