import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'loading';
  title?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<ToastMessage>();
  toastState$ = this.toastSubject.asObservable();

  show(message: string, type: 'success' | 'error' = 'error', title?: string) {
    this.toastSubject.next({ message, type, title });
  }

  showSuccess(message: string, title?: string) {
    this.toastSubject.next({ message, type: 'success', title });
  }

  showError(message: string, title?: string) {
    this.toastSubject.next({ message, type: 'error', title });
  }

  showLoading(message: string, title?: string) {
    this.toastSubject.next({ message, type: 'loading', title });
  }
}
