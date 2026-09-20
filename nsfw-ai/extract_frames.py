import sys
from pathlib import Path

import cv2

SRC = Path(sys.argv[1])     # thư mục chứa video
DST = Path(sys.argv[2])     # thư mục đích
PREFIX = sys.argv[3]        # tên ngắn của dataset, tránh trùng tên
EVERY_SEC = 1.5
MAX_PER_VIDEO = 6
VIDEO_EXTS = {".mp4", ".avi", ".mov", ".mkv", ".mpg"}

DST.mkdir(parents=True, exist_ok=True)
n_videos = n_frames = 0
for v in sorted(SRC.rglob("*")):
    if v.suffix.lower() not in VIDEO_EXTS:
        continue
    cap = cv2.VideoCapture(str(v))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    step = max(int(fps * EVERY_SEC), 1)
    i = saved = 0
    while saved < MAX_PER_VIDEO:
        ok, frame = cap.read()
        if not ok:
            break
        if i % step == 0:
            stem = v.stem.replace(" ", "_")
            cv2.imwrite(str(DST / f"{PREFIX}_{stem}__{saved:03d}.jpg"), frame)
            saved += 1
        i += 1
    cap.release()
    n_videos += 1
    n_frames += saved
print(f"{n_videos} video -> {n_frames} frame")