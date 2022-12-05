import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-button-filled',
  templateUrl: './button-filled.component.html'
})
export class ButtonFilledComponent {
    @Input() type = 'button';
    @Input() color = 'primary';
    @Input() icon = '';
    @Input() svgIcon = '';
    @Input() disabled = false;
    @Input() size = '';
    @Input() caption = '';
}
