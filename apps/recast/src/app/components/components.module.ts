import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MaterialModule} from '../material/material.module';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import { TextInputFieldComponent } from './molecules/text-input-field/text-input-field.component';
import { SubmitButtonComponent } from './molecules/submit-button/submit-button.component';
import { IconButtonComponent } from './molecules/icon-button/icon-button.component';
import { LogoutButtonComponent } from './molecules/logout-button/logout-button.component';


@NgModule({
  declarations: [
    TextInputFieldComponent,
    SubmitButtonComponent,
    IconButtonComponent,
    LogoutButtonComponent
  ],
  exports: [
    TextInputFieldComponent,
    SubmitButtonComponent,
    LogoutButtonComponent,
    IconButtonComponent,
    MaterialModule,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
  ]
})
export class ComponentsModule { }
