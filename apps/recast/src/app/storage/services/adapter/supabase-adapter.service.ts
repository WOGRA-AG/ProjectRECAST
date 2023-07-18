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
  forkJoin,
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
import {
  ElementViewModel,
  ElementViewProperty,
  ValueType,
} from '../../../model/element-view-model';
import { FileService } from '../supabase/file.service';

@Injectable({
  providedIn: 'root',
})
export class SupabaseAdapter implements StorageAdapterInterface {
  constructor(
    private elementPropertyService: ElementPropertyService,
    private stepPropertyService: StepPropertyService,
    private elementService: ElementFacadeService,
    private processService: ProcessFacadeService,
    private fileService: FileService
  ) {}
  public getType(): StorageBackendEnum {
    return StorageBackendEnum.Postgres;
  }

  public loadValue$(
    elementViewProperty: ElementViewProperty
  ): Observable<ValueType> {
    const value = '' + elementViewProperty.value;
    const type = elementViewProperty.type;
    if (value && type === TypeEnum.File) {
      return this.fileService.getFile$(value).pipe(take(1));
    }
    if (this.processService.isReference(type) && value) {
      return this.elementService
        .elementById$(+value)
        .pipe(map(element => element.id ?? 0));
    }
    if (value && type === TypeEnum.Boolean) {
      return of(value === 'true');
    }
    return of(value ?? '');
  }

  public saveValues$(
    elementViewModel: ElementViewModel
  ): Observable<ElementViewModel> {
    const processId = elementViewModel.process.id;
    const elementId = elementViewModel.element.id ?? 0;
    return from(elementViewModel.properties).pipe(
      mergeMap(elemViewProp =>
        this.saveValue$(elemViewProp, processId, elementId)
      ),
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

  public deleteElement$(element: Element): Observable<void> {
    const observables: Observable<void>[] = [];
    element.elementProperties?.map(prop => {
      const stepPropId = this.stepPropertyService.stepPropertyById(
        prop.stepPropertyId ?? 0
      );
      if (stepPropId?.type === TypeEnum.File && prop.value) {
        observables.push(this.fileService.deleteFile$(prop.value));
      }
    });
    return observables.length
      ? forkJoin(observables).pipe(map(() => undefined))
      : of(undefined);
  }

  public deleteProcess$(_: Process): Observable<void> {
    return of(undefined);
  }

  private saveValue$(
    elementViewProperty: ElementViewProperty,
    processId: number,
    elementId: number
  ): Observable<string | undefined> {
    const value = elementViewProperty.value;
    const type = elementViewProperty.type;
    const stepPropId = elementViewProperty.stepPropId;
    if (!value && type !== TypeEnum.Boolean) {
      return of(undefined);
    }
    if (type === TypeEnum.Boolean && typeof value === 'undefined') {
      return of(value);
    }
    if (type === TypeEnum.File && value instanceof File) {
      const path = `${processId}/${elementId}/${stepPropId}/${value.name}`;
      return this.fileService.saveFile$(path, value).pipe(take(1));
    }
    return of('' + value);
  }
}
