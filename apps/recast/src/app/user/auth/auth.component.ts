import { Component } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import {Router} from '@angular/router';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
})
export class AuthComponent {
  loading = false;

  signInForm = this.formBuilder.group({
    email: '',
  });

  constructor(
    private readonly supabase: SupabaseService,
    private readonly formBuilder: FormBuilder,
  ) {
  }

  async onSubmit(): Promise<void> {
    try {
      this.loading = true;
      await this.supabase.signIn();
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
    } finally {
      this.signInForm.reset();
      this.loading = false;
    }
  }
}
