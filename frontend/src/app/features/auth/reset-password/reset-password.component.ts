import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { AuthLayoutComponent } from '../../../layouts/auth-layout/auth-layout.component';

import { strongPasswordValidator } from '../../../shared/validators/password.validator';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, AuthLayoutComponent],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  private readonly resendCooldownSeconds = 60;
  private timerId?: number;

  readonly resetPasswordForm = this.fb.nonNullable.group({
    email: [sessionStorage.getItem('password_reset_email') ?? '', [Validators.required, Validators.email]],
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    newPassword: ['', [Validators.required, strongPasswordValidator]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: this.passwordsMatch });

  isSubmitting = false;
  isResending = false;
  showPassword = false;
  showConfirmPassword = false;
  errorMessage = '';
  resendSecondsRemaining = this.getInitialCooldown();

  constructor() {
    this.startCooldownTimer();
  }

  ngOnDestroy(): void {
    if (this.timerId !== undefined) {
      window.clearInterval(this.timerId);
    }
  }

  togglePasswordVisibility(field: 'password' | 'confirm'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  resendCode(): void {
    const emailControl = this.resetPasswordForm.controls.email;
    emailControl.setValue(emailControl.value.trim().toLowerCase());
    const email = emailControl.value;
    emailControl.markAsTouched();

    if (emailControl.invalid || this.resendSecondsRemaining > 0 || this.isResending) {
      return;
    }

    this.isResending = true;
    this.errorMessage = '';

    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.isResending = false;
        sessionStorage.setItem('password_reset_email', email);
        sessionStorage.setItem('password_reset_sent_at', Date.now().toString());
        this.resendSecondsRemaining = this.resendCooldownSeconds;
        this.startCooldownTimer();
        this.toastService.showSuccess('Đã yêu cầu mã đặt lại mới. Hãy kiểm tra hộp thư của bạn.');
      },
      error: () => {
        this.isResending = false;
        this.errorMessage = 'Không thể gửi lại mã. Vui lòng thử lại.';
      },
    });
  }

  onSubmit(): void {
    const emailControl = this.resetPasswordForm.controls.email;
    emailControl.setValue(emailControl.value.trim().toLowerCase());

    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    const value = this.resetPasswordForm.getRawValue();
    this.isSubmitting = true;
    this.errorMessage = '';

    this.authService.resetPassword({
      email: value.email,
      otp: value.otp,
      newPassword: value.newPassword,
    }).subscribe({
      next: () => {
        sessionStorage.removeItem('password_reset_email');
        sessionStorage.removeItem('password_reset_sent_at');
        void this.router.navigate(['/auth/login'], {
          queryParams: { passwordReset: 'true' },
        });
      },
      error: () => {
        this.isSubmitting = false;
        this.errorMessage = 'Mã đặt lại không hợp lệ hoặc đã hết hạn. Hãy yêu cầu mã mới.';
      },
    });
  }

  private passwordsMatch(group: AbstractControl): ValidationErrors | null {
    return group.get('newPassword')?.value === group.get('confirmPassword')?.value
      ? null
      : { passwordMismatch: true };
  }

  private getInitialCooldown(): number {
    const sentAt = Number(sessionStorage.getItem('password_reset_sent_at'));
    if (!Number.isFinite(sentAt) || sentAt <= 0) {
      return 0;
    }

    const elapsedSeconds = Math.floor((Date.now() - sentAt) / 1000);
    return Math.max(0, this.resendCooldownSeconds - elapsedSeconds);
  }

  private startCooldownTimer(): void {
    if (this.timerId !== undefined) {
      window.clearInterval(this.timerId);
    }

    if (this.resendSecondsRemaining <= 0) {
      return;
    }

    this.timerId = window.setInterval(() => {
      this.resendSecondsRemaining = Math.max(0, this.resendSecondsRemaining - 1);
      if (this.resendSecondsRemaining === 0 && this.timerId !== undefined) {
        window.clearInterval(this.timerId);
        this.timerId = undefined;
      }
    }, 1000);
  }
}
