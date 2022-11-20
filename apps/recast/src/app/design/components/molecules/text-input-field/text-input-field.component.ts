import {
  Component,
  Input, Optional, Self,
} from '@angular/core';
import {ControlValueAccessor, FormControl, NgControl} from '@angular/forms';

@Component({
  selector: 'app-text-input-field',
  templateUrl: './text-input-field.component.html',
  styleUrls: ['./text-input-field.component.scss'],
  providers: []
})
export class TextInputFieldComponent implements ControlValueAccessor {

  @Input() label: string = '';
  @Input() errMsg: string = ''
  @Input() hint: string = '';

  private _value: string = '';
  private _onChange: Function = new Function;
  onTouch: Function = new Function;

  constructor(@Optional() @Self() public ngControl: NgControl) {
    if (this.ngControl != null) {
      this.ngControl.valueAccessor = this;
    }
  }

  @Input()
  get value(): string {
    return this._value;
  }
  set value(val: string) {
    if (!val) {
      return;
    }
    this._value = val;
    if (this._onChange) this._onChange(val);
    if (this.onTouch) this.onTouch();
  }

  get formControl(): FormControl {
    return this.ngControl.control as FormControl;
  }

  registerOnChange(fn: any): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  writeValue(val: any): void {
    if (!val) return;
    this.value = val;
    this._onChange(val);
    this.onTouch();
  }

  change(event: Event): void {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    this._onChange(target.value);
    this.onTouch();
  }
}
