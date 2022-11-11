import { Injectable } from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree} from '@angular/router';
import { Observable } from 'rxjs';
import {SupabaseService} from '../../services/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  session = this.supabase.session

  constructor(private readonly supabase: SupabaseService, private router: Router) {
    console.log('auth constructor');
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    if (!this.supabase.session) {
      console.log('auth activate');
      this.router.navigate(['login']);
      return false;
    }
    return true;
  }

}
