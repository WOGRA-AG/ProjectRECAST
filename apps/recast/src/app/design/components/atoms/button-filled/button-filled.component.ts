import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-button-filled',
    templateUrl: './button-filled.component.html'
  })
  export class ButtonFilledComponent {
    @Input() disabled = false;
    @Input() size = '';
  }
