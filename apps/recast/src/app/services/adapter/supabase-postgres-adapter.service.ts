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
import { isReference, strToFile } from '../../shared/util/common-utils';
import { ElementFacadeService } from '../element-facade.service';

@Injectable({
  providedIn: 'root',
})
export class SupabasePostgresAdapter implements StorageAdapterInterface {
  constructor(
    private elementPropertyService: ElementPropertyService,
    private elementService: ElementFacadeService
  ) {}
  public getType(): StorageBackendEnum {
    return StorageBackendEnum.Postgres;
  }

  public async loadValue(
    val: string | undefined,
    type: string
  ): Promise<string> {
    let retval = val ?? '';
    if (val && type === TypeEnum.File) {
      const file = await strToFile(val);
      retval = file?.name ?? '';
    }
    if (isReference(type) && val) {
      retval = '' + this.elementService.elementById(+val)?.id ?? '';
    }
    return retval;
  }

  public saveValue(
    elementId: number | undefined,
    property: StepProperty,
    value: any,
    _: TypeEnum,
    storageBackend: StorageBackendEnum
  ): void {
    this.elementPropertyService
      .saveElementProp$({
        value,
        stepPropertyId: property.id,
        storageBackend,
        elementId,
      })
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
