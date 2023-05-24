import { Injectable } from '@angular/core';
import { StorageAdapterInterface } from './storage-adapter-interface';
import {
  Element,
  ElementProperty,
  Process,
  StepProperty,
} from 'src/../build/openapi/recast';
import TypeEnum = StepProperty.TypeEnum;
import StorageBackendEnum = ElementProperty.StorageBackendEnum;
import { ShepardFacadeService } from '../shepard/shepard-facade.service';
import {
  catchError,
  concatMap,
  from,
  map,
  mergeMap,
  Observable,
  of,
  switchMap,
  take,
  toArray,
  zip,
} from 'rxjs';
import {
  ElementPropertyService,
  StepFacadeService,
  StepPropertyService,
  ElementFacadeService,
  ProcessFacadeService,
} from '../../../services';
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { groupBy$, isReference } from '../../../shared/util/common-utils';
import {
  ElementViewModel,
  ElementViewProperty,
  ShepardValue,
  ValueType,
} from '../../../model/element-view-model';

@Injectable({
  providedIn: 'root',
})
export class ShepardAdapter implements StorageAdapterInterface {
  constructor(
    private readonly shepardService: ShepardFacadeService,
    private readonly elementPropertyService: ElementPropertyService,
    private readonly stepPropertyService: StepPropertyService,
    private readonly stepService: StepFacadeService,
    private readonly elementService: ElementFacadeService,
    private readonly processService: ProcessFacadeService
  ) {}
  public getType(): StorageBackendEnum {
    return StorageBackendEnum.Shepard;
  }

  public loadValue$(
    elementViewProperty: ElementViewProperty
  ): Observable<ValueType> {
    const val = '' + elementViewProperty.value;
    const type = elementViewProperty.type;
    if (val && type === TypeEnum.File) {
      return this.shepardService
        .getFileById$(val)
        .pipe(catchError(() => of(new File([], ''))));
    }
    if (isReference(type) && val) {
      return this.elementService.elementById$(+val);
    }
    return this.shepardService.getStructuredDataById$(val).pipe(
      map(structuredData => {
        if (!structuredData.payload) {
          return '';
        }
        const payload = JSON.parse(structuredData.payload);
        const parsedValue = payload[elementViewProperty.label] as ShepardValue;
        const value = parsedValue.value;
        return type === TypeEnum.Boolean ? value === 'true' : value;
      })
    );
  }

  public saveValues$(
    elementViewModel: ElementViewModel
  ): Observable<ElementViewModel> {
    const elementViewModelCopy = { ...elementViewModel };
    return this._updateElementViewPropertiesWithReferences$(
      elementViewModelCopy.properties,
      elementViewModelCopy.element.id!,
      elementViewModelCopy.process.id!
    ).pipe(
      map(elementProperties => elementProperties.filter(p => !!p.value)),
      concatMap(elementProperties => groupBy$(elementProperties, 'stepId')),
      concatMap(({ key, values }) => {
        if (!values.length) {
          return zip(of(key), of(undefined));
        }
        const stepName = this.stepService.stepById(key)?.name;
        const structuredDataPayload: string = JSON.stringify(
          values.reduce(
            (acc, elementViewProperty) => ({
              ...acc,
              [elementViewProperty.label]: elementViewProperty.value,
            }),
            { stepName }
          )
        );
        return zip(of(key), of(structuredDataPayload));
      }),
      concatMap(([key, payload]) =>
        zip(
          of(key),
          this.shepardService.createStructuredDataOnDataObject$(
            elementViewModelCopy.element.id!,
            elementViewModelCopy.process.id!,
            '' + key,
            payload!
          )
        )
      ),
      map(([stepId, structuredData]) => {
        elementViewModelCopy.properties = elementViewModel.properties
          .filter(p => p.stepId === stepId)
          .map(p => {
            if (p.type === TypeEnum.File || isReference(p.type)) {
              const val = p.value;
              if (val?.hasOwnProperty('value')) {
                const parsedValue = val as ShepardValue;
                return {
                  ...p,
                  value: parsedValue.value,
                  storageBackend: this.getType(),
                };
              }
            }
            if (!p.value) {
              return p;
            }
            return {
              ...p,
              value: '' + structuredData?.oid,
              storageBackend: this.getType(),
            };
          });
        return elementViewModelCopy;
      })
    );
  }

