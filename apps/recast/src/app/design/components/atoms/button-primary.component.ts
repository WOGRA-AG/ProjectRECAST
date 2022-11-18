import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-button-primary',
    templateUrl: './button-primary.component.html'
  })
  export class ButtonPrimaryComponent {
    @Input() disabled = false;
    @Input() size = '';
  }
  