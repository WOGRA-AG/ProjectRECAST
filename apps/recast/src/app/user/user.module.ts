import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthComponent } from './auth/auth.component';
import { ProfileComponent } from './profile/profile.component';
import { DesignModule } from '../design/design.module';

@NgModule({
  declarations: [
    AuthComponent,
    ProfileComponent,
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
