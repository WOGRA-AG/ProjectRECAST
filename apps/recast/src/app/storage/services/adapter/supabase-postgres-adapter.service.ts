import { Injectable } from '@angular/core';
import { StorageAdapterInterface } from './storage-adapter-interface';
import {
  Element,
  ElementProperty,
  Process,
  StepProperty,
} from '../../../../../build/openapi/recast';
import TypeEnum = StepProperty.TypeEnum;
import StorageBackendEnum = ElementProperty.StorageBackendEnum;
import { catchError, filter, from, map, Observable, of, take } from 'rxjs';
import { ElementPropertyService } from '../../../services/element-property.service';
import {
  fileToStr,
  isReference,
  strToFile,
} from '../../../shared/util/common-utils';
import { ElementFacadeService } from '../../../services/element-facade.service';
import { ProcessFacadeService } from '../../../services/process-facade.service';

@Injectable({
  providedIn: 'root',
})
export class SupabasePostgresAdapter implements StorageAdapterInterface {
  constructor(
    private elementPropertyService: ElementPropertyService,
    private elementService: ElementFacadeService,
    private processService: ProcessFacadeService
  ) {}
  public getType(): StorageBackendEnum {
    return StorageBackendEnum.Postgres;
  }

  public loadValue$(
    elementProperty: ElementProperty,
    type: string
  ): Observable<string | File> {
    const val = elementProperty.value;
    if (val && type === TypeEnum.File) {
      return from(strToFile(val)).pipe(filter(Boolean));
    }
    if (isReference(type) && val) {
      return this.elementService
        .elementById$(+val)
        .pipe(map(e => '' + e?.id ?? ''));
    }
    return of(val ?? '');
  }

  public async saveValue(
    element: Element,
    property: StepProperty,
    value: any,
    type: TypeEnum
  ): Promise<void> {
    if (type === TypeEnum.File && value) {
      value = await fileToStr(value);
    }
    this.elementPropertyService
      .saveElementProp$({
        value,
        stepPropertyId: property.id,
        storageBackend: this.getType(),
        elementId: element.id,
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

  public deleteElement$(element: Element): Observable<void> {
    return this.elementService.deleteElement$(element.id!).pipe(
      map(err => {
        if (err) {
          console.error(err);
        }
        return;
      })
    );
  }

  public deleteProcess$(process: Process): Observable<void> {
    return this.processService.deleteProcess$(process.id).pipe(
      map(err => {
        if (err) {
          console.error(err);
        }
        return;
      })
    );
  }
}
