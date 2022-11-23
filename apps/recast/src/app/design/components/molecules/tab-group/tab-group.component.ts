import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-tab-group',
  templateUrl: './tab-group.component.html',
  styleUrls: ['./tab-group.component.scss']
})
export class TabGroupComponent {
  @Input() labels: string[] = [];
  @Input() index = 0;
  @Output() indexChanged: EventEmitter<number> = new EventEmitter<number>();
}
