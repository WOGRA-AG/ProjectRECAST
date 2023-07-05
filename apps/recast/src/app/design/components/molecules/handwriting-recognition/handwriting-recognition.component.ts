import { Component, EventEmitter, Input, Output } from '@angular/core';
import { HandwritingRecognitionService } from 'src/app/services/handwriting-recognition.service';

@Component({
  selector: 'app-handwriting-recognition',
  templateUrl: './handwriting-recognition.component.html',
  styleUrls: ['./handwriting-recognition.component.scss'],
})
export class HandwritingRecognitionComponent {
  @Input() svgIcon = '';
  @Output() recognized: EventEmitter<string> = new EventEmitter<string>();

  constructor(
    private readonly handwritingRecognitionService: HandwritingRecognitionService
  ) {}

  public async scanElement(event: Event): Promise<void> {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;
    if (!fileList) {
      return;
    }
    const file = fileList[0];
    const reader = new FileReader();
    reader.onloadend = (): void => {
      const base64data = reader.result?.toString();
      if (!base64data) return;
      this.handwritingRecognitionService.predictImage(base64data).then(id => {
        this.recognized.emit(id);
      });
    };
    reader.readAsDataURL(file);
  }
}
