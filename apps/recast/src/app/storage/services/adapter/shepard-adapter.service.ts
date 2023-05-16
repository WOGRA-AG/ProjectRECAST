import { Injectable } from '@angular/core';
import { StorageAdapterInterface } from './storage-adapter-interface';
import {
  Element,
  ElementProperty,
  Process,
  Step,
  StepProperty,
} from 'src/../build/openapi/recast';
import TypeEnum = StepProperty.TypeEnum;
import StorageBackendEnum = ElementProperty.StorageBackendEnum;
import { ShepardFacadeService } from '../shepard/shepard-facade.service';
import {
  catchError,
  concatMap,
  filter,
  firstValueFrom,
  map,
  mergeMap,
  Observable,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { ElementPropertyService } from '../../../services/element-property.service';
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { StepFacadeService } from '../../../services/step-facade.service';
import {
  DataObject,
  PermissionsPermissionTypeEnum,
  StructuredDataPayload,
} from '@dlr-shepard/shepard-client';
import { StepPropertyService } from '../../../services/step-property.service';
import { ElementFacadeService } from '../../../services/element-facade.service';
import { isReference } from '../../../shared/util/common-utils';
import { ProcessFacadeService } from '../../../services/process-facade.service';
import {
  ElementViewProperty,
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
    elementId: number,
    elementViewProperty: ElementViewProperty
  ): Observable<ValueType> {
    const value = '' + elementViewProperty.value;
    const type = elementViewProperty.type;
    if (!value) {
      return of('');
    }
    if (isReference(type) && value) {
      return this.elementService
        .elementById$(+value)
        .pipe(map(e => '' + e?.id ?? ''));
    }
    if (type === TypeEnum.File) {
      return this.shepardService
        .getFileById$(value)
        .pipe(catchError(() => of(new File([], ''))));
    }
    let stepProp: StepProperty;
    let dataObjId: number;
    let processId: number;
    return this.elementService.elementById$(elementId).pipe(
      concatMap((element: Element): Observable<StepProperty | undefined> => {
        if (!element) {
          return of(undefined);
        }
        processId = element.processId!;
        return this.stepPropertyService.stepPropertyById$(
          elementViewProperty.stepPropId
        );
      }),
      filter(Boolean),
      concatMap(
        (stepProperty: StepProperty): Observable<Process | undefined> => {
          stepProp = stepProperty;
          return this.processService.processById$(processId);
        }
      ),
      filter(Boolean),
      concatMap(
        (): Observable<DataObject> =>
          this.shepardService.getDataObjectById$(+value, processId)
      ),
      concatMap((dataObj: DataObject): Observable<Step | undefined> => {
        dataObjId = dataObj.id!;
        return this.stepService.stepById$(stepProp.stepId!);
      }),
      concatMap(
        (step: Step | undefined): Observable<StructuredDataPayload> =>
          this.shepardService.getStructuredDataFromDataObject$(
            dataObjId,
            step?.name!,
            processId
          )
      ),
      map((structuredData: StructuredDataPayload): string | File => {
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
    const processId = element.processId!;
    const dataObj$ = this.processService.processById$(processId).pipe(
      filter(Boolean),
      switchMap(process =>
        this.shepardService.createCollection$(
          process.name!,
          PermissionsPermissionTypeEnum.Private,
          processId
        )
      ),
      switchMap(() =>
        this.shepardService.getDataObjectByElementId$(
          element.id!,
          element.processId!
        )
      ),
      catchError(() => of(undefined)),
      switchMap(dataObject => {
        if (!!dataObject) {
          return of(dataObject);
        }
        return this.shepardService.createDataObject$(
          processId,
          element.id!,
          element.name ?? ''
        );
      }),
      map((dataObject: DataObject) => dataObject.id!)
    );

    const dataObjectId: number = await firstValueFrom(dataObj$);

    if (isReference(type)) {
      if (!value) {
        return;
      }
      return firstValueFrom(
        this.elementService.elementById$(+value).pipe(
          switchMap(ele => {
            if (!ele) {
              return of(undefined);
            }
            return this.shepardService.getDataObjectByElementId$(
              ele.id!,
              ele.processId!
            );
          }),
          switchMap(dataObject => {
            if (!dataObject) {
              return of(undefined);
            }
            return this.shepardService.addDataObjectToDataObject$(
              dataObject.id!,
              dataObjectId,
              property.name!,
              processId
            );
          }),
          switchMap(() =>
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
          this.deleteFileProp$(elementProperty, dataObjectId, processId),
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
      this.addStructuredDataToDataObj$(
        property,
        dataObjectId,
        structuredDataId,
        processId
      )
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
    return this.shepardService
      .deleteDataObjectById$(element.processId!, element.id!)
      .pipe(
        catchError(() => of(undefined)),
        mergeMap(() => this.elementService.deleteElement$(element.id!)),
        map(err => {
          if (err) {
            console.error(err);
          }
          return;
        })
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

  private addStructuredDataToDataObj$(
    property: StepProperty,
    dataObjectId: number,
    strucDataId: string,
    processId: number
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
          stepName,
          processId
        )
      ),
      mergeMap(() =>
        this.shepardService.addStructuredDataToDataObject$(
          dataObjectId,
          strucDataId,
          stepName,
          processId
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
        this.shepardService.upsertStructuredData$(
          step?.name ?? '',
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
    return this.shepardService.createFile$(value).pipe(
      catchError(err => {
        console.error(err);
        return of(undefined);
      }),
      filter(Boolean),
      mergeMap(fileId => {
        fileOid = fileId!;
        return this.shepardService.addFileToDataObject$(
          dataObjectId,
          fileOid,
          refName,
          element.processId!
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
