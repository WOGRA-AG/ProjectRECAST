import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {AuthComponent} from './user/auth/auth.component';
import {AccountComponent} from './user/account/account.component';
import {PageNotFoundComponent} from './templates/page-not-found/page-not-found.component';

const routes: Routes = [
  {
    path: 'login',
    component: AuthComponent,
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'profile',
    component: AccountComponent,
    runGuardsAndResolvers: 'always',
  },
  {
    path: '',
    redirectTo: '/profile',
    pathMatch: 'full',
  },
  {
    path: '**',
    component: PageNotFoundComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
