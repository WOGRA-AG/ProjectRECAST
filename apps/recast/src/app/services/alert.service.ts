import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class AlertService {
  private readonly _duration: number = 2000;

  constructor(private matSnackBar: MatSnackBar) {}

  public reportError(
    msg: string,
    res: string = $localize`:@@err.dismiss:OK`
  ): void {
    this.matSnackBar.open(msg, res, {
      duration: this._duration,
    });
  }
}
