import { Component, Input } from '@angular/core';
import { ColorPalette } from '../../../types';

@Component({
  selector: 'app-button-filled',
  templateUrl: './button-filled.component.html',
})
export class ButtonFilledComponent {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() color: ColorPalette = 'primary';
  @Input() icon = '';
  @Input() svgIcon = '';
  @Input() disabled = false;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
}
