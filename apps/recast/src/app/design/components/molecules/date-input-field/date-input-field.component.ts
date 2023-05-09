import { Component, Input, Optional, Self } from '@angular/core';
import { ControlValueAccessor, FormControl, NgControl } from '@angular/forms';
import { MatFormFieldAppearance } from '@angular/material/form-field';
import { ColorPalette } from '../../../types';
import { DateAdapter, ThemePalette } from '@angular/material/core';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';

@Component({
  selector: 'app-date-input-field',
  templateUrl: './date-input-field.component.html',
  styleUrls: ['./date-input-field.component.scss'],
})
export class DateInputFieldComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() hint = '';
  @Input() appearance: MatFormFieldAppearance = 'outline';
  @Input() color: ColorPalette = 'primary';

  public onTouch: any;
  protected readonly themeColor: ThemePalette = this.color as ThemePalette;
  private _val = '';
  private _onChange: any;

  constructor(
    @Optional() @Self() public ngControl: NgControl,
    private _dateAdapter: DateAdapter<any>
  ) {
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

  protected change(event: Event): void {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    const parsedDate = this._dateAdapter.parse(target.value, 'L');
    const value = parsedDate ? parsedDate.toISOString() : target.value;
    this._onChange(value);
    this.onTouch();
  }

  protected dateChange(event: MatDatepickerInputEvent<any, any>): void {
    const value = event.target.value;
    const iso = this._dateAdapter.parse(value, 'L')?.toISOString();
    this._onChange(iso);
    this.onTouch();
  }
}
