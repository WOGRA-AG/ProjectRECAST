import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProfileComponent } from './user/templates/profile/profile.component';
import { PageNotFoundComponent } from './templates/page-not-found/page-not-found.component';
import { authGuard } from './user/guards/auth.guard';
import { OverviewComponent } from './templates/overview/overview.component';
import { ProcessOverviewComponent } from './templates/process-overview/process-overview.component';
import { UploadNewProcessComponent } from './templates/upload-new-process/upload-new-process.component';
import { CreateElementComponent } from './templates/create-element/create-element.component';
import { ElementDetailComponent } from './templates/element-detail/element-detail.component';

const routes: Routes = [
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [authGuard],
  },
  {
    path: '',
    redirectTo: '/overview',
    pathMatch: 'full',
  },
  {
    path: 'overview',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        component: OverviewComponent,
      },
      {
        path: 'process',
        children: [
          {
            path: '',
            component: UploadNewProcessComponent,
          },
          {
            path: ':processId',
            children: [
              {
                path: '',
                component: ProcessOverviewComponent,
              },
              {
                path: 'element',
                children: [
                  {
                    path: '',
                    component: CreateElementComponent,
                  },
                  {
                    path: ':elementId',
                    component: ElementDetailComponent,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '**',
    component: PageNotFoundComponent,
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes), RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
