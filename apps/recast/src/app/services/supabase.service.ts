import { Injectable } from '@angular/core';
import {
  AuthSession,
  createClient,
  SupabaseClient,
} from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';
import { BehaviorSubject, filter, map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private readonly _supabase: SupabaseClient;
  private readonly _session$: BehaviorSubject<AuthSession | null> =
    new BehaviorSubject<AuthSession | null>(null);

  constructor() {
    this._supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
    this.supabase.auth
      .getSession()
      .then(({ data }) => this.updateSession(data.session));
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
      map(session => session!)
    );
  }

  get supabase(): SupabaseClient {
    return this._supabase;
  }

  private updateSession(session: AuthSession | null): void {
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
}
