import { Injectable } from '@angular/core';
import {
  DataObject,
  StructuredDataContainer,
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
} from 'rxjs';
import { FileService } from './file.service';
import { StructuredDataService } from './structured-data.service';
import { CollectionService } from './collection.service';
import { ReferenceService } from './reference.service';
import { DataObjectService } from './data-object.service';

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
    private readonly dataObjectService: DataObjectService
  ) {}

  public getCollectionByProcessId$(
    processId: number
  ): Observable<Collection | undefined> {
    return this.collectionService.getCollectionByAttribute$(
      'process_id',
      '' + processId
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

  public deleteCollection$(processId: number): Observable<void> {
    return this.getCollectionByProcessId$(processId).pipe(
      filter(Boolean),
      switchMap(collection =>
        this.collectionService.deleteCollection$(collection.id!)
      )
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

  public deleteFile$ = (fileId: string): Observable<void> =>
    this.fileService.getRecastFileContainer$().pipe(
      filter(Boolean),
      concatMap(fc => this.fileService.deleteFileByOid$(fc.id!, fileId))
    );

  public getDataObjectById$(
    dataObjectId: number,
    processId: number
  ): Observable<DataObject> {
    return this.getCollectionByProcessId$(processId).pipe(
      filter(Boolean),
      switchMap(collection =>
        this.dataObjectService.getDataObjectById$(collection.id!, dataObjectId)
      )
    );
  }

  public getDataObjectByElementId$(
    elementId: number,
    processId: number
  ): Observable<DataObject | undefined> {
    return this.getCollectionByProcessId$(processId).pipe(
      filter(Boolean),
      switchMap(collection =>
        this.dataObjectService.getDataObjectByAttribute$(
          collection.id!,
          'element_id',
          '' + elementId
        )
      )
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

  public deleteDataObjectById$(
    processId: number,
    dataObjectId: number
  ): Observable<void> {
    return this.getCollectionByProcessId$(processId).pipe(
      filter(Boolean),
      switchMap(collection =>
        this.dataObjectService.deleteDataObjectById$(
          collection.id!,
          dataObjectId
        )
      )
    );
  }

  public upsertStructuredData$(
    name: string,
    propertyName: string,
    value: string
  ): Observable<StructuredData> {
    return this.structuredDataService.getRecastStructuredDataContainer$().pipe(
      filter(Boolean),
      switchMap(container =>
        this.structuredDataService.upsertStructuredData$(
          container.id!,
          name,
          propertyName,
          value
        )
      )
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
    refId: number,
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
          refId,
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
      switchMap(collection => {
        collectionId = collection.id!;
        return this.referenceService.getStructuredDataReferenceByName$(
          collectionId,
          dataObjectId,
          refName
        );
      }),
      switchMap(structuredDataRef =>
        this.referenceService.deleteStructuredDataReference$(
          collectionId,
          dataObjectId,
          structuredDataRef?.id!
        )
      ),
      catchError(() => of(undefined))
    );
  }

  public getStructuredDataFromDataObject$(
    dataObjId: number,
    refName: string,
    processId: number
  ): Observable<StructuredDataPayload> {
    const req: Observable<StructuredDataContainer> =
      this.structuredDataService.getRecastStructuredDataContainer$();
    return req.pipe(
      filter(Boolean),
      switchMap(() => this.getCollectionByProcessId$(processId)),
      switchMap(collection => {
        if (!collection?.id) {
          throw new Error('Collection not found');
        }
        return this.referenceService.getStructuredDataReferenceByName$(
          collection.id,
          dataObjId,
          refName
        );
      }),
      map(structDataRef => {
        if (!structDataRef?.structuredDataOids?.length) {
          throw new Error('Structured Data Reference not found');
        }
        return structDataRef.structuredDataOids[0];
      }),
      switchMap(structuredDataOid =>
        this.structuredDataService.getStructuredDataPayload$(structuredDataOid)
      )
    );
  }
}
