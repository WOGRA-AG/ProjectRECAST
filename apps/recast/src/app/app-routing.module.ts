import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {AuthComponent} from './user/templates/auth/auth.component';
import {ProfileComponent} from './user/templates/profile/profile.component';
import {PageNotFoundComponent} from './templates/page-not-found/page-not-found.component';
import {AuthGuard} from './user/guards/auth.guard';
import { DemoComponent } from './design/demo/demo.component';
import { OverviewComponent } from './templates/overview/overview.component';
import { ProcessOverviewComponent } from './templates/process-overview/process-overview.component';
import {SingleFileUploadComponent} from './design/components/organisms/single-file-upload/single-file-upload.component';
import {UploadNewProcessComponent} from './templates/upload-new-process/upload-new-process.component';

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
    redirectTo: '/overview',
    pathMatch: 'full',
  },
  {
    path: 'overview',
    component: OverviewComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'process-overview',
    component: ProcessOverviewComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'process',
    component: UploadNewProcessComponent,
    canActivate: [AuthGuard],
  },
  {
    path: '**',
    component: PageNotFoundComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes), RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
