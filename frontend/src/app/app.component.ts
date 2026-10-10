import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';

import { SearchModalComponent } from './features/search/components/search-modal/search-modal.component';
import { AuthModalComponent } from './features/auth/components/auth-modal/auth-modal.component';
import { ConfirmModalComponent } from './shared/components/confirm-modal/confirm-modal.component';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, SearchModalComponent, AuthModalComponent, ConfirmModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})

export class AppComponent {}
