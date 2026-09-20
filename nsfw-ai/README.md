# Module Kiểm Duyệt Ảnh bằng AI (nsfw-ai)

**Mục tiêu:** Phân loại nhị phân (safe/unsafe) ảnh người dùng tải lên (bao gồm ảnh đại diện và ảnh bài viết) để phát hiện nội dung bạo lực hoặc vũ khí (súng, dao). Đây là một module AI cốt lõi được tích hợp vào hệ thống mạng xã hội thông minh My Space, có nhiệm vụ làm sạch dữ liệu đầu vào và đảm bảo môi trường cộng đồng an toàn trước khi lưu trữ. Model được phát triển từ việc thử nghiệm kiến trúc CNN cơ bản, sau đó nâng cấp lên phương pháp Transfer Learning để đạt độ chính xác cao nhất.

## Luồng tích hợp hệ thống (Spring Boot ↔ FastAPI)
1. Người dùng upload ảnh (qua endpoint upload thường, đổi avatar, hoặc import URL).
2. `UploadServiceImpl` (Spring Boot) chặn lại, gửi byte ảnh qua `POST http://127.0.0.1:8000/moderate` tới `serve.py`.
3. Trả về `p_unsafe` (xác suất) và `status`.
4. Nếu `status == "REJECTED"` (`p_unsafe` >= `THRESHOLD`, mặc định `0.7`, có thể đổi qua biến môi trường): Spring Boot chặn không upload lên Cloudinary, trả về lỗi HTTP `422`.
5. Nếu service AI tắt hoặc lỗi: trả về HTTP `503`.
6. Nếu file không đọc được dạng ảnh: trả về HTTP `400`. Nếu quá giới hạn 10 MB: trả về `413`.

*Xác nhận từ code:* Các hàm `uploadAvatar` và `importExternalImage` luôn quét ảnh. Hàm `uploadMedia` chỉ gọi AI quét khi `content-type` bắt đầu bằng `image/` (nghĩa là tải lên video/audio sẽ đi vòng qua cổng quét). Ảnh động (GIF/WebP) mặc định PIL chỉ đọc khung hình đầu tiên.

## Dữ liệu (Dataset)
- **Quy mô:** Tổng cộng 11.100 ảnh, chia thành train (7.770) / val (1.665) / test (1.665). Tỷ lệ unsafe ổn định ~49,5% ở cả 3 tập.
- **Tiền xử lý (`prepare_data.py`):** Đã loại bỏ ảnh trùng lặp (cả trong cùng 1 lớp và trùng giữa 2 lớp) bằng Perceptual Hash (phash).
- **Phân tách:** Chia tập theo nhóm (group-kfold): Các ảnh trích xuất từ cùng một video hoặc các phiên bản augment của cùng một ảnh gốc luôn được xếp vào cùng một tập. Kiểm tra thực tế: 0 nhóm nằm ở nhiều hơn một tập.
- **Định dạng:** Ảnh được thu nhỏ tối đa 384 px và lưu log vào `manifest.csv` để truy vết.
- **Nguồn Safe:** COCO val2017 (2.000 ảnh), Portrait Paintings (600, CC0-1.0), Indian Paintings (500, MIT), NonViolence trích từ video RLVS (2.500).
- **Nguồn Unsafe:** Weapon Detection Dataset của snehilsanyal (500, CC0-1.0), Guns-Knives Object Detection của iqmansingh (1.500, CC0-1.0), Handgun Detection của andrewmvd (1.000, CC0-1.0), Violence trích từ video RLVS (2.500).
- **Bản quyền (License):** COCO và RLVS: `TODO: kiểm tra điều khoản`.
- **Chính sách nhãn (hiện tại):** Unsafe bao gồm hình ảnh có súng, dao, hoặc bạo lực (kể cả game, poster, ảnh sản phẩm, trường bắn). Không thêm bộ ảnh thể thao riêng vào lớp Safe (dù nguồn NonViolence có chứa một số cảnh thể thao).

*(Lưu ý: Không đưa dữ liệu, ảnh và checkpoint `.pt` lên repo. Cần chuẩn bị ảnh vào `data_raw` rồi tự chạy lại `prepare_data.py`).*

## Kết quả thí nghiệm
Chạy 1 lần duy nhất cho mỗi cấu hình (1 seed).

| Model | Số tham số train | Val Accuracy | Ghi chú |
|---|---|---|---|
| CNN tự viết (128 px) | 389.410 | 0,826 | |
| ResNet18 đóng băng (224 px)| 1.026 | 0,897 | Chỉ train lớp phân loại cuối |
| ResNet18 fine-tune (224 px) | ~11,18 triệu | **0,959** | |
| ResNet18 fine-tune (320 px) | ~11,18 triệu | 0,951 | Lấy checkpoint theo val loss tốt nhất (acc epoch cuối: 0,961) |

**Model chọn:** ResNet18 fine-tune 224 px.
Kết quả trên tập test (chạy 1 lần):
- **Accuracy:** 0,956
- Tại ngưỡng 0,5: **Precision** 0,971, **Recall** 0,938
- **Confusion Matrix** (hàng thật, cột dự đoán; safe, unsafe): `[[817, 23], [51, 774]]`
- **Accuracy theo nguồn (test):** coco 0,963; handgun 0,920; nonviolence 0,979; paintings 0,960; portrait_paintings 0,989; violence 0,928; weapon1 0,947; weapons2 0,964.

