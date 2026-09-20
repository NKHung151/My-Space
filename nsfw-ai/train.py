import argparse
import json
import time
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import torch
import torch.nn as nn
from tqdm import tqdm

from common import build_model, get_device, get_loader, run_eval


def parse():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", choices=["cnn", "resnet18"], default="cnn")
    ap.add_argument("--freeze", action="store_true", help="đóng băng backbone (chỉ ResNet)")
    ap.add_argument("--epochs", type=int, default=25)
    ap.add_argument("--batch", type=int, default=32)
    ap.add_argument("--size", type=int, default=128)
    ap.add_argument("--lr", type=float, default=1e-3)
    ap.add_argument("--wd", type=float, default=1e-4)
    ap.add_argument("--name", default=None)
    ap.add_argument("--overfit", action="store_true", help="kiểm tra code: học thuộc 1 batch")
    return ap.parse_args()


def main():
    a = parse()
    name = a.name or f"{a.model}{'_frozen' if a.freeze else ''}_{a.size}"
    device = get_device()
    use_amp = device.type == "cuda"
    print("Thiết bị:", device, torch.cuda.get_device_name(0) if use_amp else "")

    train_loader = get_loader("train", a.size, a.batch, train=True)
    val_loader = get_loader("val", a.size, a.batch)
    print("Lớp:", train_loader.dataset.class_to_idx,
          "| train:", len(train_loader.dataset), "| val:", len(val_loader.dataset))

    model = build_model(a.model, a.freeze).to(device)
    params = [p for p in model.parameters() if p.requires_grad]
    print("Số tham số được huấn luyện:", sum(p.numel() for p in params))

    criterion = nn.CrossEntropyLoss()
    opt = torch.optim.AdamW(params, lr=a.lr, weight_decay=a.wd)
    scaler = torch.cuda.amp.GradScaler(enabled=use_amp)

    def train_step(x, y):
        opt.zero_grad(set_to_none=True)
        with torch.autocast(device_type=device.type, dtype=torch.float16, enabled=use_amp):
            logits = model(x)
        loss = criterion(logits.float(), y)
        scaler.scale(loss).backward()
        scaler.step(opt)
        scaler.update()
        return loss.item(), logits

    if a.overfit:
        x, y = next(iter(train_loader))
        x, y = x.to(device), y.to(device)
        model.train()
        for i in range(1, 81):
            loss, _ = train_step(x, y)
            if i % 10 == 0:
                print(f"bước {i:3d} | loss {loss:.4f}")
        print("Loss phải giảm gần 0. Nếu không, code có lỗi.")
        return

    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=a.epochs)
    Path("models").mkdir(exist_ok=True)
    Path("runs").mkdir(exist_ok=True)
    best, hist = float("inf"), []

    for ep in range(1, a.epochs + 1):
        model.train()
        t0, loss_sum, correct, n = time.time(), 0.0, 0, 0
        for x, y in tqdm(train_loader, desc=f"Epoch {ep}/{a.epochs}", leave=False):
            x, y = x.to(device, non_blocking=True), y.to(device, non_blocking=True)
            loss, logits = train_step(x, y)
            loss_sum += loss * y.size(0)
            correct += (logits.argmax(1) == y).sum().item()
            n += y.size(0)
        sched.step()
        val_loss, val_acc, _, _ = run_eval(model, val_loader, device, criterion)
        row = dict(epoch=ep, train_loss=loss_sum / n, train_acc=correct / n,
                   val_loss=val_loss, val_acc=val_acc)
        hist.append(row)
        mark = ""
        if val_loss < best:
            best = val_loss
            torch.save({"model": a.model, "freeze": a.freeze, "size": a.size,
                        "epoch": ep, "state_dict": model.state_dict()},
                       f"models/{name}_best.pt")
            mark = "  <- tốt nhất"
        print(f"Epoch {ep:2d} | train loss {row['train_loss']:.4f} acc {row['train_acc']:.3f} | "
              f"val loss {val_loss:.4f} acc {val_acc:.3f} | {time.time() - t0:.0f}s{mark}")

    Path(f"runs/{name}.json").write_text(json.dumps(hist, indent=1))
    fig, ax = plt.subplots(1, 2, figsize=(11, 4))
    e = [h["epoch"] for h in hist]
    ax[0].plot(e, [h["train_loss"] for h in hist], label="train")
    ax[0].plot(e, [h["val_loss"] for h in hist], label="val")
    ax[0].set_title("Loss")
    ax[0].legend()
    ax[1].plot(e, [h["train_acc"] for h in hist], label="train")
    ax[1].plot(e, [h["val_acc"] for h in hist], label="val")
    ax[1].set_title("Accuracy")
    ax[1].legend()
    fig.savefig(f"runs/{name}.png", dpi=110, bbox_inches="tight")
    print(f"Xong. Checkpoint: models/{name}_best.pt | biểu đồ: runs/{name}.png")


if __name__ == "__main__":
    main()