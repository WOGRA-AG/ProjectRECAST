import { Component, EventEmitter, Input, Output } from '@angular/core';
import { HandwritingRecognitionService } from 'src/app/services/handwriting-recognition.service';
import { take } from 'rxjs';
import { SvgIcon } from '@wogra/wogra-ui-kit';

@Component({
  selector: 'app-handwriting-recognition',
  templateUrl: './handwriting-recognition.component.html',
  styleUrls: ['./handwriting-recognition.component.scss'],
})
export class HandwritingRecognitionComponent {
  @Input() svgIcon: SvgIcon = 'scan';
  @Output() recognized: EventEmitter<string> = new EventEmitter<string>();
  loading = false;

  constructor(
    private readonly handwritingRecognitionService: HandwritingRecognitionService
  ) {}

  public async scanElement(event: Event): Promise<void> {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;
    if (!fileList) {
      this.loading = false;
      return;
    }
    this.loading = true;
    const file = fileList[0];
    this.handwritingRecognitionService
      .predictImage(file)
      .pipe(take(1))
      .subscribe(r => {
        this.loading = false;
        this.recognized.emit(r);
      });
  }
}
