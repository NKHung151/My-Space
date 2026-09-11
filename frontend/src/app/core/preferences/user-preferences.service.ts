import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import {
  UserPreferenceKey,
  UserPreferences,
} from './user-preferences.model';

const STORAGE_KEY = 'lingora-user-preferences';
const DEFAULT_PREFERENCES: UserPreferences = {
  compactView: false,
  autoPlayMedia: true,
};

@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);
  private readonly preferencesSignal = signal<UserPreferences>(this.restore());

  readonly preferences = this.preferencesSignal.asReadonly();

  update(key: UserPreferenceKey, value: boolean): void {
    const preferences = { ...this.preferencesSignal(), [key]: value };
    this.preferencesSignal.set(preferences);

    if (this.browser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    }
  }

  private restore(): UserPreferences {
    if (!this.browser) {
      return DEFAULT_PREFERENCES;
    }

    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<UserPreferences>;
      return {
        compactView: this.booleanOrDefault(saved.compactView, DEFAULT_PREFERENCES.compactView),
        autoPlayMedia: this.booleanOrDefault(saved.autoPlayMedia, DEFAULT_PREFERENCES.autoPlayMedia),
      };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  }

  private booleanOrDefault(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
  }
}
