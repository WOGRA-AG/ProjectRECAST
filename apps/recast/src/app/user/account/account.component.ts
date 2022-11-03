import { Component, Input, OnInit } from '@angular/core'
import { FormBuilder } from '@angular/forms'
import { AuthSession } from '@supabase/supabase-js'
import { Profile, SupabaseService } from '../../services/supabase.service'

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss'],
})
export class AccountComponent implements OnInit {
  loading = false
  profile!: Profile

  @Input()
  session!: AuthSession

  updateProfileForm = this.formBuilder.group({
    username: '',
    website: '',
    avatar_url: '',
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

    const { username, website, avatar_url } = this.profile
    this.updateProfileForm.patchValue({
      username,
      website,
      avatar_url,
    })
  }

  async getProfile() {
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
    try {
      this.loading = true
      const { user } = this.session

      const username = this.updateProfileForm.value.username as string
      const website = this.updateProfileForm.value.website as string
      const avatar_url = this.updateProfileForm.value.avatar_url as string

      const { error } = await this.supabase.updateProfile({
        id: user.id,
        username,
        website,
        avatar_url,
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
