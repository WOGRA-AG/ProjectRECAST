import { Injectable } from '@angular/core';
import { StorageAdapterInterface } from './storage-adapter-interface';
import {
  ElementProperty,
  StepProperty,
} from '../../../../build/openapi/recast';
import TypeEnum = StepProperty.TypeEnum;
import StorageBackendEnum = ElementProperty.StorageBackendEnum;

@Injectable({
  providedIn: 'root',
})
export class ShepardAdapter implements StorageAdapterInterface {
  public getType(): StorageBackendEnum {
    return StorageBackendEnum.Shepard;
  }

  public loadValue(_: string | undefined): string {
    throw new Error('Not Implemented Yet');
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  public saveValue(
    elementId: number | undefined,
    property: StepProperty,
    value: any,
    type: TypeEnum
  ): void {
    throw new Error('Not Implemented Yet');
  }
}
