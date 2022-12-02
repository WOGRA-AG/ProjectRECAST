import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-icon-button-filled',
    templateUrl: './icon-button-filled.component.html'
  })
  export class IconButtonFilledComponent {
    @Input() icon = '';
    @Input() svgIcon = '';
    @Input() disabled = false;
    @Input() size = '';
  }
