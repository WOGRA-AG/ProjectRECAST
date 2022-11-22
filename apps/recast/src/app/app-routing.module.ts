import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {AuthComponent} from './user/templates/auth/auth.component';
import {ProfileComponent} from './user/templates/profile/profile.component';
import {PageNotFoundComponent} from './templates/page-not-found/page-not-found.component';
import {AuthGuard} from './user/guards/auth.guard';
import { DemoComponent } from './design/demo/demo.component';
import { OverviewComponent } from './user/overview/overview.component';

const routes: Routes = [
  {
    path: 'login',
    component: AuthComponent,
  },
  {
    path: 'demo',
    component: DemoComponent,
  },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [AuthGuard],
  },
  {
    path: '',
    redirectTo: '/profile',
    pathMatch: 'full',
  },
  {
    path: 'overview',
    component: OverviewComponent,
    canActivate: [AuthGuard],
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
