import {Component} from '@angular/core';
import {FormBuilder, FormControl, Validators} from '@angular/forms';
import {SupabaseService } from '../../services/supabase.service';
import {Profile} from '../../../../build/openapi/recast';
import {AuthSession} from '@supabase/supabase-js';

@Component({
  selector: 'app-account',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent {
  loading = false;
  profile!: Profile;

  session: AuthSession | null = this.supabase.session;

  updateProfileForm = this.formBuilder.group({
    id: new FormControl({value: '', disabled: true}),
    email: new FormControl({value: '', disabled: true}),
    username: new FormControl(
      '',
      [Validators.minLength(3), Validators.required]
    ),
    avatarUrl: '',
  });

  constructor(
    private readonly supabase: SupabaseService,
    private formBuilder: FormBuilder
  ) {
    supabase.profile$.subscribe(value => {
      this.profile = value;
      this.updateProfileForm.patchValue(this.profile);
    });
    supabase.session$.subscribe(value => {
      if (value){
        this.session = value as AuthSession;
      }
    });
    this.updateProfileForm.valueChanges.subscribe(values => {
      this.profile.username = values.username || this.profile.username;
      this.profile.id = values.id || this.profile.id;
      this.profile.email = values.email || this.profile.email;
      this.profile.avatarUrl = values.avatarUrl || this.profile.avatarUrl;
    });
  }

  async updateProfile(): Promise<void> {
    if (!this.session) {
      return;
    }
    try {
      this.loading = true;
      const user = this.session.user;

      const username = this.profile.username;
      const email = this.profile.email;
      const avatarUrl = this.profile.avatarUrl;

      await this.supabase.saveProfile({
        id: user.id,
        username,
        email,
        avatarUrl,
      });
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
    } finally {
      this.loading = false;
    }
  }

  async signOut() {
    await this.supabase.signOut();
  }
}
