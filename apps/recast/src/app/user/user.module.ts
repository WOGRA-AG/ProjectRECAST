import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthComponent } from './templates/auth/auth.component';
import { ProfileComponent } from './templates/profile/profile.component';
import { DesignModule } from '../design/design.module';
import { OverviewComponent } from './overview/overview.component';

@NgModule({
  declarations: [
    AuthComponent,
    ProfileComponent,
    OverviewComponent
  ],
  exports: [
    ProfileComponent,
    AuthComponent,
  ],
  imports: [
    CommonModule,
    DesignModule,
  ]
})
export class UserModule { }
