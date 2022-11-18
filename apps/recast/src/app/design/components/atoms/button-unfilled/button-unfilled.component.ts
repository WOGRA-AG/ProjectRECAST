import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-button-unfilled',
    templateUrl: './button-unfilled.component.html'
  })
  export class ButtonUnfilledComponent {
    @Input() disabled = false;
    @Input() bordered = false;
    @Input() size = '';
  }
