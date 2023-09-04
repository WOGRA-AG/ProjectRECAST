import {
  Component,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  OnDestroy,
  Optional,
  Output,
  Self,
  SimpleChanges,
} from '@angular/core';
import { ControlValueAccessor, FormControl, NgControl } from '@angular/forms';
import { ColorPalette } from '../../../types';
import { Subject } from 'rxjs';
import { ThemePalette } from '@angular/material/core';

@Component({
  selector: 'app-file-input-field',
  templateUrl: './file-input-field.component.html',
  styleUrls: ['./file-input-field.component.scss'],
})
export class FileInputFieldComponent
  implements ControlValueAccessor, OnDestroy, OnChanges
{
  @Input() label = '';
  @Input() size: 'small' | 'medium' | 'large' = 'small';
  @Input() color: ColorPalette = 'primary';
  @Output() fileChanged: EventEmitter<File> = new EventEmitter<File>();
  @HostBinding()
  id = `app-file-input-${FileInputFieldComponent._nextId++}`;
  public onTouch: any;
  public stateChanges: Subject<void> = new Subject<void>();
  protected themePalette = this.color as ThemePalette;
  private _value: File | null = null;
  private _onChange: any;
  private static _nextId = 0;

  constructor(@Optional() @Self() public ngControl: NgControl) {
    if (this.ngControl != null) {
      this.ngControl.valueAccessor = this;
    }
  }
  @Input()
  public get formControl(): FormControl {
    return this.ngControl.control as FormControl;
  }
  @Input()
  public get value(): File | null {
    return this._value;
  }
  public set value(val: File | null) {
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
    this.stateChanges.next();
  }

  public writeValue(val: File | null): void {
    this.value = val;
  }
  public registerOnChange(fn: any): void {
    this._onChange = fn;
  }
  public registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  public ngOnDestroy(): void {
    this.stateChanges.complete();
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['color']) {
      this.themePalette = this.color as ThemePalette;
    }
  }

  protected dropFile(fileList: FileList): void {
    if (!fileList.length) {
      return;
    }
    this.updateValue(fileList[0]);
  }

  protected fileChangedHandler(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (!target.files) {
      return;
    }
    this.dropFile(target.files);
    target.value = '';
  }

  protected updateValue(value: File): void {
    this.formControl.setValue(value);
    this.value = value;
    this.fileChanged.emit(this.value);
  }
}
