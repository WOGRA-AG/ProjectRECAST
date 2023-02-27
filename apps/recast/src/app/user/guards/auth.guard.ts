import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { from, map, Observable } from 'rxjs';
import { SupabaseService } from '../../services/supabase.service';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private readonly _supabaseClient: SupabaseClient = this.supabase.supabase;

  constructor(
    private readonly supabase: SupabaseService,
    private router: Router
  ) {}

  public canActivate():
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    return from(this._supabaseClient.auth.getSession()).pipe(
      map(({ data }) => {
        if (!data.session) {
          return this.router.createUrlTree(['/login']);
        }
        return true;
      })
    );
  }
}
