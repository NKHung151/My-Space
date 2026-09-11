import { Component, EventEmitter, Input, Output } from '@angular/core';


export type PaginationItem = number | null;

/**
 * Thuật toán tính toán danh sách các nút phân trang hiển thị.
 * Nhằm tránh thanh phân trang quá dài khi có hàng chục trang.
 * 
 * Logic hoạt động:
 * 1. Thu thập một mảng Set (để loại bỏ trùng lặp) gồm các trang: 
 *    - Trang đầu tiên: `1`
 *    - Trang trước trang hiện tại: `current - 1`
 *    - Trang hiện tại: `current`
 *    - Trang sau trang hiện tại: `current + 1`
 *    - Trang cuối cùng: `total`
 * 2. Lọc bỏ các số trang nằm ngoài khoảng [1, total].
 * 3. Sắp xếp mảng từ nhỏ tới lớn.
 * 4. Duyệt qua mảng vừa sắp xếp, nếu khoảng cách giữa số trang hiện tại và số trang phía trước nó LỚN HƠN 1,
 *    thì chèn một phần tử `null` (đại diện cho dấu chấm lửng '...') vào giữa 2 khoảng cách đó.
 * 
 * Ví dụ: Người dùng đang ở trang 5 trên tổng 10 trang. (currentPage = 5, totalPages = 10)
 * B1: Thu thập Set các trang: 1, 4, 5, 6, 10
 * B2 & 3: Lọc và xếp -> [1, 4, 5, 6, 10]
 * B4: So sánh và chèn `null`:
 * - 4 cách 1 là 3 đơn vị (> 1) -> chèn `null` giữa 1 và 4.
 * - 5 cách 4 là 1 -> không chèn.
 * - 6 cách 5 là 1 -> không chèn.
 * - 10 cách 6 là 4 (> 1) -> chèn `null` giữa 6 và 10.
 * KẾT QUẢ: [1, null, 4, 5, 6, null, 10] (Tương đương 1 ... 4 5 6 ... 10)
 * 
 * @param currentPage Trang hiện tại
 * @param totalPages Tổng số trang
 */
export function buildPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  const total = Math.max(1, Math.floor(totalPages));
  const current = Math.min(total, Math.max(1, Math.floor(currentPage)));
  
  // Thu thập danh sách các điểm neo quan trọng
  const pages = [...new Set([1, current - 1, current, current + 1, total])]
    .filter(page => page >= 1 && page <= total)
    .sort((left, right) => left - right);

  // Thêm giá trị null (đại diện cho dấu chấm lửng '...') khi khoảng cách các trang bị đứt quãng
  return pages.flatMap((page, index) => {
    const previousPage = pages[index - 1];
    return previousPage !== undefined && page - previousPage > 1
      ? [null, page] // Chèn null vào trước số page nếu cách xa
      : [page];
  });
}

/**
 * PaginationComponent - Thành phần UI thanh phân trang
 * 
 * Mục đích: Hiển thị các nút điều hướng chuyển trang cho người dùng.
 * Bắt sự kiện khi người dùng click vào một trang, sau đó emit (bắn) sự kiện ra ngoài cho component cha xử lý gọi API.
 */
@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
})
export class PaginationComponent {
  @Input() currentPage = 1;
  @Input() totalPages = 1;
  // Sự kiện phát ra số trang khi người dùng bấm chọn trang mới
  @Output() readonly pageChange = new EventEmitter<number>();

  /** Đảm bảo số trang hiện tại luôn hợp lệ (không nhỏ hơn 1 và không lớn hơn tổng số trang) */
  get normalizedCurrentPage(): number {
    return Math.min(Math.max(1, Math.floor(this.totalPages)), Math.max(1, Math.floor(this.currentPage)));
  }

  /** Mảng dữ liệu các nút phân trang dùng để vòng lặp render ở file HTML */
  get items(): PaginationItem[] {
    return buildPaginationItems(this.normalizedCurrentPage, this.totalPages);
  }

  /**
   * Phương thức xử lý khi người dùng nhấn vào nút chuyển trang
   * @param page Số trang đích muốn tới
   */
  requestPage(page: number): void {
    const target = Math.min(Math.max(1, Math.floor(this.totalPages)), Math.max(1, Math.floor(page)));
    // Chỉ emit sự kiện gọi API nếu số trang khác với trang đang đứng hiện tại
    if (target !== this.normalizedCurrentPage) {
      this.pageChange.emit(target);
    }
  }

  /** Tối ưu hiệu năng cho ngFor vòng lặp Angular để tránh phải tạo lại toàn bộ DOM khi state thay đổi */
  trackItem(index: number, item: PaginationItem): string {
    return item === null ? `gap-${index}` : `page-${item}`;
  }
}
