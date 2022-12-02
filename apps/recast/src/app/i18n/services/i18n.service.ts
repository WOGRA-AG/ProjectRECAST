import { Inject, Injectable, LOCALE_ID } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class I18nService {

  constructor(
    @Inject(LOCALE_ID) private readonly locale: string,
  ) {
  }

  setLocale(locale: string) {
    localStorage.setItem('locale', locale);
    window.location.reload();
  }

  getLocale(): string {
    return this.locale;
  }
}
