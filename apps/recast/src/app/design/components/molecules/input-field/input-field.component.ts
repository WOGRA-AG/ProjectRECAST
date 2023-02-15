import { Component, Input, Optional, Self } from '@angular/core';
import { ControlValueAccessor, FormControl, NgControl } from '@angular/forms';

@Component({
  selector: 'app-input-field',
  templateUrl: './input-field.component.html',
  styleUrls: ['./input-field.component.scss'],
  providers: [],
})
export class InputFieldComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() errMsg = '';
  @Input() hint = '';
  @Input() appearance: 'outline' | 'fill' | 'legacy' | 'standard' = 'outline';
  @Input() type: 'text' | 'number' = 'text';
  @Input() icon = '';

  onTouch: any;
  private val = '';
  private onChange: any;

  constructor(@Optional() @Self() public ngControl: NgControl) {
    if (this.ngControl != null) {
      this.ngControl.valueAccessor = this;
    }
  }

  @Input()
  get value(): string {
    return this.val;
  }
  set value(val: string) {
    if (!val) {
      return;
    }
    this.val = val;
    if (this.onChange) {
      this.onChange(val);
    }
    if (this.onTouch) {
      this.onTouch();
    }
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  public get formControl(): FormControl {
    return this.ngControl.control as FormControl;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  writeValue(val: any): void {
    if (!val) {
      return;
    }
    this.value = val;
  }

  change(event: Event): void {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    this.onChange(target.value);
    this.onTouch();
  }
}