import io
import os
import threading

import torch
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError

from common import build_model, get_device, make_transforms

CKPT = os.getenv("MODEL_CKPT", "models/resnet18_224_best.pt")
THRESHOLD = float(os.getenv("THRESHOLD", "0.7"))   # p_unsafe >= THRESHOLD -> REJECTED
API_KEY = os.getenv("MODERATION_API_KEY")          # bỏ trống = không kiểm tra key
MAX_BYTES = 10 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 50_000_000

if not 0.0 < THRESHOLD <= 1.0:
    raise SystemExit(f"THRESHOLD phải nằm trong (0, 1], hiện là {THRESHOLD}")

device = get_device()
ck = torch.load(CKPT, map_location="cpu")
model = build_model(ck["model"], False, pretrained=False)
model.load_state_dict(ck["state_dict"])
model.to(device).eval()
_, tf = make_transforms(ck["size"])
lock = threading.Lock()

app = FastAPI(title="Moderation service")


def decide(p: float) -> str:
    return "REJECTED" if p >= THRESHOLD else "APPROVED"


@app.get("/health")
def health():
    return {"ok": True, "device": str(device), "model": CKPT, "threshold": THRESHOLD}


@app.post("/moderate")
def moderate(file: UploadFile = File(...), x_api_key: str | None = Header(default=None)):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(401, "invalid api key")
    data = file.file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "file too large")
    try:
        with Image.open(io.BytesIO(data)) as im:
            im.load()
            img = ImageOps.exif_transpose(im).convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise HTTPException(400, "not a valid image")

    x = tf(img).unsqueeze(0).to(device)
    with lock, torch.inference_mode(), torch.autocast(
            device_type=device.type, dtype=torch.float16, enabled=device.type == "cuda"):
        logits = model(x)
    p = torch.softmax(logits.float(), 1)[0, 1].item()
    return {"p_unsafe": round(p, 4), "status": decide(p)}