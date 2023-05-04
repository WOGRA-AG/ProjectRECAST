import { Injectable } from '@angular/core';
import { StorageAdapterInterface } from './storage-adapter-interface';
import {
  Element,
  ElementProperty,
  StepProperty,
} from 'src/../build/openapi/recast';
import TypeEnum = StepProperty.TypeEnum;
import StorageBackendEnum = ElementProperty.StorageBackendEnum;
import { ShepardService } from '../shepard.service';
import {
  catchError,
  concatMap,
  filter,
  firstValueFrom,
  map,
  mergeMap,
  Observable,
  of,
  tap,
} from 'rxjs';
import { ElementPropertyService } from '../../../services/element-property.service';
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { StepFacadeService } from '../../../services/step-facade.service';
import { DataObject } from '@dlr-shepard/shepard-client';
import { StepPropertyService } from '../../../services/step-property.service';
import { ElementFacadeService } from '../../../services/element-facade.service';
import { isReference } from '../../../shared/util/common-utils';

@Injectable({
  providedIn: 'root',
})
export class ShepardAdapter implements StorageAdapterInterface {
  constructor(
    private readonly shepardService: ShepardService,
    private readonly elementPropertyService: ElementPropertyService,
    private readonly stepPropertyService: StepPropertyService,
    private readonly stepService: StepFacadeService,
    private readonly elementService: ElementFacadeService
  ) {}
  public getType(): StorageBackendEnum {
    return StorageBackendEnum.Shepard;
  }

  public loadValue$(
    elementProperty: ElementProperty,
    type: TypeEnum
  ): Observable<string | File> {
    const value = elementProperty.value;
    if (!value) {
      return of('');
    }
    if (isReference(type) && value) {
      return this.elementService
        .elementById$(+value)
        .pipe(map(e => '' + e?.id ?? ''));
    }
    if (type === TypeEnum.File) {
      return this.shepardService.getFileById$(value);
    }
    let stepProp: StepProperty;
    let dataObjId: number;
    return this.stepPropertyService
      .stepPropertyById$(elementProperty.stepPropertyId!)
      .pipe(
        filter(Boolean),
        tap(stepProperty => (stepProp = stepProperty)),
        concatMap(() => this.shepardService.getDataObjectById$(+value)),
        tap(dataObj => {
          dataObjId = dataObj.id!;
        }),
        concatMap(() => this.stepService.stepById$(stepProp.stepId!)),
        mergeMap(step =>
          this.shepardService.getStructuredDataFromDataObject$(
            dataObjId,
            step.name!
          )
        ),
        map(structuredData => {
          const payload = JSON.parse(structuredData.payload!);
          return payload[stepProp.name!];
        })
      );
  }

  public async saveValue(
    element: Element,
    property: StepProperty,
    value: any,
    type: TypeEnum
  ): Promise<void> {
    const dataObj$ = this.shepardService
      .getDataObjectByName$(element.name ?? '')
      .pipe(
        concatMap(dataObject => {
          if (!!dataObject) {
            return of(dataObject).pipe(map(dataObj => dataObj.id));
          }
          return this.shepardService.createDataObject$(element.name ?? '');
        }),
        filter(Boolean)
      );

    const dataObjectId = await firstValueFrom(dataObj$);

    if (isReference(type)) {
      //TODO: prevent duplicate references
      return firstValueFrom(
        this.elementService.elementById$(+value).pipe(
          concatMap(ele => {
            if (!ele) {
              return of(undefined);
            }
            return this.shepardService.getDataObjectByName$(ele.name!);
          }),
          concatMap(dataObject => {
            if (!dataObject) {
              return of(undefined);
            }
            return this.shepardService.addDataObjectToDataObject$(
              dataObject.id!,
              dataObjectId
            );
          }),
          concatMap(() =>
            this.elementPropertyService.saveElementProp$({
              value: `${value}`,
              stepPropertyId: property.id,
              storageBackend: this.getType(),
              elementId: element.id,
            })
          ),
          map(ref => {
            if (!ref) {
              console.error('Could not save reference');
            }
            return;
          })
        )
      );
    }

    if (type === TypeEnum.File) {
      const elementProperty = await firstValueFrom(
        this.elementPropertyService.elementPropertyByStepPropertyId$(
          element.id!,
          property.id!
        )
      );
      if (!!elementProperty) {
        await firstValueFrom(
          this.deleteFileProp$(elementProperty, dataObjectId),
          {
            defaultValue: undefined,
          }
        );
      }
      if (!!value && value instanceof File) {
        value = await firstValueFrom(
          this.saveFile$(
            value,
            property,
            element,
            dataObjectId,
            property.name!
          ),
          { defaultValue: undefined }
        );
      }
    }

    const structuredDataId = await firstValueFrom(
      this.saveStructuredData$(property, value)
    );

    await firstValueFrom(
      this.addStructuredDataToDataObj$(property, dataObjectId, structuredDataId)
    );

    await firstValueFrom(
      this.elementPropertyService.saveElementProp$({
        value: type !== TypeEnum.File ? `${dataObjectId}` : value,
        stepPropertyId: property.id,
        storageBackend: this.getType(),
        elementId: element.id,
      })
    );
    return;
  }

