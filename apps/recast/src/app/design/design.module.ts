import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from './material/material.module';
import { ButtonPrimaryComponent } from './components/atoms/button-primary/button-primary.component';

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
