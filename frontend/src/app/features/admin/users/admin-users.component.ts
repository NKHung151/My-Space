import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { PageMeta } from '../../../core/http/api-response.model';
import { ToastService } from '../../../core/notifications/toast.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { UiStateComponent } from '../../../shared/components/ui-state/ui-state.component';
import { AdminUser, AdminUserRole, AdminUserStatus } from './models/admin-user.model';
import { AdminUsersService } from './services/admin-users.service';
import { AssetImageDirective } from '../../../shared/directives/asset-image.directive';

import { LocalizedDatePipe } from '../../../shared/pipes/localized-date.pipe';
import { DisplayNamePipe, displayNameOf } from '../../../shared/pipes/display-name.pipe';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaginationComponent, UiStateComponent, AssetImageDirective, LocalizedDatePipe, DisplayNamePipe],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
})
export class AdminUsersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly adminUsersService = inject(AdminUsersService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly pageSize = 8;
  readonly users = signal<AdminUser[]>([]);
  readonly pagination = signal<PageMeta>({ total: 0, page: 1, limit: this.pageSize, totalPages: 0 });
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly selectedUser = signal<AdminUser | null>(null);
  readonly detailLoading = signal(false);
  readonly saving = signal(false);
  readonly updatingUserIds = signal<ReadonlySet<number>>(new Set());
  readonly adminProtectionActive = signal(false);
  readonly drawerOpen = signal(false);
  readonly selectedUserIsSelf = computed(() => this.selectedUser()?.id === this.authService.currentUser()?.id);
  readonly selectedUserIsAdmin = computed(() => this.selectedUser()?.role === 'admin');

  readonly filterForm = this.fb.nonNullable.group({
    search: '',
    role: '',
    status: '',
  });

  readonly editForm = this.fb.nonNullable.group({
    role: 'user' as AdminUserRole,
    active: true,
  });

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const role = params.get('role');
    const status = params.get('status');
    this.filterForm.setValue({
      search: params.get('search') ?? '',
      role: role === 'admin' || role === 'user' ? role : '',
      status: status === 'active' || status === 'inactive' ? status : '',
    }, { emitEvent: false });

    this.filterForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged((previous, current) => JSON.stringify(previous) === JSON.stringify(current)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.loadUsers(1));

    this.editForm.controls.role.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(role => this.applyRoleProtection(role));

    this.loadUsers(this.readPage(params.get('page')));
  }

  loadUsers(page = this.pagination().page): void {
    const filters = this.filterForm.getRawValue();
    this.syncQueryParams(page, filters);
    this.loading.set(true);
    this.errorMessage.set('');

    this.adminUsersService.getUsers({
      search: filters.search.trim() || undefined,
      role: (filters.role || undefined) as AdminUserRole | undefined,
      status: (filters.status || undefined) as AdminUserStatus | undefined,
      page,
      limit: this.pageSize,
    }).subscribe({
      next: response => {
        this.users.set(response.items);
        this.pagination.set(response.meta);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Không thể tải danh sách người dùng.');
        this.loading.set(false);
      },
    });
  }

  clearFilters(): void {
    this.filterForm.setValue({ search: '', role: '', status: '' });
  }

  private syncQueryParams(page: number, filters = this.filterForm.getRawValue()): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      replaceUrl: true,
      queryParams: {
        search: filters.search.trim() || null,
        role: filters.role || null,
        status: filters.status || null,
        page: page > 1 ? page : null,
      },
    });
  }

  private readPage(value: string | null): number {
    const page = Number(value);
    return Number.isInteger(page) && page > 0 ? page : 1;
  }

  openUser(user: AdminUser): void {
    this.drawerOpen.set(true);
    this.selectedUser.set(null);
    this.detailLoading.set(true);

    this.adminUsersService.getUser(user.id).subscribe({
      next: selected => {
        if (!this.drawerOpen()) {
          return;
        }
        this.selectedUser.set(selected);
        this.editForm.reset({
          role: selected.role ?? 'user',
          active: selected.status === 'active',
        }, { emitEvent: false });
        this.configureAccessControls(selected);
        this.detailLoading.set(false);
      },
      error: () => {
        this.detailLoading.set(false);
        this.errorMessage.set('Không thể tải thông tin người dùng.');
      },
    });
  }

  openUserFromKeyboard(event: KeyboardEvent, user: AdminUser): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openUser(user);
    }
  }

  closeDrawer(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.drawerOpen.set(false);
    this.selectedUser.set(null);
    this.detailLoading.set(false);
  }

  toggleUserStatus(user: AdminUser, input: HTMLInputElement): void {
    if (user.role === 'admin' || this.updatingUserIds().has(user.id)) {
      input.checked = user.status === 'active';
      return;
    }

    const status: AdminUserStatus = input.checked ? 'active' : 'inactive';
    this.setUpdating(user.id, true);
    this.adminUsersService.updateUser(user.id, { status }).subscribe({
      next: updated => {
        this.replaceUser(updated);
        this.setUpdating(user.id, false);
        const label = updated.status === 'active' ? 'Đang hoạt động' : 'Không hoạt động';
        this.toastService.showSuccess(`Trạng thái tài khoản của ${displayNameOf(updated)} đã chuyển thành “${label}”.`);
      },
      error: () => {
        input.checked = user.status === 'active';
        this.setUpdating(user.id, false);
        this.toastService.showError('Không thể thay đổi trạng thái tài khoản.');
      },
    });
  }

  saveUser(): void {
    const user = this.selectedUser();
    if (!user || this.saving()) {
      return;
    }
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const values = this.editForm.getRawValue();
    this.saving.set(true);
    this.adminUsersService.updateUser(user.id, {
      ...(user.role === 'admin' ? {} : {
        role: values.role,
        status: values.active ? 'active' : 'inactive',
      }),
    }).subscribe({
      next: updated => {
        this.replaceUser(updated);
        this.saving.set(false);
        this.closeDrawer();
        this.toastService.showSuccess(`Đã lưu thay đổi của ${displayNameOf(updated)}.`);
      },
      error: () => {
        this.saving.set(false);
        this.toastService.showError('Không thể cập nhật người dùng này.');
      },
    });
  }

  isCurrentUser(user: AdminUser): boolean {
    return user.id === this.authService.currentUser()?.id;
  }

  private configureAccessControls(user: AdminUser): void {
    if (user.role === 'admin') {
      this.editForm.controls.role.disable({ emitEvent: false });
      this.editForm.controls.active.disable({ emitEvent: false });
      this.editForm.controls.active.setValue(true, { emitEvent: false });
      this.adminProtectionActive.set(true);
      return;
    }
    this.editForm.controls.role.enable({ emitEvent: false });
    this.editForm.controls.active.enable({ emitEvent: false });
    this.adminProtectionActive.set(false);
  }

  private applyRoleProtection(role: AdminUserRole): void {
    if (!this.selectedUser() || this.selectedUserIsAdmin()) {
      return;
    }
    const promoted = role === 'admin';
    this.adminProtectionActive.set(promoted);
    if (promoted) {
      this.editForm.controls.active.setValue(true, { emitEvent: false });
      this.editForm.controls.active.disable({ emitEvent: false });
    } else {
      this.editForm.controls.active.enable({ emitEvent: false });
    }
  }

  private replaceUser(updatedUser: AdminUser): void {
    this.users.update(users => users.map(user => user.id === updatedUser.id ? updatedUser : user));
    if (this.selectedUser()?.id === updatedUser.id) {
      this.selectedUser.set(updatedUser);
    }
  }

  private setUpdating(userId: number, updating: boolean): void {
    this.updatingUserIds.update(current => {
      const next = new Set(current);
      updating ? next.add(userId) : next.delete(userId);
      return next;
    });
  }
}
