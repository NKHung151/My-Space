import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * SettingsBackButtonComponent — Nút "Quay lại" cho trang Settings.
 *
 * Phần DUY NHẤT khác nhau giữa /settings (user) và /admin/settings (admin):
 * - User context   → quay lại '/'     với label "Quay lại trang chủ"
 * - Admin context  → quay lại '/admin' với label "Quay lại quản trị"
 *
 * Tách ra để loại bỏ backRoute/backLabel khỏi SettingsComponent,
 * tránh if/else rải rác trong component lớn.
 */
@Component({
  selector: 'app-settings-back-button',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a [routerLink]="route" class="d-inline-flex align-items-center gap-2 text-muted text-decoration-none small fw-semibold">
      <i class="bi bi-arrow-left"></i>
      <span>{{ label }}</span>
    </a>
  `,
})
export class SettingsBackButtonComponent {
  @Input() context: 'admin' | 'user' = 'user';

  get route(): string {
    return this.context === 'admin' ? '/admin' : '/';
  }

  get label(): string {
    return this.context === 'admin' ? 'Quay lại quản trị' : 'Quay lại trang chủ';
  }
}
