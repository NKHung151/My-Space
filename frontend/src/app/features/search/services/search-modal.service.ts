import { Injectable, signal } from '@angular/core';

/**
 * SearchModalService - Quản lý trạng thái mở/đóng của hộp tìm kiếm toàn cục (Search Modal).
 *
 * Mục đích:
 * Đây là một "Shared State Service" tối giản, chỉ lưu một trạng thái duy nhất: modal có đang mở không.
 * Vì service được khai báo `providedIn: 'root'`, Angular tạo ra đúng MỘT instance duy nhất
 * cho toàn bộ ứng dụng (Singleton pattern).
 *
 * Cơ chế hoạt động:
 *   - `isOpen` là một Angular Signal (tương tự BehaviorSubject nhưng nhẹ hơn, không cần .subscribe()).
 *   - Bất kỳ component nào inject service này đều có thể đọc `modalService.isOpen()` để biết trạng thái.
 *   - Khi `open()` hoặc `close()` được gọi → Signal tự động thông báo cho tất cả component
 *     đang đọc nó (Angular tự track dependency, không cần unsubscribe).
 *
 * Ai dùng service này:
 *   - NavbarComponent (hoặc layout) → gọi `open()` khi user bấm icon kính lúp / phím tắt Ctrl+K
 *   - SearchModalComponent → đọc `isOpen()` để hiện/ẩn overlay, gọi `close()` khi user bấm Escape hoặc chọn kết quả
 *
 * Tại sao không dùng @Input/@Output giữa 2 component?
 *   Vì Navbar và SearchModal không có quan hệ cha-con trực tiếp trong cây component,
 *   nên dùng Shared Service là cách Angular-idiomatic để giao tiếp ngang (sibling/unrelated components).
 */
@Injectable({ providedIn: 'root' })
export class SearchModalService {
  /**
   * Signal lưu trạng thái modal: true = đang mở, false = đang đóng.
   * Được đọc bằng `modalService.isOpen()` trong template Angular (không cần async pipe).
   * Khi giá trị thay đổi → Angular tự re-render phần template phụ thuộc vào signal này.
   */
  readonly isOpen = signal(false);

  /**
   * Mở Search Modal.
   * Gọi từ: NavbarComponent khi user bấm nút tìm kiếm hoặc nhấn phím tắt (Ctrl+K / /).
   * Sau khi signal = true → SearchModalComponent nhận biết và focus vào ô input.
   */
  open(): void {
    this.isOpen.set(true);
  }

  /**
   * Đóng Search Modal và reset toàn bộ kết quả tìm kiếm.
   * Gọi từ:
   *   - SearchModalComponent.close() khi user nhấn Escape
   *   - SearchModalComponent khi user chọn một kết quả (navigate đến trang đích)
   *   - Khi user click ra ngoài overlay
   */
  close(): void {
    this.isOpen.set(false);
  }
}
