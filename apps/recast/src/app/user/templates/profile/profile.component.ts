import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { Profile, StorageBackend } from '../../../../../build/openapi/recast';
import { UserFacadeService } from '../../services/user-facade.service';
import { catchError, filter, of, Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';

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
    shepardApiKey: new FormControl('', [Validators.minLength(this._minlength)]),
    shepardUrl: new FormControl('', [Validators.minLength(this._minlength)]),
    storageBackend: new FormControl(StorageBackend.Supabase, [
      Validators.required,
    ]),
  });

  protected readonly StorageBackendEnum = StorageBackend;
  private readonly _destroy$: Subject<void> = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private readonly userService: UserFacadeService,
    private readonly router: Router
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
        this.profile.shepardApiKey =
          values.shepardApiKey || this.profile.shepardApiKey;
        this.profile.shepardUrl = values.shepardUrl || this.profile.shepardUrl;
        this.profile.storageBackend =
          values.storageBackend || this.profile.storageBackend;
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
    const shepardApiKey = this.profile.shepardApiKey;
    const shepardUrl = this.profile.shepardUrl;
    const storageBackend = this.profile.storageBackend;
    this.userService
      .saveProfile({
        id,
        username,
        email,
        avatarUrl,
        shepardApiKey,
        shepardUrl,
        storageBackend,
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
        this.router.navigate(['']);
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