  public deleteElement$(element: Element): Observable<void> {
    return this.shepardService.deleteDataObjectByElementId$(
      element.processId!,
      element.id!
    );
  }

  public deleteProcess$(process: Process): Observable<void> {
    return this.shepardService.deleteCollection$(process.id!).pipe(
      switchMap(() => this.processService.deleteProcess$(process.id!)),
      catchError(() => of(undefined)),
      map(err => {
        if (err) {
          console.error(err);
        }
        return;
      })
    );
  }

  private _updateElementViewPropertiesWithReferences$(
    elementViewProperties: ElementViewProperty[],
    elementId: number,
    processId: number
  ): Observable<ElementViewProperty[]> {
    return from(elementViewProperties).pipe(
      concatMap(elemViewProp =>
        this._saveValue$(elemViewProp, elementId, processId).pipe(take(1))
      ),
      concatMap((val, index) =>
        of({
          ...elementViewProperties[index],
          value: {
            type: elementViewProperties[index].type,
            value: val,
          },
          storageBackend: this.getType(),
        })
      ),
      toArray()
    );
  }

  private _saveValue$(
    elementViewProperty: ElementViewProperty,
    elementId: number,
    processId: number
  ): Observable<string | undefined> {
    const value = elementViewProperty.value;
    const type = elementViewProperty.type;
    if (typeof value === 'undefined' || !type) {
      return of(undefined);
    }
    if (type === TypeEnum.File && value instanceof File) {
      return this._saveFile$(
        elementId,
        processId,
        value,
        elementViewProperty.label
      );
    }
    if (isReference(type)) {
      return zip(
        this.shepardService.getDataObjectByElementId$(elementId, processId),
        this.shepardService.getDataObjectByElementId$(+value, processId)
      ).pipe(
        mergeMap(([dataObject, refDataObject]) =>
          zip(
            of(refDataObject),
            this.shepardService.addDataObjectToDataObject$(
              refDataObject.id!,
              dataObject.id!,
              refDataObject.name!,
              processId
            )
          )
        ),
        map(([refDataObject, _]) => '' + refDataObject.id)
      );
    }
    return of('' + value);
  }

  private _saveFile$(
    elementId: number,
    processId: number,
    value: File,
    refName: string
  ): Observable<string> {
    return zip(
      this.shepardService.createFile$(value),
      this.shepardService.getDataObjectByElementId$(elementId, processId)
    ).pipe(
      mergeMap(([fileId, dataObject]) =>
        zip(
          of(fileId),
          of(dataObject),
          this.shepardService.removeFileFromDataObject$(
            dataObject.id!,
            fileId,
            processId
          )
        )
      ),
      mergeMap(([fileId, dataObject]) =>
        zip(
          of(fileId),
          this.shepardService.addFileToDataObject$(
            dataObject.id!,
            fileId,
            refName,
            processId
          )
        )
      ),
      map(([fileId, _]) => fileId)
    );
  }

  private deleteFileProp$(
    prop: ElementProperty,
    dataObjectId: number,
    processId: number
  ): Observable<PostgrestSingleResponse<any> | undefined> {
    if (!(prop.id && prop.value)) {
      return of(undefined);
    }
    return this.shepardService
      .removeFileFromDataObject$(dataObjectId, prop.value!, processId)
      .pipe(
        concatMap(() => this.shepardService.deleteFile$(prop.value!)),
        catchError(() => of(undefined)),
        concatMap(() =>
          this.elementPropertyService.deleteElementProperty$(prop.id!)
        )
      );
  }
}
