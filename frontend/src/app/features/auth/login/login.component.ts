import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { CurrentUser } from '../../../core/auth/current-user.model';
import { getApiErrorMessage } from '../../../core/http/api-error.util';
import { ToastService } from '../../../core/notifications/toast.service';
import { AuthLayoutComponent } from '../../../layouts/auth-layout/auth-layout.component';

export function resolvePostLoginUrl(user: CurrentUser, returnUrl: string | null): string {
  if (user.role === 'admin') {
    return '/admin';
  }

  return returnUrl?.startsWith('/') && !returnUrl.startsWith('//')
    ? returnUrl
    : '/';
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, AuthLayoutComponent],
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastService = inject(ToastService);

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });
  isSubmitting = false;
  showPassword = false;
  errorMessage = '';
  returnUrl: string | null = null;

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.route.queryParams.subscribe(params => {
      const messages: Record<string, string> = {
        registered: 'Đăng ký thành công! Vui lòng đăng nhập.',
        passwordReset: 'Đặt lại mật khẩu thành công. Hãy đăng nhập bằng mật khẩu mới.'
      };

      for (const key of Object.keys(messages)) {
        if (params[key] === 'true') {
          this.toastService.showSuccess(messages[key]);
        }
      }
      // Trang Cài đặt chuyển tới đây sau khi đổi mật khẩu (trước đây tham số này bị bỏ qua)
      if (params['messageKey'] === 'password_updated_sign_in_again') {
        this.toastService.showSuccess('Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.');
      }
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.authService.login(this.loginForm.getRawValue()).pipe(
      finalize(() => this.isSubmitting = false),
    ).subscribe({
      next: response => {
        this.toastService.showSuccess('Đăng nhập thành công!');
        void this.router.navigateByUrl(resolvePostLoginUrl(response.user, this.returnUrl));
      },
      error: error => {
        this.errorMessage = getApiErrorMessage(error, 'Đăng nhập thất bại. Hãy kiểm tra thông tin và thử lại.', true);
      }
    });
  }
}
