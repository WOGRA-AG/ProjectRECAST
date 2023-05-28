import { Injectable } from '@angular/core';
import {
  DataObject,
  StructuredDataPayload,
  DataObjectReference,
  PermissionsPermissionTypeEnum,
  Collection,
  StructuredData,
} from '@dlr-shepard/shepard-client';
import { UserFacadeService } from '../../../user/services/user-facade.service';
import {
  catchError,
  combineLatestWith,
  concatMap,
  filter,
  map,
  switchMap,
  Observable,
  of,
  tap,
  zip,
} from 'rxjs';
import { FileService } from './file.service';
import { StructuredDataService } from './structured-data.service';
import { CollectionService } from './collection.service';
import { ReferenceService } from './reference.service';
import { DataObjectService } from './data-object.service';
import { ElementFacadeService, ProcessFacadeService } from '../../../services';

@Injectable({
  providedIn: 'root',
})
export class ShepardFacadeService {
  constructor(
    private readonly userService: UserFacadeService,
    private readonly fileService: FileService,
    private readonly structuredDataService: StructuredDataService,
    private readonly collectionService: CollectionService,
    private readonly referenceService: ReferenceService,
    private readonly dataObjectService: DataObjectService,
    private readonly elementService: ElementFacadeService,
    private readonly processService: ProcessFacadeService
  ) {}

  public getCollectionByProcessId$(
    processId: number
  ): Observable<Collection | undefined> {
    return this.collectionService.getCollectionByAttribute$(
      'process_id',
      '' + processId
    );
  }

  public getOrCreateCollectionByProcessId$(
    processId: number
  ): Observable<Collection> {
    return this.getCollectionByProcessId$(processId).pipe(
      switchMap(collection => {
        if (collection) {
          return of(collection);
        }
        const processName = this.processService.processById(processId)?.name!;
        return this.createCollection$(
          processName,
          PermissionsPermissionTypeEnum.Private,
          processId
        );
      })
    );
  }

  public createCollection$(
    name: string,
    permission: PermissionsPermissionTypeEnum,
    processId: number
  ): Observable<Collection> {
    return this.getCollectionByProcessId$(processId).pipe(
      switchMap(collection => {
        if (collection) {
          return of(collection);
        } else {
          return this.collectionService.createCollection$(
            name,
            permission,
            processId
          );
        }
      })
    );
  }

  public deleteCollectionByProcessId$(processId: number): Observable<void> {
    return this.getCollectionByProcessId$(processId).pipe(
      switchMap(collection => {
        if (!collection) {
          return of(undefined);
        }
        return this.collectionService.deleteCollection$(collection.id!);
      })
    );
  }

  public getFileById$(fileId: string): Observable<File> {
    let fileContainerId: number;
    let fileName = '';
    return this.fileService.getRecastFileContainer$().pipe(
      filter(fc => !!fc.id),
      concatMap(fc => {
        fileContainerId = fc.id!;
        return this.fileService.getFileByOid$(fileContainerId, fileId);
      }),
      concatMap(shepFile => {
        if (!shepFile) {
          return of(undefined);
        }
        fileName = shepFile.filename ?? '';
        return this.fileService.getBlobByOid$(fileContainerId, fileId);
      }),
      map(blob => {
        if (!blob) {
          throw Error('Could not get file blob');
        }
        return new File([blob], fileName, {
          type: blob.type,
        });
      })
    );
  }

  public createFile$(file: File): Observable<string> {
    return this.fileService.getRecastFileContainer$().pipe(
      filter(Boolean),
      concatMap(fc => this.fileService.createFile$(fc.id!, file)),
      map(shepardFile => shepardFile.oid!)
    );
  }

  public getAllDataObjects$(): Observable<DataObject[]> {
    return this.dataObjectService.dataObjects$;
  }

  public getDataObjectById$(dataObjectId: number): Observable<DataObject> {
    return this.dataObjectService.dataObjectById$(dataObjectId).pipe(
      map(dataObject => {
        if (!dataObject) {
          throw Error('Could not find data object');
        }
        return dataObject;
      })
    );
  }

  public getElementIdFromDataObjectId$(
    dataObjectId: number
  ): Observable<number> {
    return this.getDataObjectById$(dataObjectId).pipe(
      map(dataObject => {
        if (!dataObject.attributes) {
          throw Error('Could not find data object for element');
        }
        const elementId = dataObject.attributes['element_id'];
        return +elementId;
      })
    );
  }

  public getDataObjectByElementIdAndProcessId$(
    elementId: number,
    processId: number
  ): Observable<DataObject> {
    return this.getOrCreateCollectionByProcessId$(processId).pipe(
      filter(Boolean),
      switchMap(collection =>
        this.dataObjectService.getDataObjectByAttribute$(
          collection.id!,
          'element_id',
          '' + elementId
        )
      ),
      switchMap(dataObject => {
        if (dataObject) {
          return of(dataObject);
        }
        const elementName = this.elementService.elementById(elementId)?.name!;
        return this.createDataObject$(processId, elementId, elementName);
      })
    );
  }

  public createDataObject$(
    processId: number,
    elementId: number,
    name: string
  ): Observable<DataObject> {
    const attributes = { element_id: '' + elementId };
    return this.getCollectionByProcessId$(processId).pipe(
      filter(Boolean),
      switchMap(collection =>
        this.dataObjectService.createDataObject$(
          collection.id!,
          attributes,
          name
        )
      )
    );
  }

  public deleteDataObjectByElementId$(
    processId: number,
    elementId: number
  ): Observable<void> {
    return this.getCollectionByProcessId$(processId).pipe(
      switchMap(collection => {
        if (!collection) {
          return of(undefined);
        }
        return this.dataObjectService.deleteDataObjectByAttribute$(
          collection.id!,
          'element_id',
          '' + elementId
        );
      })
    );
  }

