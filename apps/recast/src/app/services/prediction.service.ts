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
import {
  ElementProperty,
  PredictionTemplate,
  StepProperty,
  ValueType,
} from '../../../build/openapi/recast';
import { StepPropertyService } from './step-property.service';
import { environment } from '../../environments/environment';
import { toLower } from 'lodash';
import mime from 'mime';

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
    if (!Array.isArray(inputVal)) {
      const mimeType: string = this._getMimeType(inputVal);
      const headers = {
        'Content-Type': mimeType,
      };
      return this.http.post(modelUrl, inputVal, {
        headers,
      }) as Observable<string>;
    }
    //TODO: Test with multiple input Values of different types
    return this.http.post(modelUrl, inputVal) as Observable<string>;
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
          if (!stepProperty) {
            return of(undefined);
          }
          return this._getValue(
            elementProperty,
            stepProperty,
            predictionTemplate
          );
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

  private _getMimeType(inputVal: string | File | undefined): string {
    if (inputVal instanceof File) {
      return mime.getType(inputVal.name) ?? inputVal.type;
    }
    return 'text/plain';
  }

  private _getValue(
    elementProperty: ElementProperty,
    stepProperty: StepProperty,
    predictionTemplate: PredictionTemplate
  ): Observable<string | File | undefined> {
    if (
      !elementProperty.value ||
      !this._isStepPropertyInPredictionTemplate(
        stepProperty,
        predictionTemplate
      )
    ) {
      return of(undefined);
    }
    // TODO: add support for more types
    switch (stepProperty.type) {
      case ValueType.Image:
        return this.storageService
          .getFile$(elementProperty.value, elementProperty.storageBackend)
          .pipe(take(1));
      case ValueType.File:
        return this.storageService.getFile$(
          elementProperty.value,
          elementProperty.storageBackend
        );
      default:
        return of(elementProperty.value);
    }
  }

  private _isStepPropertyInPredictionTemplate(
    stepProperty: StepProperty,
    predictionTemplate: PredictionTemplate
  ): boolean {
    return (
      !!stepProperty?.name &&
      (predictionTemplate.input
        ?.map(toLower)
        .includes(stepProperty.name.toLowerCase()) ??
        false)
    );
  }
}
