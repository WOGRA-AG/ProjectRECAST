import { Component, Input } from '@angular/core';
import { AbstractControl, FormControl } from '@angular/forms';

@Component({
  selector: 'app-file-input-field',
  templateUrl: './file-input-field.component.html',
  styleUrls: ['./file-input-field.component.scss'],
})
// TODO: FormField and Style
export class FileInputFieldComponent {
  @Input() id = 0;
  @Input() label = '';

  private _formControl: FormControl = new FormControl<any>('');

  @Input()
  get control(): FormControl {
    return this._formControl;
  }
  set control(control: AbstractControl) {
    this._formControl = control as FormControl;
  }
}
