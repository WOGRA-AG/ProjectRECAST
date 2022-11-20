import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from './material/material.module';
import { ButtonFilledComponent } from './components/atoms/button-filled/button-filled.component';
import { ButtonUnfilledComponent } from './components/atoms/button-unfilled/button-unfilled.component';
import { IconButtonFilledComponent } from './components/molecules/icon-button-filled/icon-button-filled.component';
import { DemoComponent } from './demo/demo.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {TextInputFieldComponent} from './components/molecules/text-input-field/text-input-field.component';
import {LogoutButtonComponent} from './components/molecules/logout-button/logout-button.component';
import {SubmitButtonComponent} from './components/molecules/submit-button/submit-button.component';
import { IconButtonUnfilledComponent } from './components/molecules/icon-button-unfilled/icon-button-unfilled.component';

const COMPONENTS = [
  DemoComponent,
  ButtonFilledComponent,
  ButtonUnfilledComponent,
  IconButtonFilledComponent,
  IconButtonUnfilledComponent,
  TextInputFieldComponent,
  LogoutButtonComponent,
  SubmitButtonComponent,
];

@NgModule({
  declarations: [
    ...COMPONENTS,
  ],
  exports: [
    ...COMPONENTS,
    MaterialModule,
    ButtonFilledComponent,
    ButtonUnfilledComponent,
    IconButtonFilledComponent,
    FormsModule,
    ReactiveFormsModule,
  ],
  imports: [
    CommonModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
  ]
})
export class DesignModule { }
