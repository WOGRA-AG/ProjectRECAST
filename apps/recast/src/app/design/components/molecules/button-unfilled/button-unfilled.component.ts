import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-button-unfilled',
  templateUrl: './button-unfilled.component.html'
})
export class ButtonUnfilledComponent {
    @Input() type = 'button';
    @Input() color = 'primary';
    @Input() icon = '';
    @Input() svgIcon = '';
    @Input() disabled = false;
    @Input() size = '';
    @Input() bordered = false;
    @Input() caption = '';
}
