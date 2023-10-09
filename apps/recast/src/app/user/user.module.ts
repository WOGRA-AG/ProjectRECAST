import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileComponent } from './templates/profile/profile.component';
import { WograUiKitModule } from '@wogra/wogra-ui-kit';

@NgModule({
  declarations: [ProfileComponent],
  exports: [ProfileComponent],
  imports: [CommonModule, WograUiKitModule],
})
export class UserModule {}
