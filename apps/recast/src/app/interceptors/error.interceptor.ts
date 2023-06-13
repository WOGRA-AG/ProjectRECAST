import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from '@angular/common/http';
import {
  catchError,
  delay,
  Observable,
  ObservableInput,
  of,
  retry,
  throwError,
} from 'rxjs';
import { Router } from '@angular/router';

export const maxRetries = 3;
export const delayMS = 1000;

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private readonly router: Router) {}
  public intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      retry({ delay: this.delay$ }),
      catchError(err => {
        const errorMsg: string = this.getErrorMsg(err);
        this.handleErrorResponse(err);
        return throwError(() => errorMsg);
      })
    );
  }

  private getErrorMsg(err: any): string {
    return err.error?.message || err.statusText;
  }

  private handleErrorResponse(err: any): void {
    if (err.status === 401 || err.status === 403) {
      this.router.navigate(['/overview']);
    } else if (err.status >= 400 && err.status <= 499) {
      alert(this.getErrorMsg(err));
    }
  }

  private delay$ = (error: any, retryCount: number): ObservableInput<any> => {
    if (retryCount < maxRetries && error.status === 500) {
      return of(error).pipe(delay(delayMS));
    }
    throw error;
  };
}
