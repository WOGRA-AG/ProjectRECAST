import { Component, Input, Optional, Self } from '@angular/core';
import { ControlValueAccessor, FormControl, NgControl } from '@angular/forms';

@Component({
  selector: 'app-input-field',
  templateUrl: './input-field.component.html',
  styleUrls: ['./input-field.component.scss'],
})
export class InputFieldComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() errMsg = '';
  @Input() hint = '';
  @Input() appearance: 'outline' | 'fill' = 'outline';
  @Input() type: 'text' | 'number' = 'text';
  @Input() icon = '';

  onTouch: any;
  private _val = '';
  private _onChange: any;

  constructor(@Optional() @Self() public ngControl: NgControl) {
    if (this.ngControl !== null) {
      this.ngControl.valueAccessor = this;
    }
  }

  @Input()
  get value(): string {
    return this._val;
  }
  set value(val: string) {
    if (!val) {
      return;
    }
    this._val = val;
    if (this._onChange) {
      this._onChange(val);
    }
    if (this.onTouch) {
      this.onTouch();
    }
  }

  public get formControl(): FormControl {
    return this.ngControl?.control as FormControl;
  }

  public registerOnChange(fn: any): void {
    this._onChange = fn;
  }

  public registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  public writeValue(val: any): void {
    if (!val) {
      return;
    }
    this.value = val;
  }

  public change(event: Event): void {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    this._onChange(target.value);
    this.onTouch();
  }
}
