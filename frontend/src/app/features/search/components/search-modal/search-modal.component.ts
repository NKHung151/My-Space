import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, catchError, of, map } from 'rxjs';

import { User } from '../../../users/models/user.model';
import { UsersService } from '../../../users/services/users.service';
import { SearchModalService } from '../../services/search-modal.service';
import { AuthorTooltipComponent } from '../../../users/components/author-tooltip/author-tooltip.component';
import { AssetImageDirective } from '../../../../shared/directives/asset-image.directive';

@Component({
  selector: 'app-search-modal',
  standalone: true,
  imports: [CommonModule, AuthorTooltipComponent, AssetImageDirective],
  templateUrl: './search-modal.component.html',
  styleUrl: './search-modal.component.scss',
})
export class SearchModalComponent {
  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

  readonly modalService = inject(SearchModalService);
  private readonly userService = inject(UsersService);

  private readonly router = inject(Router);

  readonly query = signal('');

  readonly results = signal<User[]>([]);

  readonly searching = signal(false);

  readonly trendingAuthors = signal<User[]>([]);




  readonly hasQuery = computed(() => this.query().trim().length > 0);

  private readonly queryInput$ = new Subject<string>();

  private trendingLoaded = false;

  constructor() {
    this.queryInput$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          if (!q.trim()) {
            this.searching.set(false);
            return [];
          }
          this.searching.set(true);
          return this.userService.getRecommended(q, 5).pipe(
            map(res => res.items),
            catchError(() => {
              this.searching.set(false);
              return of([]);
            })
          );
        }),
      )
      .subscribe((users) => {
        this.searching.set(false);
        this.results.set(users);
      });

    effect(() => {
      if (this.modalService.isOpen()) {
        setTimeout(() => this.searchInputRef?.nativeElement.focus(), 0);
        if (!this.trendingLoaded) this.loadTrending();
      } else {
        this.query.set('');
        this.results.set([]);
      }
    }, { allowSignalWrites: true });
  }

  private loadTrending() {
    this.trendingLoaded = true;

    this.userService.getRecommended(undefined, 6).subscribe((res) => {
      this.trendingAuthors.set(res.items);
    });
  }

  onInput(value: string) {
    this.query.set(value);
    this.queryInput$.next(value);
  }

  clear() {
    this.query.set('');
    this.results.set([]);
  }

  close() {
    this.modalService.close();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.modalService.isOpen()) this.close();
  }

  goToAuthor(userId: string | number) {
    this.close();
    this.router.navigate(['/profile', userId]);
  }

  onEnter() {
    if (!this.hasQuery()) return;
    this.close();
    this.router.navigate(['/explore'], { queryParams: { query: this.query() } });
  }
}
