import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  concatMap,
  from,
  map,
  mergeMap,
  Observable,
  of,
  take,
  toArray,
  zip,
} from 'rxjs';
import { ElementFacadeService } from './element-facade.service';
import { StorageService } from '../storage/services/storage.service';
import { PredictionTemplate, ValueType } from '../../../build/openapi/recast';
import { StepPropertyService } from './step-property.service';
import { environment } from '../../environments/environment';
import { toLower } from 'lodash';

@Injectable({
  providedIn: 'root',
})
export class PredictionService {
  constructor(
    private readonly http: HttpClient,
    private readonly elementService: ElementFacadeService,
    private readonly storageService: StorageService,
    private readonly stepPropertyService: StepPropertyService
  ) {}

  public predict(
    input: (string | File | undefined)[],
    modelUrl: string
  ): Observable<string> {
    const inputVal = input.length === 1 ? input[0] : input;
    const headers = {
      'Content-Type': 'image/tiff',
    };
    return this.http.post(modelUrl, inputVal, {
      headers,
    }) as Observable<string>;
  }

  public updatePredictionValue(
    elementId: number,
    predictionTemplate: PredictionTemplate
  ): Observable<PredictionTemplate> {
    const modelUrl = `https://${predictionTemplate.stepPropertyId}-yatai.${environment.modelPrefix}/predict`;
    return this.elementService
      .referencedElementPropertiesByElementId$(elementId)
      .pipe(
        mergeMap(elementProperties => from(elementProperties)),
        concatMap(elementProperty =>
          zip(
            of(elementProperty),
            this.stepPropertyService.stepPropertyById$(
              elementProperty.stepPropertyId!
            )
          )
        ),
        concatMap(([elementProperty, stepProperty]) => {
          if (
            stepProperty?.name &&
            predictionTemplate.input
              ?.map(toLower)
              .includes(stepProperty?.name.toLowerCase())
          ) {
            if (
              stepProperty.type === ValueType.Image &&
              elementProperty.value
            ) {
              return this.storageService
                .getFile$(elementProperty.value, elementProperty.storageBackend)
                .pipe(take(1));
            }
          }
          return of(undefined);
        }),
        toArray(),
        concatMap(values => {
          const filteredValues = values.filter(value => value !== undefined);
          if (filteredValues.length !== predictionTemplate.input?.length) {
            return of('');
          }
          return this.predict(filteredValues, modelUrl);
        }),
        map(prediction => {
          return {
            ...predictionTemplate,
            predValue: prediction,
          };
        })
      );
  }
}
