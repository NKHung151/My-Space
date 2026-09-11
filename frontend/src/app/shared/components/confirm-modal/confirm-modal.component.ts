import { Component, inject } from '@angular/core';
import { ConfirmModalService } from '../../services/confirm-modal.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-modal.component.html',
  styleUrls: ['./confirm-modal.component.scss']
})
export class ConfirmModalComponent {
  public modalService = inject(ConfirmModalService);

  close(result: boolean): void {
    this.modalService.close(result);
  }
}
