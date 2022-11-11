import { Injectable } from '@angular/core'
import {
  AuthChangeEvent,
  AuthSession,
  createClient,
  Session,
  SupabaseClient,
  User,
} from '@supabase/supabase-js'
import { environment } from 'src/environments/environment'
import {BehaviorSubject} from 'rxjs';
import {Profile} from '../../../build/openapi/recast';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient
  _session: AuthSession | null = null
  profile$: BehaviorSubject<Profile> = new BehaviorSubject<Profile>({id: '', username: '', email: '', avatarUrl: ''})

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    )
    this.supabase.channel('profile-changes')
    .on('postgres_changes', {event: 'UPDATE', schema: 'public', table: 'profiles'}, payload => {
      this.profile$.next(payload.new as Profile);
    })
      .subscribe();
  }

  get session() {
    this.supabase.auth.getSession().then(({ data }) => {
      this._session = data.session
    })
    return this._session
  }

  profile(user: User) {
    return this.supabase
      .from('profiles')
      .select(`id, username, email, avatar_url`)
      .eq('id', user.id)
      .single()
  }

  authChanges(
    callback: (event: AuthChangeEvent, session: Session | null) => void
  ) {
    return this.supabase.auth.onAuthStateChange(callback)
  }

  signIn() {
    return this.supabase.auth.signInWithOAuth({ provider: 'keycloak' })
  }

  signOut() {
    this.supabase.auth.signOut()
    window.location.href = 'https://login.os4ml.wogra.com/logout'
  }

  updateProfile(profile: Profile) {
    const update = {
      ...profile,
      updated_at: new Date(),
    }

    return this.supabase.from('profiles').upsert(update)
  }

  downLoadImage(path: string) {
    return this.supabase.storage.from('avatars').download(path)
  }

  uploadAvatar(filePath: string, file: File) {
    return this.supabase.storage.from('avatars').upload(filePath, file)
  }
}
