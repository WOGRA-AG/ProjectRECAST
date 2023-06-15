import {
  Component,
  ContentChildren,
  Input,
  OnInit,
  Optional,
  QueryList,
  Self,
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormControl,
  NgControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { MatOption } from '@angular/material/core';
import { MatFormFieldAppearance } from '@angular/material/form-field';
import { map, Observable, startWith } from 'rxjs';

@Component({
  selector: 'app-autocomplete-input-field',
  templateUrl: './autocomplete-input-field.component.html',
  styleUrls: ['./autocomplete-input-field.component.scss'],
})
export class AutocompleteInputFieldComponent
  implements ControlValueAccessor, OnInit
{
  @ContentChildren(MatOption) queryOptions: QueryList<MatOption> =
    new QueryList<MatOption>();

  @Input() label = '';
  @Input() errMsg = '';
  @Input() appearance: MatFormFieldAppearance = 'outline';
  @Input() icon = '';

  public onTouch: any;
  protected filteredOptions$: Observable<MatOption[]> = new Observable<
    MatOption[]
  >();
  protected selectedOption = '';
  private _value = '';
  private _onChange: any;
  constructor(@Optional() @Self() public ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
      this.ngControl.control?.addValidators(this._validatorIsInOptions);
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
    this.ngControl.control?.addValidators(this._validatorIsInOptions());
    return this.ngControl.control as FormControl;
  }

  public ngOnInit(): void {
    this.filteredOptions$ = this.formControl.valueChanges.pipe(
      startWith(''),
      map((value: string) => this._filter(value))
    );
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
    const element = event.target as HTMLInputElement;
    this.value = element.value;
    this._onChange(element.value);
    this.onTouch();
  }

  private _filter(value: string): MatOption[] {
    const filterValue = value.toLowerCase();
    return this.queryOptions.filter(option =>
      option.viewValue.toLowerCase().includes(filterValue)
    );
  }

  private _validatorIsInOptions(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (value === null || value === undefined) {
        return null;
      }
      const isInOptions = this.queryOptions.some(
        option => option.value === value
      );
      return isInOptions ? null : { notInOptions: true };
    };
  }
}