  public createStructuredDataOnDataObject$(
    elementId: number,
    processId: number,
    name: string,
    payload: string
  ): Observable<StructuredData | undefined> {
    const structuredDataPayload: StructuredDataPayload = {
      structuredData: {
        name,
      },
      payload,
    };
    return this.getDataObjectByElementId$(elementId).pipe(
      switchMap(dataObject => {
        if (!dataObject) {
          const elementName = this.elementService.elementById(elementId)?.name!;
          return this.createDataObject$(processId, elementId, elementName);
        }
        return of(dataObject);
      }),
      filter(Boolean),
      concatMap(dataObject =>
        this.removeStructuredDataFromDataObject$(
          dataObject.id!,
          name,
          processId
        )
      ),
      concatMap(() =>
        this.structuredDataService.getRecastStructuredDataContainer$()
      ),
      filter(Boolean),
      concatMap(container =>
        this.structuredDataService.createStructuredData$(
          container.id!,
          structuredDataPayload
        )
      ),
      concatMap(structuredData =>
        zip(this.getDataObjectByElementId$(elementId), of(structuredData))
      ),
      concatMap(([dataObject, structuredData]) => {
        if (!dataObject) {
          return zip(of(undefined), of(structuredData));
        }
        return zip(
          this.addStructuredDataToDataObject$(
            dataObject.id!,
            structuredData.oid!,
            name,
            processId
          ),
          of(structuredData)
        );
      }),
      map(([_, structuredData]) => structuredData)
    );
  }

  public addFileToDataObject$(
    dataObjectId: number,
    fileOid: string,
    refName: string,
    processId: number
  ): Observable<number> {
    return this.getCollectionByProcessId$(processId).pipe(
      filter(Boolean),
      combineLatestWith(this.fileService.getRecastFileContainer$()),
      switchMap(([collection, fileContainer]) =>
        this.referenceService.createFileReference$(
          collection.id!,
          dataObjectId,
          fileContainer.id!,
          fileOid,
          refName
        )
      ),
      map(fileRef => fileRef.id!)
    );
  }

  public removeFileFromDataObject$(
    dataObjectId: number,
    fileOid: string,
    processId: number
  ): Observable<void> {
    let collectionId: number;
    return this.getCollectionByProcessId$(processId).pipe(
      filter(Boolean),
      switchMap(collection => {
        collectionId = collection.id!;
        return this.referenceService.getAllFileReferences$(
          collectionId,
          dataObjectId
        );
      }),
      map(fileRefs =>
        fileRefs.find(fileRef => fileRef.fileOids.includes(fileOid))
      ),
      switchMap(fileRef =>
        this.referenceService.deleteFileReference$(
          collectionId,
          dataObjectId,
          fileRef?.id!
        )
      ),
      catchError(() => of(undefined))
    );
  }
  public addDataObjectToDataObject$(
    referencedDataObjectId: number,
    dataObjectId: number,
    refName: string,
    processId: number
  ): Observable<DataObjectReference> {
    let collectionId: number;
    return this.getCollectionByProcessId$(processId).pipe(
      filter(Boolean),
      tap(collection => (collectionId = collection.id!)),
      switchMap(() =>
        this.referenceService.getDataObjectReferenceByName$(
          collectionId,
          dataObjectId,
          refName
        )
      ),
      switchMap(ref => {
        if (ref) {
          return this.referenceService.deleteDataObjectReference$(
            collectionId,
            dataObjectId,
            ref.id!
          );
        }
        return of(undefined);
      }),
      concatMap(() =>
        this.referenceService.createDataObjectReference$(
          collectionId,
          dataObjectId,
          referencedDataObjectId,
          refName
        )
      )
    );
  }
  public addStructuredDataToDataObject$(
    dataObjectId: number,
    structuredDataOid: string,
    refName: string,
    processId: number
  ): Observable<DataObject> {
    return this.getCollectionByProcessId$(processId).pipe(
      filter(Boolean),
      combineLatestWith(
        this.structuredDataService.getRecastStructuredDataContainer$()
      ),
      switchMap(([collection, sdc]) =>
        this.referenceService.createStructuredDataReference$(
          collection.id!,
          dataObjectId,
          sdc.id!,
          structuredDataOid,
          refName
        )
      )
    );
  }

  public removeStructuredDataFromDataObject$(
    dataObjectId: number,
    refName: string,
    processId: number
  ): Observable<void> {
    let collectionId: number;
    return this.getCollectionByProcessId$(processId).pipe(
      filter(Boolean),
      concatMap(collection => {
        collectionId = collection.id!;
        return this.referenceService.getStructuredDataReferenceByName$(
          collectionId,
          dataObjectId,
          refName
        );
      }),
      concatMap(structuredDataRef =>
        this.referenceService.deleteStructuredDataReference$(
          collectionId,
          dataObjectId,
          structuredDataRef?.id!
        )
      ),
      catchError(() => of(undefined))
    );
  }

  public getStructuredDataById$(
    oid: string
  ): Observable<StructuredDataPayload> {
    return this.structuredDataService.getStructuredDataPayload$(oid);
  }

  public getDataObjectByElementId$(
    elementId: number
  ): Observable<DataObject | undefined> {
    return this.getAllDataObjects$().pipe(
      map(dataObjects =>
        dataObjects.find(obj => {
          const attributes = obj.attributes;
          if (!attributes) {
            return false;
          }
          return attributes['element_id'] === '' + elementId;
        })
      )
    );
  }
}
