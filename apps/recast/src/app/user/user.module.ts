import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthComponent } from './auth/auth.component';
import { ProfileComponent } from './profile/profile.component';
import {ReactiveFormsModule} from '@angular/forms';
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
    ReactiveFormsModule,
    DesignModule,
  ]
})
export class UserModule { }
