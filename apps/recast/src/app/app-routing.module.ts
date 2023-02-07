import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthComponent } from './user/templates/auth/auth.component';
import { ProfileComponent } from './user/templates/profile/profile.component';
import { PageNotFoundComponent } from './templates/page-not-found/page-not-found.component';
import { AuthGuard } from './user/guards/auth.guard';
import { OverviewComponent } from './templates/overview/overview.component';
import { ProcessOverviewComponent } from './templates/process-overview/process-overview.component';
import { UploadNewProcessComponent } from './templates/upload-new-process/upload-new-process.component';
import { CreateElementComponent } from './templates/create-element/create-element.component';
import { ElementDetailComponent } from './templates/element-detail/element-detail.component';
import { ElementViewComponent } from './templates/element-view/element-view.component';

const routes: Routes = [
  {
    path: 'login',
    component: AuthComponent,
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
    canActivate: [AuthGuard],
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
                path: 'step',
                children: [
                  {
                    path: ':stepId',
                    children: [
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
              {
                path: 'element',
                children: [
                  {
                    path: ':elementId',
                    component: ElementViewComponent,
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