*(Nhấn mạnh: Kết quả được đo trên chính các nguồn đã train với tập cân bằng 50/50, không đại diện cho phân bố ảnh thực tế ngoài đời).*

## Phân tích lỗi (Error Analysis)
1. Kích thước 320 px không cải thiện đáng kể (handgun đạt 130/150 so với 131/150 ở 224 px). Giả thuyết "súng quá nhỏ ở 224 px" không được ủng hộ.
2. Grad-CAM trên ảnh handgun bị bỏ sót: Với các ảnh dự đoán sai nặng nhất, vùng nóng thường nằm ngoài khẩu súng. Với súng to, rõ nét (đồ cổ, poster), vùng nóng nằm chính xác trên súng (đây là quan sát định tính trên mẫu nhỏ).
3. Nhiều ảnh handgun bị bỏ sót là game/poster/ảnh sản phẩm/trường bắn: Thể hiện vấn đề định nghĩa nhãn hơn là lỗi thuần túy của kiến trúc mạng.
4. Ảnh Safe hay bị chặn nhầm: Thường là thể thao va chạm (bóng bầu dục Úc trong tập RLVS) hoặc ảnh người cầm vật thể dài.

## Giới hạn
- Chỉ phân loại bạo lực và vũ khí. **CHƯA nhận diện nội dung khiêu dâm** (đây là hạn chế lớn nhất so với tên thư mục).
- Chưa quét được video/audio.
- Chưa đo lường trên ảnh thực tế đời thường (`TODO: chạy predict.py với ảnh thật`).
- Không có cơ chế kháng cáo hay duyệt tay từ admin. Nếu ảnh vi phạm rất hiếm ngoài đời thực, phần lớn ảnh bị chặn có thể là chặn nhầm.
- Chưa chạy thí nghiệm đối chiếu chéo (CNN@224 và ResNet@128); chưa đo lường dao động giữa các lần train khác nhau.
- `TODO: kiểm tra endpoint cập nhật profile có nhận URL avatar tùy ý không (nếu có, có thể đi vòng qua cổng quét)`.

## Hướng dẫn chạy (Windows)
Sử dụng: Python 3.11, GPU RTX 3050 Laptop 4 GB.

1. Khởi tạo venv: `python -m venv venv` và kích hoạt: `.\venv\Scripts\activate`
2. Cài đặt PyTorch bản CUDA 12.1 riêng (trước khi cài requirements):
   `pip install torch==2.3.0+cu121 torchvision==0.18.0+cu121 --index-url https://download.pytorch.org/whl/cu121`
3. Cài đặt requirements. Đảm bảo `numpy<2` và `opencv-python==4.10.0.84`:
   `pip install -r requirements.txt`
   *(Ghi chú: requirements.txt là kết quả của pip freeze, chứa cả các thư viện chỉ dùng tải dữ liệu).*
4. Chuẩn bị dữ liệu: Chạy `python prepare_data.py`.
5. Huấn luyện: Chạy `python train.py`. *(Lưu ý trên Windows: DataLoader dùng nhiều worker bắt buộc mã chạy phải nằm trong `if __name__ == "__main__":`).*
6. Đánh giá, phân tích: Dùng `evaluate.py`, `gradcam.py`...
7. Chạy service FastAPI:
   `python -m uvicorn serve:app --host 127.0.0.1 --port 8000`
8. Kiểm tra `GET /health` và thử `POST /moderate` bằng curl.

## Cấu trúc thư mục

```
nsfw-ai/
├── common.py           # Model builders (SmallCNN, ResNet), transforms, hàm đánh giá (eval)
├── count_data.py       # Kiểm tra thống kê dữ liệu sau chia tập, đếm số nhóm bị rò rỉ
├── count_raw.py        # Thống kê nhanh đuôi file trong data_raw
├── errors_sheet.py     # Tạo ảnh lưới tổng hợp các ảnh bị phân loại sai từ file CSV
├── evaluate.py         # Tính độ chính xác, Confusion Matrix, xuất danh sách lỗi ra CSV
├── extract_frames.py   # Trích xuất khung hình từ video (dùng cho dataset RLVS)
├── gather_images.py    # Sao chép và gom ảnh rải rác từ nhiều thư mục về một chỗ
├── gradcam.py          # Vẽ bản đồ nhiệt (heatmap) phân tích vùng kích hoạt quyết định của model
├── predict.py          # Inference nhanh toàn bộ ảnh trong một thư mục
├── prepare_data.py     # Lọc ảnh, loại trùng (phash), chia tập group-kfold, resize và tạo manifest
├── preview.py          # Tạo ảnh mẫu ngẫu nhiên từ manifest
├── serve.py            # API FastAPI cung cấp endpoint /moderate
├── trace_errors.py     # Tra cứu ngược ảnh gốc dựa trên danh sách lỗi
├── train.py            # Vòng lặp huấn luyện model, hỗ trợ AMP và cosine annealing
├── view_errors.py      # Trực quan hóa ảnh sai lầm kèm độ tin cậy (p_unsafe)
└── requirements.txt    # Danh sách toàn bộ thư viện (pip freeze)
```
