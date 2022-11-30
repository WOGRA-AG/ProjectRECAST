import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-search-field',
  templateUrl: './search-field.component.html',
  styleUrls: ['./search-field.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class SearchFieldComponent {
  @Input() value: string | null = null;
  @Output() valueChange: EventEmitter<string | null> = new EventEmitter<string | null>();

  public searchMode = false;

  onClear(): void {
    this.value = null;
    this.valueChange.emit(null);
    this.searchMode = false;
  }

  onFocusOut(): void {
    if (!this.value || this.value.length <= 0) {
      this.onClear();
    }
  }
}
