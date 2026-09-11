import { Pipe, PipeTransform } from '@angular/core';


export type LocalizedDateStyle = 'date' | 'dateTime';

/**
 * LocalizedDatePipe - Định dạng ngày tháng dựa trên ngôn ngữ (locale)
 * 
 * Mục đích: Chuyển đổi đối tượng Date hoặc chuỗi ngày tháng thành định dạng hiển thị
 * chuẩn theo ngôn ngữ mà người dùng đang chọn.
 */
@Pipe({
  name: 'localizedDate',
  standalone: true,
  pure: true, // Locale cố định, không cần re-run khi ngôn ngữ thay đổi
})
export class LocalizedDatePipe implements PipeTransform {
  // Luôn dùng locale tiếng Việt (vi) vì web chỉ hỗ trợ tiếng Việt

  /**
   * Hàm format ngày tháng
   * @param value Giá trị ngày tháng cần định dạng
   * @param style Lựa chọn chỉ hiển thị ngày ('date') hoặc cả ngày và giờ ('dateTime')
   */
  transform(value: string | number | Date | null | undefined, style: LocalizedDateStyle = 'date'): string {
    if (value === null || value === undefined || value === '') return '';
    // Đảm bảo value được chuyển thành đối tượng Date hợp lệ
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    // Dùng Intl.DateTimeFormat để hiển thị ngày theo locale đã chọn (ví dụ 'vi-VN' hoặc 'en-US')
    return new Intl.DateTimeFormat(
      "vi",
      style === 'dateTime'
        ? { dateStyle: 'medium', timeStyle: 'short' }
        : { dateStyle: 'medium' },
    ).format(date);
  }
}
