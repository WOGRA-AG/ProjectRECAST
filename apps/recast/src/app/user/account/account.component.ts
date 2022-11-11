import { Component, OnInit } from '@angular/core'
import { FormBuilder } from '@angular/forms'
import {SupabaseService } from '../../services/supabase.service'
import {Profile} from '../../../../build/openapi/recast';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss'],
})
export class AccountComponent implements OnInit {
  loading = false
  profile!: Profile

  session = this.supabase.session

  updateProfileForm = this.formBuilder.group({
    id: '',
    email: '',
    username: '',
    avatarUrl: '',
  })

  constructor(
    private readonly supabase: SupabaseService,
    private formBuilder: FormBuilder
  ) {
    supabase.profile$.subscribe(value => {
      this.profile = value;
      this.updateProfileForm.patchValue(this.profile);
    });
  }

  async ngOnInit(): Promise<void> {
    await this.getProfile()

    const { id, username, email, avatarUrl } = this.profile
    this.updateProfileForm.patchValue({
      id,
      username,
      email,
      avatarUrl,
    })
  }

  async getProfile() {
    if (!this.session) {
      return;
    }
    try {
      this.loading = true
      const { user } = this.session
      let { data: profile, error, status } = await this.supabase.profile(user)

      if (error && status !== 406) {
        throw error
      }

      if (profile) {
        this.profile = profile
      }
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message)
      }
    } finally {
      this.loading = false
    }
  }

  async updateProfile(): Promise<void> {
    if (!this.session) {
      return;
    }
    try {
      this.loading = true
      const { user } = this.session

      const username = this.updateProfileForm.value.username as string
      const email = this.updateProfileForm.value.email as string
      const avatarUrl = this.updateProfileForm.value.avatarUrl as string

      const { error } = await this.supabase.updateProfile({
        id: user.id,
        username,
        email,
        avatarUrl,
      })
      if (error) throw error
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message)
      }
    } finally {
      this.loading = false
    }
  }

  async signOut() {
    await this.supabase.signOut()
  }
}
