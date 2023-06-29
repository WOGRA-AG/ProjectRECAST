// TODO: Remove
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@angular/core';
import {
  LayersModel,
  Rank,
  Tensor,
  loadLayersModel,
  browser,
  gather,
  notEqual,
  whereAsync,
} from '@tensorflow/tfjs';
import { CTCBeamSearch } from 'ctc-beam-search';
import { MODEL_VOC } from '../model/vocabulary';

@Injectable({
  providedIn: 'root',
})
export class HandwritingRecognitionService {
  public async predImage(image: HTMLImageElement): Promise<string | string[]> {
    const model = await loadLayersModel('assets/models/mnist/model.json');
    const predictions = await this.predictImage(model, image);
    const text = this.decode_batch_predictions(predictions);
    return text;
  }

  private async predictImage(
    model: LayersModel,
    image: HTMLImageElement
  ): Promise<Tensor<Rank> | Tensor<Rank>[]> {
    const tensor = this.imageToTensor(image);
    return model.predict(tensor);
  }

  private imageToTensor(image: HTMLImageElement): Tensor<Rank> {
    return browser
      .fromPixels(image)
      .resizeNearestNeighbor([28, 28])
      .mean(2)
      .expandDims(2)
      .expandDims()
      .toFloat()
      .div(255.0);
  }

  private async decode_batch_predictions(
    predictions: Tensor<Rank> | Tensor<Rank>[]
  ): Promise<string | string[]> {
    if (!(predictions instanceof Array)) {
      // const bs = new CTCBeamSearch(MODEL_VOC);
      // const cond = await whereAsync(notEqual(predictions, -1));
      // const res = gather(predictions, cond);
      // const data = bs.search([Array.from(predictions.dataSync())], 5);
      const result = predictions.argMax(1).dataSync()[0];
      console.log(result);
      return '' + result;
    }
    const results = predictions;
    return results.map(result => {
      return '' + result.argMax(1).dataSync()[0];
    });
  }
}
