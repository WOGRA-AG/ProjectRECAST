import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class HandwritingRecognitionService {
  modelUrl = environment.ocrInferenceUrl;

  constructor(private readonly http: HttpClient) {}

  public predictImage(image: File): Observable<string> {
    return this.http.post(this.modelUrl, image) as Observable<string>;
  }
}
