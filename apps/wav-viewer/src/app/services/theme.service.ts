import { Injectable, effect, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private resolveInitialTheme(): 'dark' | 'light' {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  readonly theme = signal<'dark' | 'light'>(this.resolveInitialTheme());

  private readonly syncEffect = effect(() => {
    document.documentElement.setAttribute('data-theme', this.theme());
    localStorage.setItem('theme', this.theme());
  });

  readonly toggleFn = (): void => {
    this.theme.update(t => (t === 'dark' ? 'light' : 'dark'));
  };
}