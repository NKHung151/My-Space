import { Component, EventEmitter, HostListener, Input, OnInit, Output, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

import { BrandComponent } from '../../../shared/components/brand/brand.component';

export interface AdminNavItem {
  labelKey: string;
  icon: string;
  route?: string;
}

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, BrandComponent],
  templateUrl: './admin-sidebar.component.html',
  styleUrl: './admin-sidebar.component.scss'
})
export class AdminSidebarComponent implements OnInit {
  private readonly authService = inject(AuthService);

  private readonly router = inject(Router);

  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  readonly moreMenuOpen = signal(false);
  readonly currentUser = this.authService.currentUser;
  readonly navItems: AdminNavItem[] = [
    { labelKey: 'Tổng quan', icon: 'bi-speedometer2', route: '/admin' },
    { labelKey: 'Quản lý người dùng', icon: 'bi-people', route: '/admin/users' },
    { labelKey: 'Quản lý bài viết', icon: 'bi-file-earmark-check', route: '/admin/posts' }
  ];

  ngOnInit(): void {

  }

  toggleMoreMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.moreMenuOpen.update(v => !v);
  }

  closeMoreMenu(): void {
    this.moreMenuOpen.set(false);
    this.closeMenu();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('[data-admin-more]')) {
      this.moreMenuOpen.set(false);
    }
  }

  closeMenu(): void {
    this.close.emit();
  }

  logout(): void {
    this.closeMoreMenu();
    this.authService.logout().subscribe({
      complete: () => void this.router.navigate(['/']),
    });
  }
}
