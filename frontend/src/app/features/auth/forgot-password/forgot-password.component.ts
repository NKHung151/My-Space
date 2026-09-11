import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthLayoutComponent } from '../../../layouts/auth-layout/auth-layout.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, AuthLayoutComponent],
  templateUrl: './forgot-password.component.html',

})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly forgotPasswordForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  isSubmitting = false;
  errorMessage = '';

  onSubmit(): void {
    const emailControl = this.forgotPasswordForm.controls.email;
    emailControl.setValue(emailControl.value.trim().toLowerCase());
    const email = emailControl.value;

    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.authService.forgotPassword(email).subscribe({
      next: () => {
        sessionStorage.setItem('password_reset_email', email);
        sessionStorage.setItem('password_reset_sent_at', Date.now().toString());
        void this.router.navigate(['/auth/reset-password']);
      },
      error: () => {
        this.isSubmitting = false;
        this.errorMessage = 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.';
      },
    });
  }
}
