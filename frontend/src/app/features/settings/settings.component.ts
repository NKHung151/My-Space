import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';


import { ToastService } from '../../core/notifications/toast.service';
import { UserPreferenceKey } from '../../core/preferences/user-preferences.model';
import { UserPreferencesService } from '../../core/preferences/user-preferences.service';
import { UiStateComponent } from '../../shared/components/ui-state/ui-state.component';
import { AuthService } from '../../core/auth/auth.service';
import { EditorUploadsService } from '../workspace/services/editor-uploads.service';
import { CurrentUser } from '../../core/auth/current-user.model';
import { validateUploadFile } from '../workspace/utils/upload-validator';
import { isStrongPassword } from '../../shared/validators/password.validator';
import { getApiErrorMessage, getUploadErrorMessage } from '../../core/http/api-error.util';
import { finalize, switchMap } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { AssetImageDirective } from '../../shared/directives/asset-image.directive';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, UiStateComponent, FormsModule, AssetImageDirective],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly uploadsService = inject(EditorUploadsService);

  private readonly toastService = inject(ToastService);
  private readonly userPreferencesService = inject(UserPreferencesService);

  readonly preferences = this.userPreferencesService.preferences;

  readonly adminContext = this.route.snapshot.data['settingsContext'] === 'admin';


  activeTab = signal<'profile' | 'account' | 'appearance'>('profile');

  // --- Profile State ---
  user = signal<CurrentUser | null>(null);
  profileForm = {
    displayName: '',
    username: '',
    bio: ''
  };
  savingProfile = signal(false);

  // Avatar Crop State
  uploadingAvatar = signal(false);
  avatarCropOpen = signal(false);
  cropImageUrl = signal('');
  cropZoom = signal(1);
  cropOffsetX = signal(0);
  cropOffsetY = signal(0);
  cropNaturalWidth = signal(1);
  cropNaturalHeight = signal(1);
  readonly cropViewportSize = 260;
  readonly cropDisplayWidth = computed(() => {
    const baseScale = Math.max(
      this.cropViewportSize / this.cropNaturalWidth(),
      this.cropViewportSize / this.cropNaturalHeight(),
    );
    return this.cropNaturalWidth() * baseScale * this.cropZoom();
  });
  readonly cropDisplayHeight = computed(() => {
    const baseScale = Math.max(
      this.cropViewportSize / this.cropNaturalWidth(),
      this.cropViewportSize / this.cropNaturalHeight(),
    );
    return this.cropNaturalHeight() * baseScale * this.cropZoom();
  });
  readonly cropTransform = computed(
    () => `translate(-50%, -50%) translate(${this.cropOffsetX()}px, ${this.cropOffsetY()}px)`,
  );
  private cropSourceImage: HTMLImageElement | null = null;
  private cropSourceFile: File | null = null;
  private cropDragging = false;
  private cropPointerX = 0;
  private cropPointerY = 0;



  // --- Password State ---
  passwordForm = { current: '', new: '', confirm: '' };
  passwordFormSubmitted = signal(false);
  passwordErrors = signal<Partial<Record<'current' | 'new' | 'confirm' | 'form', string>>>({});
  savingPassword = signal(false);
  passwordFieldType = 'password';

  get avatarUrl(): string {
    return this.user()?.avatarUrl || '';
  }

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'profile' || tab === 'account' || tab === 'appearance') {
      this.activeTab.set(tab);
    }
    
    if (!this.adminContext) {
      this.loadOwnProfile();
    }
  }

  setTab(tab: 'profile' | 'account' | 'appearance'): void {
    this.activeTab.set(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
    });
  }

  // ==========================================
  // PROFILE LOGIC
  // ==========================================
  private loadOwnProfile(): void {
    this.authService.getMe().subscribe({
      next: user => {
        this.user.set(user);
        this.setProfileForm(user);
      },
      error: () => {
        this.toastService.showError('Không thể tải hồ sơ');
      },
    });
  }

  private setProfileForm(user: CurrentUser): void {
    this.profileForm = {
      displayName: user.displayName || user.username,
      username: user.username,
      bio: user.bio || '',
    };
  }

  saveProfile() {
    if (!this.profileForm.displayName.trim() || !this.normalizeUsername(this.profileForm.username)) {
      this.toastService.showError('Tên hiển thị và tên người dùng hợp lệ là bắt buộc.');
      return;
    }

    this.savingProfile.set(true);
    this.authService.updateProfile({
      displayName: this.profileForm.displayName.trim(),
      username: this.normalizeUsername(this.profileForm.username),
      bio: this.profileForm.bio.trim()
    }).subscribe({
      next: user => {
        this.user.set(user);
        this.setProfileForm(user);
        this.toastService.showSuccess('Cập nhật hồ sơ thành công.');
        this.savingProfile.set(false);
      },
      error: () => {
        this.toastService.showError('Không thể cập nhật hồ sơ');
        this.savingProfile.set(false);
      },
    });
  }

  private normalizeUsername(value: string): string {
    return value.trim().replace(/^@/, '');
  }



  // --- Avatar Logic ---
  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const validation = validateUploadFile(file, 'image');
    if (!validation.valid) {
      this.toastService.showError('File không hợp lệ');
      return;
    }
    this.openAvatarCropper(file);
  }

  private openAvatarCropper(file: File): void {
    this.releaseCropImage();
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      this.cropSourceFile = file;
      this.cropSourceImage = image;
      this.cropImageUrl.set(objectUrl);
      this.cropNaturalWidth.set(image.naturalWidth || 1);
      this.cropNaturalHeight.set(image.naturalHeight || 1);
      this.cropZoom.set(1);
      this.cropOffsetX.set(0);
      this.cropOffsetY.set(0);
      this.avatarCropOpen.set(true);
      document.body.classList.add('profile-modal-open');
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      this.toastService.showError('Không thể mở hình ảnh này.');
    };
    image.src = objectUrl;
  }

  beginAvatarCropDrag(event: PointerEvent): void {
    event.preventDefault();
    this.cropDragging = true;
    this.cropPointerX = event.clientX;
    this.cropPointerY = event.clientY;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  moveAvatarCrop(event: PointerEvent): void {
    if (!this.cropDragging) return;
    const nextX = this.cropOffsetX() + event.clientX - this.cropPointerX;
    const nextY = this.cropOffsetY() + event.clientY - this.cropPointerY;
    this.cropPointerX = event.clientX;
    this.cropPointerY = event.clientY;
    const maxX = Math.max(0, (this.cropDisplayWidth() - this.cropViewportSize) / 2);
    const maxY = Math.max(0, (this.cropDisplayHeight() - this.cropViewportSize) / 2);
    this.cropOffsetX.set(Math.min(maxX, Math.max(-maxX, nextX)));
    this.cropOffsetY.set(Math.min(maxY, Math.max(-maxY, nextY)));
  }

  endAvatarCrop(event?: PointerEvent): void {
    this.cropDragging = false;
    const target = event?.currentTarget as HTMLElement | undefined;
    if (event && target?.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
  }

  updateCropZoom(value: string | number): void {
    this.cropZoom.set(Math.min(3, Math.max(1, Number(value) || 1)));
    const maxX = Math.max(0, (this.cropDisplayWidth() - this.cropViewportSize) / 2);
    const maxY = Math.max(0, (this.cropDisplayHeight() - this.cropViewportSize) / 2);
    this.cropOffsetX.set(Math.min(maxX, Math.max(-maxX, this.cropOffsetX())));
    this.cropOffsetY.set(Math.min(maxY, Math.max(-maxY, this.cropOffsetY())));
  }

  cancelAvatarCrop(): void {
    this.avatarCropOpen.set(false);
    this.cropDragging = false;
    document.body.classList.remove('profile-modal-open');
    this.releaseCropImage();
  }

  private releaseCropImage(): void {
    const objectUrl = this.cropImageUrl();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    this.cropImageUrl.set('');
    this.cropSourceImage = null;
    this.cropSourceFile = null;
  }

  confirmAvatarCrop(): void {
    const image = this.cropSourceImage;
    const original = this.cropSourceFile;
    if (!image || !original) return;

    const outputSize = 512;
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const context = canvas.getContext('2d');
    if (!context) {
      this.toastService.showError('Không thể cắt hình ảnh này.');
      return;
    }

    const displayScale = this.cropDisplayWidth() / this.cropNaturalWidth();
    const sourceX = ((this.cropDisplayWidth() - this.cropViewportSize) / 2 - this.cropOffsetX()) / displayScale;
    const sourceY = ((this.cropDisplayHeight() - this.cropViewportSize) / 2 - this.cropOffsetY()) / displayScale;
    const sourceSize = this.cropViewportSize / displayScale;

    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, outputSize, outputSize);
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize);

    canvas.toBlob(blob => {
      if (!blob) {
        this.toastService.showError('Không thể cắt hình ảnh này.');
        return;
      }
      const baseName = original.name.replace(/\.[^.]+$/, '') || 'avatar';
      this.cancelAvatarCrop();
      this.uploadAvatar(new File([blob], `${baseName}-avatar.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  }

  private uploadAvatar(file: File): void {
    this.uploadingAvatar.set(true);
    this.uploadsService.uploadAvatar(file).pipe(
      switchMap(upload => this.authService.updateProfile({
        displayName: this.profileForm.displayName.trim(),
        username: this.normalizeUsername(this.profileForm.username),
        bio: this.profileForm.bio.trim(),
        avatarMediaId: upload.url
      })),
      finalize(() => this.uploadingAvatar.set(false)),
    ).subscribe({
      next: user => {
        this.user.set(user);
        this.setProfileForm(user);
        this.toastService.showSuccess('Cập nhật ảnh hồ sơ thành công.');
      },
      error: (err: unknown) => {
        const msg = getUploadErrorMessage(err);
        this.toastService.showError(msg, 'Không thể cập nhật ảnh đại diện');
      },
    });
  }


  // ==========================================
  // ACCOUNT / PASSWORD LOGIC
  // ==========================================
  submitPassword() {
    if (this.savingPassword()) return;

    this.passwordFormSubmitted.set(true);
    this.passwordErrors.set({});
    if (this.passwordError('current') || this.passwordError('new') || this.passwordError('confirm')) return;

    this.savingPassword.set(true);
    this.authService.changePassword({
      currentPassword: this.passwordForm.current,
      newPassword: this.passwordForm.new,
    }).subscribe({
      next: () => {
        this.passwordForm = { current: '', new: '', confirm: '' };
        this.savingPassword.set(false);
        this.authService.expireSession();
        void this.router.navigate(['/auth/login'], {
          queryParams: { messageKey: 'password_updated_sign_in_again' },
        });
      },
      error: err => {
        const message = getApiErrorMessage(err, '').toLowerCase();
        if (message.includes('mật khẩu hiện tại không đúng')) {
          this.passwordErrors.set({ current: 'Mật khẩu hiện tại không đúng.' });
        } else if (message.includes('khác mật khẩu hiện tại')) {
          this.passwordErrors.set({ new: 'Mật khẩu mới phải khác mật khẩu hiện tại.' });
        } else {
          this.passwordErrors.set({ form: 'Không thể cập nhật mật khẩu. Vui lòng thử lại.' });
        }
        this.savingPassword.set(false);
      },
    });
  }

  passwordError(field: 'current' | 'new' | 'confirm'): string {
    const serverError = this.passwordErrors()[field];
    if (serverError) return serverError;
    if (!this.passwordFormSubmitted()) return '';

    if (field === 'current') {
      return this.passwordForm.current ? '' : 'Nhập mật khẩu hiện tại của bạn.';
    }
    if (field === 'new') {
      return isStrongPassword(this.passwordForm.new) ? '' : 'Dùng 8–72 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt; không dùng khoảng trắng.';
    }
    if (!this.passwordForm.confirm) return 'Xác nhận mật khẩu của bạn.';
    return this.passwordForm.new === this.passwordForm.confirm ? '' : 'Mật khẩu không khớp.';
  }

  clearPasswordError(field: 'current' | 'new' | 'confirm'): void {
    this.passwordErrors.update(errors => {
      const next = { ...errors };
      delete next[field];
      delete next.form;
      return next;
    });
  }

  togglePasswordVisibility() {
    this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  updatePreference(key: UserPreferenceKey, event: Event): void {
    const enabled = (event.target as HTMLInputElement).checked;
    this.userPreferencesService.update(key, enabled);
    this.toastService.showSuccess('Cập nhật cài đặt thành công');
  }
}
