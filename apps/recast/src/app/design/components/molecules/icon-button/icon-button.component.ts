import { Component, Input } from '@angular/core';
import { ButtonSize, ColorPalette } from '../../../types';

@Component({
  selector: 'app-icon-button',
  templateUrl: './icon-button.component.html',
})
export class IconButtonComponent {
  @Input() matIcon = '';
  @Input() svgIcon = '';
  @Input() size: ButtonSize = 'medium';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() color: ColorPalette = 'primary';
}
