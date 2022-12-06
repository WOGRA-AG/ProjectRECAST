import { Component } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { UserFacadeService } from '../../services/user-facade.service';

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
    private readonly userService: UserFacadeService,
    private readonly formBuilder: FormBuilder
  ) {}

  onSubmit(): void {
    this.loading = true;
    this.userService.signIn().subscribe(err => {
      if (err) {
        alert(err.message);
      }
      this.signInForm.reset();
      this.loading = false;
    });
  }
}
