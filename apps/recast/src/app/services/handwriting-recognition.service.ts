import { Injectable } from '@angular/core';
require('@tensorflow/tfjs-backend-cpu');
require('@tensorflow/tfjs-backend-webgl');
const cocoSsd = require('@tensorflow-models/coco-ssd');

@Injectable({
  providedIn: 'root',
})
export class HandwritingRecognitionService {
  public async predict(image: HTMLImageElement): Promise<any[]> {
    const model = await cocoSsd.load();
    const predictions = await model.detect(image);
    console.log('predictions', predictions);
    return predictions;
  }
}
