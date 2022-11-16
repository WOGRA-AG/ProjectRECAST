import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-button',
    templateUrl: './button.component.html'
  })
  export class ButtonComponent {
    @Input() disabled = false;
    @Input() reversed = false;
    @Input() color = 'primary';
    @Input() size = 'medium';
    @Input() class = 'mat-raised-button';
    @Input() icon = '';
  }
