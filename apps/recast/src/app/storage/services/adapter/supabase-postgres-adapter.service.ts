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
  switchMap,
  take,
} from 'rxjs';
import {
  ElementPropertyService,
  ElementFacadeService,
  ProcessFacadeService,
  StepPropertyService,
} from '../../../services';
import {
  fileToStr$,
  isReference,
  strToFile,
} from '../../../shared/util/common-utils';
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
    elementId: number,
    elementViewProperty: ElementViewProperty
  ): Observable<ValueType> {
    const val = '' + elementViewProperty.value;
    const type = elementViewProperty.type;
    if (val && type === TypeEnum.File) {
      return from(strToFile(val)).pipe(filter(Boolean), take(1));
    }
    if (isReference(type) && val) {
      return this.elementService.elementById$(+val);
    }
    return of(val ?? '');
  }

  public saveValues$(elementViewModel: ElementViewModel): Observable<void> {
    return from(elementViewModel.properties).pipe(
      mergeMap(property =>
        this.saveValue$(
          elementViewModel.element,
          property.stepPropId,
          property.value,
          property.type
        )
      ),
      map(() => undefined)
    );
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

  private saveValue$(
    element: Element,
    stepPropertyId: number,
    value: any,
    type: TypeEnum
  ): Observable<ElementProperty | undefined> {
    if (!value) {
      return of(undefined);
    }
    const obs = of(value);
    if (type === TypeEnum.File && value) {
      obs.pipe(switchMap(val => fileToStr$(val)));
    }
    return obs.pipe(
      mergeMap(val =>
        this.elementPropertyService.saveElementProp$({
          value: val,
          stepPropertyId,
          storageBackend: this.getType(),
          elementId: element.id,
        })
      ),
      take(1)
    );
  }
}
