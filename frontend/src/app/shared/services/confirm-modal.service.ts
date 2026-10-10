import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** Hành động phá hủy (xóa, thu hồi) -> nút xác nhận màu đỏ */
  danger?: boolean;
}

/** Hộp xác nhận dùng chung cho cả app (thay cho window.confirm và các modal tự viết trong từng component). */
@Injectable({
  providedIn: 'root'
})
export class ConfirmModalService {
  private readonly optionsSignal = signal<ConfirmOptions | null>(null);
  private resolveFn: ((result: boolean) => void) | null = null;

  /** Nội dung hộp thoại đang mở; null = đang đóng. */
  readonly options = this.optionsSignal.asReadonly();

  /** Mở hộp xác nhận; trả true nếu người dùng đồng ý. */
  open(options: ConfirmOptions): Promise<boolean> {
    // Đang có hộp khác mở -> coi như hộp cũ bị hủy
    this.resolveFn?.(false);
    this.optionsSignal.set(options);
    document.body.classList.add('modal-open');
    return new Promise(resolve => {
      this.resolveFn = resolve;
    });
  }

  close(result: boolean): void {
    this.optionsSignal.set(null);
    document.body.classList.remove('modal-open');
    this.resolveFn?.(result);
    this.resolveFn = null;
  }
}
