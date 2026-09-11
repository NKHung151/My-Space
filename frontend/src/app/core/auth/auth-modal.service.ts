import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthModalService {
  private readonly isOpenSignal = signal<boolean>(false);
  private readonly redirectUrlSignal = signal<string>('');

  readonly isOpen = this.isOpenSignal.asReadonly();
  readonly redirectUrl = this.redirectUrlSignal.asReadonly();

  open(redirectUrl: string = ''): void {
    if (!redirectUrl) {
      redirectUrl = window.location.pathname + window.location.search + window.location.hash;
    }
    this.redirectUrlSignal.set(redirectUrl);
    this.isOpenSignal.set(true);
    document.body.classList.add('modal-open');
  }

  close(): void {
    this.isOpenSignal.set(false);
    this.redirectUrlSignal.set('');
    document.body.classList.remove('modal-open');
  }
}
