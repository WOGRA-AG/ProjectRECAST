import { Component, OnDestroy } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { UserFacadeService } from '../../services/user-facade.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
})
export class AuthComponent implements OnDestroy {
  loading = false;

  signInForm = this.formBuilder.group({
    email: '',
  });
  private readonly _destroy$: Subject<void> = new Subject<void>();

  constructor(
    private readonly userService: UserFacadeService,
    private readonly formBuilder: FormBuilder
  ) {}

  public ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  public onSubmit(): void {
    this.loading = true;
    this.userService
      .signIn()
      .pipe(takeUntil(this._destroy$))
      .subscribe(err => {
        if (err) {
          alert(err.message);
        }
        this.signInForm.reset();
        this.loading = false;
      });
  }
}
