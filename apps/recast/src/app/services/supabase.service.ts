import { Injectable } from '@angular/core';
import {
  AuthSession,
  createClient,
  SupabaseClient,
} from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';
import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  map,
  Observable,
} from 'rxjs';
import { elementComparator } from '../shared/util/common-utils';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private readonly _supabase: SupabaseClient;
  private readonly _session$: BehaviorSubject<AuthSession | null> =
    new BehaviorSubject<AuthSession | null>(null);
  private readonly _providerToken$: BehaviorSubject<string> =
    new BehaviorSubject<string>('');
  private readonly _providerRefreshToken$: BehaviorSubject<string> =
    new BehaviorSubject<string>('');

  constructor() {
    this._supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
    this.supabase.auth.getSession().then(({ data }) => {
      this.updateSession(data.session);
    });
    this.supabase.auth.onAuthStateChange((_, session) =>
      this.updateSession(session)
    );
  }

  get session$(): Observable<AuthSession | null> {
    return this._session$;
  }

  get currentSession$(): Observable<AuthSession> {
    return this._session$.pipe(
      filter(session => !!session),
      map(session => session!),
      distinctUntilChanged(elementComparator)
    );
  }

  get supabase(): SupabaseClient {
    return this._supabase;
  }

  get provider_token$(): Observable<string> {
    return this._providerToken$.pipe(filter(token => !!token));
  }

  get provider_token(): string {
    return this._providerToken$.getValue();
  }

  get provider_refresh_token(): string {
    return this._providerRefreshToken$.getValue();
  }

  private updateSession(session: AuthSession | null): void {
    if (session?.provider_token && session.provider_refresh_token) {
      const kcData = {
        providerToken: session.provider_token,
        providerRefreshToken: session.provider_refresh_token,
      };
      localStorage.setItem('kc', JSON.stringify(kcData));
      this._providerToken$.next(session.provider_token);
      this._providerRefreshToken$.next(session.provider_refresh_token);
    } else {
      const storageToken = localStorage.getItem('kc');
      if (storageToken) {
        const jsonToken = JSON.parse(storageToken);
        this._providerToken$.next(jsonToken.providerToken);
        this._providerRefreshToken$.next(jsonToken.providerRefreshToken);
      }
    }
    this._session$.next(session);
  }
}

export enum Tables {
  processes = 'processes',
  steps = 'steps',
  stepProperties = 'step_properties',
  elements = 'elements',
  elementProperties = 'element_properties',
  profiles = 'profiles',
  values = 'values',
}
