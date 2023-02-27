import { registerLocaleData } from '@angular/common';
import {
  APP_INITIALIZER,
  Injectable,
  InjectionToken,
  LOCALE_ID,
} from '@angular/core';
import { loadTranslations } from '@angular/localize';

@Injectable({
  providedIn: 'root',
})
class I18n {
  locale = 'de';

  public async setLocale(): Promise<void> {
    const userLocale = localStorage.getItem('locale');

    if (!userLocale) {
      localStorage.setItem('locale', this.locale);
    } else {
      this.locale = userLocale;
    }

    // Use web pack magic string to only include required locale data
    const localeModule = await import(
      /* webpackInclude: /(de|en|es)\.mjs$/ */
      `/node_modules/@angular/common/locales/${this.locale}.mjs`
    );

    // Set locale for built in pipes, etc.
    registerLocaleData(localeModule.default);

    // Load translation file
    const localeTranslationsModule = await import(
      `src/assets/i18n/${this.locale}.json`
    );

    // Load translations for the current locale at run-time
    loadTranslations(localeTranslationsModule.default);
  }
}

const setLocale = (): Config => ({
  provide: APP_INITIALIZER,
  useFactory: (i18n: I18n) => () => i18n.setLocale(),
  deps: [I18n],
  multi: true,
});

const setLocaleId = (): Config => ({
  provide: LOCALE_ID,
  useFactory: (i18n: I18n) => i18n.locale,
  deps: [I18n],
});

export const i18nModule = {
  setLocale,
  setLocaleId,
};

type Config = {
  provide: InjectionToken<string>;
  useFactory: (i18n: I18n) => any;
  deps: any[];
  multi?: boolean;
};
