import { Injectable } from '@angular/core';
import {
  AuthSession,
  createClient,
  Session,
  SupabaseClient,
} from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';
import {BehaviorSubject, Subject} from 'rxjs';
import {Profile} from '../../../build/openapi/recast';
const snakeCase = require('snakecase-keys');

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  currentSession: AuthSession | null = null;
  session$: Subject<AuthSession | null> = new Subject<Session | null>();
  profile$: BehaviorSubject<Profile> = new BehaviorSubject<Profile>({id: '', username: '', email: '', avatarUrl: ''});

  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
    this.supabase.channel('profile-changes')
    .on(
      'postgres_changes',
      {event: 'UPDATE', schema: 'public', table: 'profiles'},
      payload => {
        this.profile$.next(payload.new as Profile);
        }
    )
      .subscribe();
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

  signIn() {
    return this.supabase.auth.signInWithOAuth({ provider: 'keycloak' });
  }

  async signOut() {
    await this.supabase.auth.signOut();
    window.location.href = 'https://login.os4ml.wogra.com/logout';
  }

  async saveProfile(profile: Profile): Promise<void> {
    const update = {
      ...profile,
      updatedAt: new Date(),
    };

    await this.supabase.from('profiles').upsert(snakeCase(update));
  }

  async downLoadImage(path: string): Promise<Blob> {
    const {data, error} = await this.supabase.storage.from('avatars').download(path);
    if (error) {
      alert(error);
      throw error;
    }
    return data;
  }

  async uploadAvatar(filePath: string, file: File): Promise<void> {
    try {
      await this.supabase.storage.from('avatars').upload(filePath, file);
    } catch (err) {
      alert(err);
    }
  }

  private async profile(): Promise<Profile> {
    const { data: profile, error, status } = await this.supabase
      .from('profiles')
      .select(`id, username, email, avatar_url`)
      .single();
    if (error && status !== 406) {
      throw error;
    }
    return profile as Profile;
  }

  private updateSession(session: Session | null) {
    this.session$.next(session);
    this.currentSession = session;
    if (session) {
      this.profile().then(profile => {
        this.profile$.next(profile as Profile);
      });
    }
  }
}
