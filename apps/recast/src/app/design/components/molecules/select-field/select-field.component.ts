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
import { map, Observable, startWith, take } from 'rxjs';
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
  @Input() hint = '';
  @Input() filterLabel = 'Filter';
  @Input() filterIcon = 'search';

  protected isOpen = false;
  protected onTouch: any;
  protected filterValue = '';
  private _value = '';
  private _onChange: any;
  constructor(@Optional() @Self() protected ngControl: NgControl) {
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

  protected change(event: MatSelectChange): void {
    this._onChange(event.value);
    this.onTouch();
    this.value = event.value;
    this.resetFilter();
  }

  protected filteredOptions$(): Observable<MatOption[]> {
    return this.queryOptions?.changes.pipe(
      startWith(this.queryOptions),
      map((options: MatOption[]) =>
        options.filter((option: MatOption) =>
          option.viewValue
            .toLowerCase()
            .includes(this.filterValue.toLowerCase())
        )
      )
    );
  }

  protected resetFilter(): void {
    this.filterValue = '';
    this.isOpen = false;
  }

  protected onFilterSubmit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.filteredOptions$()
      .pipe(take(1))
      .subscribe(options => {
        if (options.length === 1) {
          this.value = options[0].value;
          this._onChange(options[0].value);
        }
      });
  }
}
