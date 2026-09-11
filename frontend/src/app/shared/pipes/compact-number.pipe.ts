import { Pipe, PipeTransform } from '@angular/core';

/**
 * CompactNumberPipe - Định dạng số lớn thành dạng viết tắt
 * 
 * Mục đích: Rút gọn các con số dài (ví dụ: lượt xem, lượt like, số lượng bình luận)
 * giúp giao diện thẻ bài viết (post-card) gọn gàng, không bị tràn chữ.
 * 
 * Cơ chế hoạt động:
 * - Dưới 1000: giữ nguyên gốc (VD: 999)
 * - Từ 1000 trở lên: sử dụng hàm có sẵn của trình duyệt `Intl.NumberFormat` 
 *   để chuyển thành dạng chữ K, M... (VD: 1200 -> "1.2K", 1500000 -> "1.5M")
 */
@Pipe({
  name: 'compactNumber',
  standalone: true
})
export class CompactNumberPipe implements PipeTransform {
  transform(value: number | undefined | null): string {
    if (value == null) return '0'; // Xử lý trường hợp dữ liệu rỗng
    
    // Trả về chuỗi nguyên gốc nếu số lượng nhỏ hơn 1000
    if (value < 1000) return value.toString();
    
    // Sử dụng API chuẩn của trình duyệt (Intl) để format số sang dạng viết tắt (compact)
    // Hệ thống dựa vào chuẩn tiếng Anh (en-US) để xuất ra các ký tự K, M, B, T
    return Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1 // Giữ lại tối đa 1 chữ số thập phân (ví dụ: 1.5K, không phải 1.53K)
    }).format(value);
  }
}
