import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-single-file-upload',
  templateUrl: './single-file-upload.component.html',
  styleUrls: ['./single-file-upload.component.scss'],
})
export class SingleFileUploadComponent implements OnDestroy {
  @Input() placeholder = '';
  @Input() file: File | null = null;
  @Output() fileChange: EventEmitter<File | null> =
    new EventEmitter<File | null>();
  @Output() back: EventEmitter<void> = new EventEmitter<void>();
  @Output() isValid: EventEmitter<boolean> = new EventEmitter<boolean>();

  uploadFileForm: FormGroup = this.formBuilder.group({
    file: new FormControl({ value: this.file, disabled: false }, [
      Validators.minLength(3),
      Validators.required,
    ]),
  });
  private readonly _destroy$: Subject<void> = new Subject<void>();

  constructor(private formBuilder: FormBuilder) {
    this.uploadFileForm.statusChanges
      .pipe(takeUntil(this._destroy$))
      .subscribe(status => this.isValid.emit(status === 'VALID'));
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  public emitFile(): void {
    this.fileChange.emit(this.uploadFileForm.value.file);
  }
}
