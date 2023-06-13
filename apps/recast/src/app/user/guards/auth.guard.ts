import { inject } from '@angular/core';
import { from, map, Observable, take } from 'rxjs';
import { SupabaseService } from '../../services/supabase.service';
import { UserFacadeService } from '../services/user-facade.service';
import { UrlTree } from '@angular/router';

export const authGuard = ():
  | Observable<boolean | UrlTree>
  | Promise<boolean | UrlTree>
  | boolean
  | UrlTree => {
  const supabaseService = inject(SupabaseService);
  const userService = inject(UserFacadeService);
  return from(supabaseService.supabase.auth.getSession()).pipe(
    take(1),
    map(({ data }) => {
      if (!data.session) {
        userService.signIn().pipe(
          take(1),
          map(err => !err)
        );
      }
      return true;
    })
  );
};
