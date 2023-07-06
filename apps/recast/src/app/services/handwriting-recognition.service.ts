import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class HandwritingRecognitionService {
  modelUrl = environment.ocrInferenceUrl;

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
