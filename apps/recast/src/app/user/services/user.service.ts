import { Injectable } from '@angular/core';
import {SupabaseService} from '../../services/supabase.service';
import {AuthSession, Session, SupabaseClient} from '@supabase/supabase-js';
import {BehaviorSubject} from 'rxjs';
import {Profile} from '../../../../build/openapi/recast';
const snakeCase = require('snakecase-keys');

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private supabaseClient: SupabaseClient;
  private session: AuthSession | null = this.supabase.session;
  profile$: BehaviorSubject<Profile> = new BehaviorSubject<Profile>({id: '', username: '', email: '', avatarUrl: ''});

  constructor(private supabase: SupabaseService) {
    supabase.session$.subscribe(session => {
      this.session = session as AuthSession;
      this.updateProfile(this.session);
    });
    this.supabaseClient = this.supabase.client;
    this.supabaseClient.channel('profiles-changes')
    .on(
      'postgres_changes',
      {event: 'UPDATE', schema: 'public', table: 'profiles'},
      payload => {
        console.log('got profile ', payload.new);
        this.profile$.next(payload.new as Profile);
      }
    )
    .subscribe();
  }

  async saveProfile(profile: Profile): Promise<void> {
    const update = {
      ...profile,
      updatedAt: new Date(),
    };

    await this.supabaseClient.from('profiles').upsert(snakeCase(update));
  }

  private async profile(): Promise<Profile> {
    const { data: profile, error, status } = await this.supabaseClient
      .from('profiles')
      .select(`id, username, email, avatar_url`)
      .single();
    if (error && status !== 406) {
      throw error;
    }
    return profile as Profile;
  }

  private updateProfile(session: Session | null) {
    if (session) {
      this.profile().then(profile => {
        this.profile$.next(profile as Profile);
      });
    }
  }

  async downLoadImage(path: string): Promise<Blob> {
    const {data, error} = await this.supabaseClient.storage.from('avatars').download(path);
    if (error) {
      alert(error);
      throw error;
    }
    return data;
  }

  async uploadAvatar(filePath: string, file: File): Promise<void> {
    try {
      await this.supabaseClient.storage.from('avatars').upload(filePath, file);
    } catch (err) {
      alert(err);
    }
  }

  signIn() {
    return this.supabaseClient.auth.signInWithOAuth({
      provider: 'keycloak', options: {redirectTo: window.location.origin}
    });
  }

  async signOut() {
    await this.supabaseClient.auth.signOut();
    window.location.href = 'https://login.os4ml.wogra.com/logout';
  }
}
