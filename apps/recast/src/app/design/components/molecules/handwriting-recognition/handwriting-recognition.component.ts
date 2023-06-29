import { Component, Input } from '@angular/core';
import { HandwritingRecognitionService } from 'src/app/services/handwriting-recognition.service';

@Component({
  selector: 'app-handwriting-recognition',
  templateUrl: './handwriting-recognition.component.html',
  styleUrls: ['./handwriting-recognition.component.scss'],
})
export class HandwritingRecognitionComponent {
  @Input() svgIcon = '';

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
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await this.handwritingRecognitionService.predImage(img);
  }
}
