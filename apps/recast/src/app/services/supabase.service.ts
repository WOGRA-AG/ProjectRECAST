import { Injectable } from '@angular/core';
import {
  AuthSession,
  createClient,
  Session,
  SupabaseClient,
} from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';
import {Subject} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  currentSession: AuthSession | null = null;
  session$: Subject<AuthSession | null> = new Subject<Session | null>();

  supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
    this.supabase.auth.onAuthStateChange((_, session) => {
      this.updateSession(session);
    });
  }

  get session() {
    this.supabase.auth.getSession().then(({ data }) => {
      this.updateSession(data.session);
    });
    return this.currentSession;
  }

  get client() {
    return this.supabase;
  }

  private updateSession(session: Session | null) {
    this.session$.next(session);
    this.currentSession = session;
  }
}
