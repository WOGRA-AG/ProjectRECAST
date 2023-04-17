import { Injectable } from '@angular/core';
import { StorageAdapterInterface } from './storage-adapter-interface';
import {
  ElementProperty,
  StepProperty,
} from '../../../../build/openapi/recast';
import TypeEnum = StepProperty.TypeEnum;
import StorageBackendEnum = ElementProperty.StorageBackendEnum;
import { catchError, of, take } from 'rxjs';
import { ElementPropertyService } from '../element-property.service';

@Injectable({
  providedIn: 'root',
})
export class SupabasePostgresAdapter implements StorageAdapterInterface {
  constructor(private elementPropertyService: ElementPropertyService) {}
  public getType(): StorageBackendEnum {
    return StorageBackendEnum.Postgres;
  }

  public loadValue(val: string | undefined): string {
    return val ?? '';
  }

  public saveValue(
    elementId: number | undefined,
    property: StepProperty,
    value: any,
    _: TypeEnum
  ): void {
    this.elementPropertyService
      .saveElementProp$(
        {
          value,
          stepPropertyId: property.id,
        },
        elementId
      )
      .pipe(
        catchError(err => {
          console.error(err);
          return of(undefined);
        }),
        take(1)
      )
      .subscribe();
  }
}
