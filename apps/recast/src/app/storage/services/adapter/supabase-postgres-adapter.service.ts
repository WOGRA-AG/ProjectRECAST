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
import {
  filter,
  from,
  map,
  mergeMap,
  Observable,
  of,
  take,
  toArray,
} from 'rxjs';
import {
  ElementPropertyService,
  ElementFacadeService,
  ProcessFacadeService,
  StepPropertyService,
} from '../../../services';
import { fileToStr$, strToFile } from '../../../shared/util/common-utils';
import {
  ElementViewModel,
  ElementViewProperty,
  ValueType,
} from '../../../model/element-view-model';

@Injectable({
  providedIn: 'root',
})
export class SupabasePostgresAdapter implements StorageAdapterInterface {
  constructor(
    private elementPropertyService: ElementPropertyService,
    private stepPropertyService: StepPropertyService,
    private elementService: ElementFacadeService,
    private processService: ProcessFacadeService
  ) {}
  public getType(): StorageBackendEnum {
    return StorageBackendEnum.Postgres;
  }

  public loadValue$(
    elementViewProperty: ElementViewProperty
  ): Observable<ValueType> {
    const val = '' + elementViewProperty.value;
    const type = elementViewProperty.type;
    if (val && type === TypeEnum.File) {
      return from(strToFile(val)).pipe(filter(Boolean), take(1));
    }
    if (this.processService.isReference(type) && val) {
      return this.elementService
        .elementById$(+val)
        .pipe(map(element => element.id ?? 0));
    }
    if (val && type === TypeEnum.Boolean) {
      return of(val === 'true');
    }
    return of(val ?? '');
  }

  public saveValues$(
    elementViewModel: ElementViewModel
  ): Observable<ElementViewModel> {
    return from(elementViewModel.properties).pipe(
      mergeMap(elemViewProp => this.saveValue$(elemViewProp)),
      map((val, index) => ({
        ...elementViewModel.properties[index],
        value: val,
        storageBackend: this.getType(),
      })),
      toArray(),
      map(elementViewProperties => ({
        ...elementViewModel,
        properties: elementViewProperties,
      }))
    );
  }

  public deleteElement$(_: Element): Observable<void> {
    return of(undefined);
  }

  public deleteProcess$(_: Process): Observable<void> {
    return of(undefined);
  }

  private saveValue$(
    elementViewProperty: ElementViewProperty
  ): Observable<string | undefined> {
    const value = elementViewProperty.value;
    const type = elementViewProperty.type;
    if (!value && type !== TypeEnum.Boolean) {
      return of(undefined);
    }
    if (type === TypeEnum.Boolean && typeof value === 'undefined') {
      return of(value);
    }
    if (type === TypeEnum.File && value instanceof File) {
      // save file in supabase s3 and return the id
      return fileToStr$(value);
    }
    return of('' + value);
  }
}
