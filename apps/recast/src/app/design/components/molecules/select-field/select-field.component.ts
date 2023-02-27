import {
  AfterContentInit,
  Component,
  ContentChildren,
  Input,
  OnDestroy,
  Optional,
  QueryList,
  Self,
} from '@angular/core';
import { ControlValueAccessor, FormControl, NgControl } from '@angular/forms';
import { MatSelectChange } from '@angular/material/select';
import { Subject, takeUntil, tap } from 'rxjs';
import { MatOption } from '@angular/material/core';

@Component({
  selector: 'app-select-field',
  templateUrl: './select-field.component.html',
  styleUrls: ['./select-field.component.scss'],
})
export class SelectFieldComponent
  implements ControlValueAccessor, OnDestroy, AfterContentInit
{
  @ContentChildren(MatOption) queryOptions: QueryList<MatOption> =
    new QueryList<MatOption>();

  @Input() label = '';
  @Input() errMsg = '';
  @Input() appearance: 'outline' | 'fill' | 'legacy' | 'standard' = 'outline';
  @Input() icon = '';

  public onTouch: any;
  public transformedOptions: MatOption[] = [];
  private _value = '';
  private _onChange: any;
  private readonly _destroy$: Subject<void> = new Subject<void>();
  constructor(@Optional() @Self() public ngControl: NgControl) {
    this.transformedOptions = this.queryOptions.toArray();
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

  public ngAfterContentInit(): void {
    this.transformedOptions = this.queryOptions.toArray();
    this.queryOptions?.changes
      .pipe(
        takeUntil(this._destroy$),
        tap((changes: MatOption[]) => {
          this.transformedOptions = changes;
        })
      )
      .subscribe();
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }
}
