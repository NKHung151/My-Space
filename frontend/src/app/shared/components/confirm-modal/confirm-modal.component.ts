import { Component, HostListener, inject } from '@angular/core';
import { ConfirmModalService } from '../../services/confirm-modal.service';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  templateUrl: './confirm-modal.component.html',
  styleUrls: ['./confirm-modal.component.scss']
})
export class ConfirmModalComponent {
  readonly modalService = inject(ConfirmModalService);

  close(result: boolean): void {
    this.modalService.close(result);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modalService.options()) this.close(false);
  }
}
