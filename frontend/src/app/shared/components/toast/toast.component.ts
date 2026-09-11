import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ToastMessage, ToastService } from '../../../core/notifications/toast.service';


/**
 * ToastComponent - Thành phần UI hiển thị các thông báo popup (toast) ở góc màn hình
 * 
 * Cơ chế hoạt động:
 * - Khởi tạo: Đăng ký lắng nghe luồng dữ liệu (toastState$) từ ToastService.
 * - Khi có thông báo mới được push từ service: Hiển thị UI và đặt các timer (hẹn giờ) để tự động tắt sau 4 giây.
 * - Hỗ trợ hiệu ứng tắt mượt mà nhờ việc delay xóa dữ liệu sau khi ẩn UI (chờ CSS fade out hoàn tất).
 */
@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss'
})
export class ToastComponent implements OnInit, OnDestroy {
  toastData: ToastMessage | null = null;
  isVisible = false;
  
  private subscription!: Subscription;
  private dismissTimer?: ReturnType<typeof setTimeout>;
  private removalTimer?: ReturnType<typeof setTimeout>;

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    // Đăng ký nhận thông báo mới từ ToastService
    this.subscription = this.toastService.toastState$.subscribe(toast => {
      this.toastData = toast;
      this.isVisible = true;
      
      // Xóa các timer cũ đang đếm ngược nếu người dùng kích hoạt liên tiếp nhiều toast mới
      clearTimeout(this.dismissTimer);
      clearTimeout(this.removalTimer);
      
      // Đặt timer tự động gọi hàm ẩn toast sau 4000 ms (4 giây)
      if (toast.type !== 'loading') {
        this.dismissTimer = setTimeout(() => this.dismiss(), 4000);
      }
    });
  }

  /**
   * Đóng toast và xóa dữ liệu sau một khoảng trễ
   * 
   * Tại sao cần removalTimer?
   * Khi đổi isVisible = false, file CSS (SCSS) sẽ kích hoạt hiệu ứng fade-out (opacity giảm dần).
   * Nếu gán `toastData = null` ngay lập tức, khối HTML bên trong sẽ biến mất ngay lập tức làm giật giao diện.
   * Do đó, ta đợi 200ms cho hiệu ứng diễn ra xong rồi mới xóa trắng dữ liệu thật.
   */
  dismiss(): void {
    this.isVisible = false;
    clearTimeout(this.removalTimer);
    
    // Chờ 200ms cho CSS fade out xong
    this.removalTimer = setTimeout(() => {
      if (!this.isVisible) {
        this.toastData = null;
      }
    }, 200);
  }

  ngOnDestroy() {
    // Hủy các timer và subscription khi component cha bị hủy (ví dụ lúc đóng app) để tránh rò rỉ bộ nhớ
    clearTimeout(this.dismissTimer);
    clearTimeout(this.removalTimer);
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
