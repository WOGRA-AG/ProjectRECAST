import { Component } from '@angular/core';
import { ColorPalette } from '../../../types';

@Component({
  selector: 'app-create-button',
  templateUrl: './create-button.component.html',
  styleUrls: ['./create-button.component.scss'],
})
export class CreateButtonComponent {
  color: ColorPalette = 'primary';
}