  public deleteElement$(element: Element): Observable<void> {
    return this.shepardService.deleteDataObject$(element.name ?? '').pipe(
      mergeMap(() => this.elementService.deleteElement$(element.id!)),
      catchError(() => of(undefined)),
      map(err => {
        if (err) {
          console.error(err);
        }
        return;
      })
    );
  }

  private addStructuredDataToDataObj$(
    property: StepProperty,
    dataObjectId: number,
    strucDataId: string
  ): Observable<DataObject> {
    let stepName = '';
    return this.stepService.stepById$(property.stepId!).pipe(
      filter(Boolean),
      tap(step => {
        stepName = step.name!;
      }),
      mergeMap(() =>
        this.shepardService.removeStructuredDataFromDataObject$(
          dataObjectId,
          stepName
        )
      ),
      mergeMap(() =>
        this.shepardService.addStructuredDataToDataObject$(
          dataObjectId,
          strucDataId,
          stepName
        )
      )
    );
  }

  private saveStructuredData$(
    property: StepProperty,
    value: any
  ): Observable<string> {
    return this.stepService.stepById$(property.stepId!).pipe(
      mergeMap(step =>
        this.shepardService.uploadStructuredData$(
          step.name ?? '',
          property.name ?? '',
          value
        )
      ),
      catchError(err => {
        console.error(err);
        return of(undefined);
      }),
      filter(strucData => !!strucData),
      map(strucData => strucData?.oid ?? '')
    );
  }

  private saveFile$(
    value: File,
    property: StepProperty,
    element: Element,
    dataObjectId: number,
    refName: string
  ): Observable<string> {
    let fileOid = '';
    return this.shepardService.uploadFile$(value).pipe(
      catchError(err => {
        console.error(err);
        return of(undefined);
      }),
      filter(fileId => !!fileId),
      mergeMap(fileId => {
        fileOid = fileId!;
        return this.shepardService.addFileToDataObject$(
          dataObjectId,
          fileOid,
          refName
        );
      }),
      mergeMap(() =>
        this.elementPropertyService.saveElementProp$({
          value: fileOid,
          stepPropertyId: property.id,
          storageBackend: this.getType(),
          elementId: element.id,
        })
      ),
      map(elementProp => elementProp.value ?? '')
    );
  }

  private deleteFileProp$(
    prop: ElementProperty,
    dataObjectId: number
  ): Observable<PostgrestSingleResponse<any> | undefined> {
    if (!(prop.id && prop.value)) {
      return of(undefined);
    }
    return this.shepardService
      .removeFileFromDataObject$(dataObjectId, prop.value!)
      .pipe(
        concatMap(() => this.shepardService.deleteFile$(prop.value!)),
        concatMap(() =>
          this.elementPropertyService.deleteElementProperty$(prop.id!)
        )
      );
  }
}
