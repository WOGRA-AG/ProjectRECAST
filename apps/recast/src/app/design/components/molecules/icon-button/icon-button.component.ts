import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-icon-button',
  templateUrl: './icon-button.component.html'
})
export class IconButtonComponent {
    @Input() matIcon = '';
    @Input() svgIcon = '';
    @Input() size: 'small' | 'medium' | 'large' | '' = '';
    @Input() type: 'button' | 'submit' | 'reset' = 'button';

    @Input() color: string = 'primary';
}
