import { RouterLink } from '@angular/router';
import { Component, HostListener, inject } from '@angular/core';
import { AuthModalService } from '../../../../core/auth/auth-modal.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './auth-modal.component.html',
  styleUrls: ['./auth-modal.component.scss']
})
export class AuthModalComponent {
  readonly modalService = inject(AuthModalService);

  close(): void {
    this.modalService.close();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.modalService.isOpen()) {
      this.close();
    }
  }
}
