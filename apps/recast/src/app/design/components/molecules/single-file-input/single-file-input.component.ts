/* eslint-disable  @typescript-eslint/member-ordering*/
import {
  Component,
  EventEmitter,
  Input,
  Output,
  Optional,
  Self,
  OnDestroy,
  HostBinding,
  ElementRef
} from '@angular/core';
import {ControlValueAccessor, FormControl, NgControl} from '@angular/forms';
import {MatFormField, MatFormFieldControl} from '@angular/material/form-field';
import {Subject} from 'rxjs';
import {coerceBooleanProperty} from '@angular/cdk/coercion';

@Component({
  selector: 'app-single-file-input',
  templateUrl: './single-file-input.component.html',
  styleUrls: ['./single-file-input.component.scss'],
  providers: [{provide: MatFormFieldControl, useExisting: SingleFileInputComponent}]
})
export class SingleFileInputComponent implements ControlValueAccessor, MatFormFieldControl<File | null>, OnDestroy {
  static nextId = 0;
  // eslint-disable-next-line  @angular-eslint/no-input-rename
  @Input('aria-describedby') ariaDescribedBy = '';
  @Output() cancelUpload: EventEmitter<null> = new EventEmitter<null>();

  stateChanges: Subject<void> = new Subject<void>();
  focused = false;
  touched = false;
  controlType = 'single-file-input';
  @HostBinding() id = `app-single-file-input-${SingleFileInputComponent.nextId++}`;

  onTouch: any;
  private _placeholder = '';
  private _value: File | null = null;
  private _onChange: any;
  private _required = false;
  private _disabled = false;

  constructor(
    @Optional() @Self() public ngControl: NgControl,
    private _elementRef: ElementRef,
    @Optional() public parentFormField: MatFormField,
  ) {
    if (this.ngControl != null) {
      this.ngControl.valueAccessor = this;
    }
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
    if (this._onChange) {this._onChange(val);}
    if (this.onTouch) {this.onTouch();}
    this.stateChanges.next();
  }

  @Input()
  get placeholder(): string {
    return this._placeholder;
  }
  set placeholder(plh: string) {
    this._placeholder = plh;
    this.stateChanges.next();
  }

  @HostBinding('class.floating')
  get shouldLabelFloat() {
    return this.focused || !this.empty;
  }

  @Input()
  get required() {
    return this._required;
  }
  set required(req) {
    this._required = coerceBooleanProperty(req);
    this.stateChanges.next();
  }

  @Input()
  get disabled(): boolean {return this._disabled;}
  set disabled(value: boolean) {
    this._disabled = coerceBooleanProperty(value);
    this.stateChanges.next();
  }

  get empty() {
    return !this.value;
  }

  get errorState(): boolean {
    return this.formControl.invalid && this.touched;
  }

  public get formControl(): FormControl {
    return this.ngControl.control as FormControl;
  }

  onFocusIn(event: FocusEvent) {
    if (!this.focused) {
      this.focused = true;
      this.stateChanges.next();
    }
  }

  onFocusOut(event: FocusEvent) {
    if (!this._elementRef.nativeElement.contains(event.relatedTarget as Element)) {
      this.touched = true;
      this.focused = false;
      this.onTouch();
      this.stateChanges.next();
    }
  }

  setDescribedByIds(ids: string[]) {
    const controlElement = this._elementRef.nativeElement
      .querySelector('.single-file-input-container')!;
    controlElement.setAttribute('aria-describedby', ids.join(' '));
  }

  onContainerClick(event: MouseEvent) {
    if ((event.target as Element).tagName.toLowerCase() !== 'input') {
      this._elementRef.nativeElement.querySelector('input').focus();
    }
  }

  writeValue(val: File | null): void {
    this.value = val;
  }
  registerOnChange(fn: any): void {
    this._onChange = fn;
  }
  registerOnTouched(fn: any): void {
      this.onTouch = fn;
  }

  changeFile(event: Event) {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;
    if (!fileList) {return;}
    this.value = fileList[0];
    if (this._onChange) {this._onChange(this.value);}
    if (this.onTouch) {this.onTouch();}
    this.stateChanges.next();
  }

  uploadDroppedFile(files: File[]) {
    if (!files) {return;}
    this.value = files[0];
    if (this._onChange) {this._onChange(this.value);}
    if (this.onTouch) {this.onTouch();}
    this.stateChanges.next();
  }

  ngOnDestroy() {
    this.stateChanges.complete();
  }
}
