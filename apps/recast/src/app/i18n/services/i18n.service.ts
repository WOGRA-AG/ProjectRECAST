import { Inject, Injectable, LOCALE_ID } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class I18nService {
  constructor(@Inject(LOCALE_ID) private readonly locale: string) {}

  public setLocale(locale: string): void {
    localStorage.setItem('locale', locale);
    window.location.reload();
  }

  public getLocale(): string {
    return this.locale;
  }
}
