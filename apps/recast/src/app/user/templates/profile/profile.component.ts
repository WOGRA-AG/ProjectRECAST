import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { Profile } from '../../../../../build/openapi/recast';
import { UserFacadeService } from '../../services/user-facade.service';
import { catchError, filter, of, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-account',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnDestroy {
  loading = false;
  profile!: Profile;
  readonly _minlength = 3;

  updateProfileForm = this.formBuilder.group({
    id: new FormControl({ value: '', disabled: true }),
    email: new FormControl({ value: '', disabled: true }),
    username: new FormControl('', [
      Validators.minLength(this._minlength),
      Validators.required,
    ]),
    avatarUrl: '',
  });

  private readonly _destroy$: Subject<void> = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private readonly userService: UserFacadeService
  ) {
    userService.currentProfile$
      .pipe(takeUntil(this._destroy$))
      .subscribe(value => {
        this.updateProfileForm.patchValue(value);
        this.profile = value;
      });
    this.updateProfileForm.valueChanges
      .pipe(
        filter(() => !!this.profile),
        takeUntil(this._destroy$)
      )
      .subscribe(values => {
        this.profile.username = values.username || this.profile.username;
        this.profile.id = values.id || this.profile.id;
        this.profile.email = values.email || this.profile.email;
        this.profile.avatarUrl = values.avatarUrl || this.profile.avatarUrl;
      });
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  public updateProfile(): void {
    this.loading = true;
    const username = this.profile.username;
    const email = this.profile.email;
    const avatarUrl = this.profile.avatarUrl;
    const id = this.profile.id;
    this.userService
      .saveProfile({
        id,
        username,
        email,
        avatarUrl,
      })
      .pipe(
        catchError(err => {
          if (err instanceof Error) {
            alert(err.message);
          }
          return of({});
        }),
        takeUntil(this._destroy$)
      )
      .subscribe(() => {
        this.loading = false;
      });
  }

  public signOut(): void {
    this.userService
      .signOut()
      .pipe(takeUntil(this._destroy$))
      .subscribe(err => {
        if (err) {
          alert(err.message);
        }
      });
  }
}
