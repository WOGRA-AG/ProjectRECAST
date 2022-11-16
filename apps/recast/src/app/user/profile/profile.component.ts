import { Component } from '@angular/core';
import { FormBuilder } from '@angular/forms';
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
    id: '',
    email: '',
    username: '',
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
  }

  async updateProfile(): Promise<void> {
    if (!this.session) {
      return;
    }
    try {
      this.loading = true;
      const user = this.session.user;

      const username = this.updateProfileForm.value.username as string;
      const email = this.updateProfileForm.value.email as string;
      const avatarUrl = this.updateProfileForm.value.avatarUrl as string;

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
