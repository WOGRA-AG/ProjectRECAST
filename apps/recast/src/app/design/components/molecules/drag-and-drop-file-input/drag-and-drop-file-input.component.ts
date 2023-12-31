import {
  Component,
  EventEmitter,
  Input,
  Output,
  Optional,
  Self,
  OnDestroy,
  HostBinding,
  ElementRef,
} from '@angular/core';
import { ControlValueAccessor, FormControl, NgControl } from '@angular/forms';
import {
  MatFormField,
  MatFormFieldControl,
} from '@angular/material/form-field';
import { Subject } from 'rxjs';
import { coerceBooleanProperty } from '@angular/cdk/coercion';

@Component({
  selector: 'app-drag-and-drop-file-input',
  templateUrl: './drag-and-drop-file-input.component.html',
  styleUrls: ['./drag-and-drop-file-input.component.scss'],
  providers: [
    {
      provide: MatFormFieldControl,
      useExisting: DragAndDropFileInputComponent,
    },
  ],
})
export class DragAndDropFileInputComponent
  implements ControlValueAccessor, MatFormFieldControl<File | null>, OnDestroy
{
  @HostBinding()
  id = `app-drag-and-drop-file-input-${DragAndDropFileInputComponent._nextId++}`;
  // eslint-disable-next-line  @angular-eslint/no-input-rename
  @Input('aria-describedby') ariaDescribedBy = '';
  @Output() cancelUpload: EventEmitter<null> = new EventEmitter<null>();

  public stateChanges: Subject<void> = new Subject<void>();
  public focused = false;
  public touched = false;
  public controlType = 'drag-and-drop-file-input';

  public onTouch: any;
  private static _nextId = 0;
  private _placeholder = '';
  private _value: File | null = null;
  private _onChange: any;
  private _required = false;
  private _disabled = false;

  constructor(
    @Optional() @Self() public ngControl: NgControl,
    private _elementRef: ElementRef,
    @Optional() public parentFormField: MatFormField
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
    if (this._onChange) {
      this._onChange(val);
    }
    if (this.onTouch) {
      this.onTouch();
    }
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
  get shouldLabelFloat(): boolean {
    return this.focused || !this.empty;
  }

  @Input()
  get required(): boolean {
    return this._required;
  }
  set required(req) {
    this._required = coerceBooleanProperty(req);
    this.stateChanges.next();
  }

  @Input()
  get disabled(): boolean {
    return this._disabled;
  }
  set disabled(value: boolean) {
    this._disabled = coerceBooleanProperty(value);
    this.stateChanges.next();
  }

  get empty(): boolean {
    return !this.value;
  }

  get errorState(): boolean {
    return this.formControl.invalid && this.touched;
  }

  public get formControl(): FormControl {
    return this.ngControl.control as FormControl;
  }

  public setDescribedByIds(ids: string[]): void {
    const controlElement = this._elementRef.nativeElement.querySelector(
      '.drag-and-drop-file-input-container'
    )!;
    controlElement.setAttribute('aria-describedby', ids.join(' '));
  }

  public onContainerClick(event: MouseEvent): void {
    if ((event.target as Element).tagName.toLowerCase() !== 'input') {
      this._elementRef.nativeElement.querySelector('input').focus();
    }
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

  public changeFile(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;
    if (!fileList) {
      return;
    }
    this.value = fileList[0];
    this.emitDroppedFile(fileList);
  }

  public emitDroppedFile(files: FileList): void {
    if (!files) {
      return;
    }
    this.value = files[0];
    if (this._onChange) {
      this._onChange(this.value);
    }
    if (this.onTouch) {
      this.onTouch();
    }
    this.stateChanges.next();
  }

  public ngOnDestroy(): void {
    this.stateChanges.complete();
  }
}
