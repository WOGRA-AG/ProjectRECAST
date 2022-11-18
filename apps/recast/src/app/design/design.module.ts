import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonPrimaryComponent } from './components/atoms/button-primary.component';
import { MaterialModule } from './material/material.module';

@NgModule({
  declarations: [
    ButtonPrimaryComponent,
  ],
  exports: [
    ButtonPrimaryComponent,
    MaterialModule,
  ],
  imports: [
    CommonModule,
    MaterialModule
  ]
})
export class DesignModule { }
