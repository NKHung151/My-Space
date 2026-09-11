import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfirmModalService {
  private readonly isOpenSignal = signal<boolean>(false);
  private resolveFn: ((result: boolean) => void) | null = null;

  readonly isOpen = this.isOpenSignal.asReadonly();

  open(): Promise<boolean> {
    this.isOpenSignal.set(true);
    document.body.classList.add('modal-open');
    return new Promise(resolve => {
      this.resolveFn = resolve;
    });
  }

  close(result: boolean): void {
    this.isOpenSignal.set(false);
    document.body.classList.remove('modal-open');
    if (this.resolveFn) {
      this.resolveFn(result);
      this.resolveFn = null;
    }
  }
}
