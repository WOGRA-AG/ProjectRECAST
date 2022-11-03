import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthComponent } from './auth/auth.component';
import { AccountComponent } from './account/account.component';
import {ReactiveFormsModule} from '@angular/forms';


@NgModule({
  declarations: [
    AuthComponent,
    AccountComponent,
  ],
  exports: [
    AccountComponent,
    AuthComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule
  ]
})
export class UserModule { }
