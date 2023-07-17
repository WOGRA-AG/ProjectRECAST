import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProfileComponent } from './user/templates/profile/profile.component';
import { PageNotFoundComponent } from './templates/page-not-found/page-not-found.component';
import { authGuard } from './user/guards/auth.guard';
import { OverviewComponent } from './templates/overview/overview.component';
import { ProcessDetailComponent } from './templates/process-detail/process-detail.component';
import { ProcessNewComponent } from './templates/process-new/process-new.component';
import { CreateElementComponent } from './templates/create-element/create-element.component';
import { ElementDetailComponent } from './templates/element-detail/element-detail.component';
import { BundleNewComponent } from './templates/bundle-new/bundle-new.component';
import { BundleDetailComponent } from './templates/bundle-detail/bundle-detail.component';

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
        path: 'bundle',
        children: [
          {
            path: '',
            component: BundleNewComponent,
          },
          {
            path: ':bundleId',
            component: BundleDetailComponent,
          },
        ],
      },
      {
        path: 'process',
        children: [
          {
            path: '',
            component: ProcessNewComponent,
          },
          {
            path: ':processId',
            children: [
              {
                path: '',
                component: ProcessDetailComponent,
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
