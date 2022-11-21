import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from './material/material.module';
import { ButtonFilledComponent } from './components/atoms/button-filled/button-filled.component';
import { ButtonUnfilledComponent } from './components/atoms/button-unfilled/button-unfilled.component';
import { IconButtonFilledComponent } from './components/molecules/icon-button-filled/icon-button-filled.component';
import { DemoComponent } from './demo/demo.component';
import { IconButtonUnfilledComponent } from './components/molecules/icon-button-unfilled/icon-button-unfilled.component';

@NgModule({
  declarations: [
    DemoComponent,
    ButtonFilledComponent,
    ButtonUnfilledComponent,
    IconButtonFilledComponent,
    IconButtonUnfilledComponent
  ],
  exports: [
    MaterialModule,
    ButtonFilledComponent,
    ButtonUnfilledComponent,
    IconButtonFilledComponent,
    IconButtonUnfilledComponent
  ],
  imports: [
    CommonModule,
    MaterialModule
  ]
})
export class DesignModule { }
