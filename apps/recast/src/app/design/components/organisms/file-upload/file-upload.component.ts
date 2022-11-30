import {Component, EventEmitter, Input, Output} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent {

  @Input() placeholder = '';
  @Input() file: File | null = null;
  @Output() fileChange: EventEmitter<File | null> = new EventEmitter<File | null>();
  @Output() cancel: EventEmitter<void> = new EventEmitter<void>();

  uploadFileForm: FormGroup = this.formBuilder.group({
    file: new FormControl({value: this.file, disabled: false},
      [Validators.minLength(3), Validators.required]
    ),
  });

  constructor(
    private formBuilder: FormBuilder,
  ) { }

  emitFile() {
    this.fileChange.emit(this.uploadFileForm.value.file);
  }
}
