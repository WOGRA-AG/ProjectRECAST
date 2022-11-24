import {Component} from '@angular/core';
import {FormBuilder, FormControl, Validators} from '@angular/forms';
import {Profile} from '../../../../../build/openapi/recast';
import {UserFacadeService} from '../../services/user-facade.service';
import {catchError, filter, of} from 'rxjs';

@Component({
  selector: 'app-account',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent {
  loading = false;
  profile!: Profile;

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
    private formBuilder: FormBuilder,
    private readonly userService: UserFacadeService,
  ) {
    userService.currentProfile$.subscribe(value => {
      this.updateProfileForm.patchValue(value);
      this.profile = value;
    });
    this.updateProfileForm.valueChanges.pipe(
      filter(() => !!this.profile)
    ).subscribe(values => {
      this.profile.username = values.username || this.profile.username;
      this.profile.id = values.id || this.profile.id;
      this.profile.email = values.email || this.profile.email;
      this.profile.avatarUrl = values.avatarUrl || this.profile.avatarUrl;
    });
  }

  updateProfile(): void {
      this.loading = true;
      const username = this.profile.username;
      const email = this.profile.email;
      const avatarUrl = this.profile.avatarUrl;
      const id = this.profile.id;
      this.userService.saveProfile({
        id,
        username,
        email,
        avatarUrl,
      }).pipe(
        catchError(err => {
          if (err instanceof Error) {
            alert(err.message);
          }
          return of({})
        })
      ).subscribe(() => {
        this.loading = false;
      });
  }

  signOut() {
    this.userService.signOut().subscribe(err => {
      if (err) {
        alert(err.message);
      }
    });
  }
}
