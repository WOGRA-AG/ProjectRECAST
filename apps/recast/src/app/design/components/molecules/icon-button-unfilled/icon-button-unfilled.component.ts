import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-icon-button-unfilled',
    templateUrl: './icon-button-unfilled.component.html'
  })
  export class IconButtonUnfilledComponent {
    @Input() icon = '';
    @Input() svgIcon = '';
    @Input() disabled = false;
    @Input() size = '';
    @Input() bordered = false;
  }
