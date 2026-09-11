import { Component, EventEmitter, Input, Output } from '@angular/core';


export type UiStateKind = 'loading' | 'empty' | 'error';

/**
 * UiStateComponent - Component dùng chung để hiển thị các trạng thái UI phụ
 * 
 * Mục đích: 
 * - Hiển thị vòng xoay "loading" khi đang lấy dữ liệu.
 * - Hiển thị "empty" khi không có dữ liệu (ví dụ: không có bài viết nào).
 * - Hiển thị "error" khi có lỗi xảy ra (ví dụ: lỗi mạng).
 * Hỗ trợ hiển thị nút hành động (như "Thử lại") thông qua sự kiện `action`.
 */
@Component({
  selector: 'app-ui-state',
  standalone: true,
  imports: [],
  templateUrl: './ui-state.component.html',
  styleUrl: './ui-state.component.scss'
})
export class UiStateComponent {
  // Loại trạng thái cần hiển thị
  @Input({ required: true }) kind!: UiStateKind;
  @Input() title = '';
  @Input() description = '';
  @Input() actionLabel = '';
  
  // Sự kiện kích hoạt khi bấm nút hành động đi kèm (nếu có)
  @Output() action = new EventEmitter<void>();
}
