import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class HandwritingRecognitionService {
  modelUrl =
    'https://trocr-large-printed-predictor-default.models.os4ml.wogra.com/v1/models/handwriting-model:predict';

  constructor(private readonly http: HttpClient) {}

  public async predictImage(base64image: string): Promise<string> {
    const prediction = (await firstValueFrom(
      this.http.post(this.modelUrl, {
        data: base64image,
      })
    )) as { prediction: string };
    if (!Object.prototype.hasOwnProperty.call(prediction, 'prediction')) {
      throw new Error('Predictions not found');
    }
    return prediction['prediction'];
  }
}
