import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileComponent } from './templates/profile/profile.component';
import { DesignModule } from '../design/design.module';

@NgModule({
  declarations: [ProfileComponent],
  exports: [ProfileComponent],
  imports: [CommonModule, DesignModule],
})
export class UserModule {}
