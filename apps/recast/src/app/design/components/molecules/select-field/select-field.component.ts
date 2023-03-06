import {
  Component,
  ContentChildren,
  Input,
  Optional,
  QueryList,
  Self,
} from '@angular/core';
import { ControlValueAccessor, FormControl, NgControl } from '@angular/forms';
import { MatSelectChange } from '@angular/material/select';
import { map, Observable, startWith } from 'rxjs';
import { MatOption } from '@angular/material/core';
import { MatFormFieldAppearance } from '@angular/material/form-field';

@Component({
  selector: 'app-select-field',
  templateUrl: './select-field.component.html',
  styleUrls: ['./select-field.component.scss'],
})
export class SelectFieldComponent implements ControlValueAccessor {
  @ContentChildren(MatOption) queryOptions: QueryList<MatOption> =
    new QueryList<MatOption>();

  @Input() label = '';
  @Input() errMsg = '';
  @Input() appearance: MatFormFieldAppearance = 'outline';
  @Input() icon = '';

  public onTouch: any;
  private _value = '';
  private _onChange: any;
  constructor(@Optional() @Self() public ngControl: NgControl) {
    if (this.ngControl != null) {
      this.ngControl.valueAccessor = this;
    }
  }

  @Input()
  public get value(): string {
    return this._value;
  }
  public set value(val: string) {
    if (!val) {
      return;
    }
    this._value = val;
    this.ngControl.control?.setValue(val);
    if (this._onChange) {
      this._onChange(val);
    }
    if (this.onTouch) {
      this.onTouch();
    }
  }

  public get formControl(): FormControl {
    return this.ngControl.control as FormControl;
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

  public change(event: MatSelectChange): void {
    this._onChange(event.value);
    this.onTouch();
  }

  public transformedOptions$(): Observable<MatOption[]> {
    return this.queryOptions?.changes.pipe(
      startWith(this.queryOptions),
      map((changes: MatOption[]) => changes)
    );
  }
}
