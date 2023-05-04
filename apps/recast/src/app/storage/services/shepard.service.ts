import { Injectable } from '@angular/core';
import {
  Collection,
  CollectionApi,
  Configuration,
  DataObject,
  DataObjectApi,
  FileApi,
  FileContainer,
  FileReferenceApi,
  PermissionsPermissionTypeEnum,
  StructuredData,
  StructureddataApi,
  StructureddataReferenceApi,
  StructuredDataContainer,
  StructuredDataPayload,
  DataObjectReferenceApi,
  DataObjectReference,
} from '@dlr-shepard/shepard-client';
import { environment } from '../../../environments/environment';
import { UserFacadeService } from '../../user/services/user-facade.service';
import {
  BehaviorSubject,
  catchError,
  combineLatestWith,
  concatMap,
  distinctUntilChanged,
  filter,
  from,
  map,
  mergeMap,
  Observable,
  of,
  take,
  tap,
} from 'rxjs';
import { elementComparator } from '../../shared/util/common-utils';
import { Profile } from '../../../../build/openapi/recast';

@Injectable({
  providedIn: 'root',
})
export class ShepardService {
  private _collectionApi: CollectionApi | undefined;
  private _fileApi: FileApi | undefined;
  private _structuredDataApi: StructureddataApi | undefined;
  private _dataObjectApi: DataObjectApi | undefined;
  private _fileReferenceApi: FileReferenceApi | undefined;
  private _structuredDataReferenceApi: StructureddataReferenceApi | undefined;
  private _dataObjectReferenceApi: DataObjectReferenceApi | undefined;
  private _apiKey = '';
  private _collections: BehaviorSubject<Collection[]> = new BehaviorSubject<
    Collection[]
  >([]);
  private _fileContainers: BehaviorSubject<FileContainer[]> =
    new BehaviorSubject<FileContainer[]>([]);
  private _strucDataContainers: BehaviorSubject<StructuredDataContainer[]> =
    new BehaviorSubject<StructuredDataContainer[]>([]);
  private readonly _collectionName: string = 'recast';
  private readonly _fileContainerName: string = 'recast';
  private readonly _structuredDataContainerName: string = 'recast';

  constructor(private readonly userService: UserFacadeService) {
    this.userService.currentProfile$.subscribe(profile => {
      this.initApi(profile);
      this.initData();
    });
  }

  get collections$(): Observable<Collection[]> {
    return this._collections.pipe(distinctUntilChanged(elementComparator));
  }

  get collections(): Collection[] {
    return this._collections.getValue();
  }

  get fileContainers$(): Observable<FileContainer[]> {
    return this._fileContainers.pipe(distinctUntilChanged(elementComparator));
  }

  get structuredDataContainers$(): Observable<StructuredDataContainer[]> {
    return this._strucDataContainers.pipe(
      distinctUntilChanged(elementComparator)
    );
  }

  public getCollectionByName$(
    name: string
  ): Observable<Collection | undefined> {
    return this.collections$.pipe(
      map(collections => collections.find(c => c.name === name))
    );
  }

  public getFileContainerByName$(
    fileContainerName: string
  ): Observable<FileContainer> {
    return this.fileContainers$.pipe(
      map(fileContainers =>
        fileContainers.find(c => c.name === fileContainerName)
      ),
      filter(Boolean)
    );
  }

  public fileContainerByName$(name: string): Observable<FileContainer> {
    return this.fileContainers$.pipe(
      map(fileContainers => fileContainers.find(c => c.name! === name)),
      filter(Boolean)
    );
  }

  public getFileById$(fileId: string): Observable<File> {
    let fileContainerId: number;
    let fileName = '';
    return this.fileContainerByName$(this._fileContainerName).pipe(
      filter(fc => !!fc.id),
      concatMap(fc => {
        fileContainerId = fc.id!;
        return this._fileApi!.getAllFiles({ fileContainerId });
      }),
      map(files => files.find(f => f.oid === fileId)),
      filter(Boolean),
      concatMap(shepFile => {
        fileName = shepFile.filename ?? '';
        return this._fileApi!.getFile({ fileContainerId, oid: fileId });
      }),
      map(
        blob =>
          new File([blob], fileName, {
            type: blob.type,
          })
      )
    );
  }

  public getStructuredDataContainerByName$(
    name: string
  ): Observable<StructuredDataContainer> {
    return this.structuredDataContainers$.pipe(
      map(sdc => sdc.find(c => c.name === name)),
      filter(Boolean)
    );
  }

  public uploadFile$(file: File): Observable<string> {
    return this.fileContainerByName$(this._fileContainerName).pipe(
      mergeMap(fc =>
        this._fileApi!.createFile({ fileContainerId: fc.id!, file })
      ),
      filter(res => !!res.oid),
      map(res => res.oid!)
    );
  }

  public deleteFile$(fileOid: string): Observable<void> {
    return this.fileContainerByName$(this._fileContainerName).pipe(
      mergeMap(fc =>
        this._fileApi!.deleteFile({ fileContainerId: fc.id!, oid: fileOid })
      ),
      catchError(() => of(undefined))
    );
  }

  public uploadStructuredData$(
    structuredDataName: string,
    propertyName: string,
    value: string
  ): Observable<StructuredData> {
    let structureddataContainerId: number;
    return this.getStructuredDataContainerByName$(
      this._structuredDataContainerName
    ).pipe(
      mergeMap(container => {
        structureddataContainerId = container.id!;
        return this.getStructuredData$(container.id!);
      }),
      mergeMap(sd => {
        const strucData = sd.find(e => e.name === structuredDataName);
        if (!strucData) {
          return this.createStructuredData$(
            structureddataContainerId,
            propertyName,
            structuredDataName,
            value
          );
        }
        return this.updateStructuredData$(
          structureddataContainerId,
          propertyName,
          strucData,
          value
        );
      })
    );
  }

  public getStructuredData$(containerId: number): Observable<StructuredData[]> {
    const req = this._structuredDataApi!.getAllStructuredDatas({
      structureddataContainerId: containerId,
    });
    return from(req).pipe(distinctUntilChanged(elementComparator));
  }

  public getStructuredDataById$(
    structuredDataId: string
  ): Observable<StructuredDataPayload> {
    return this._strucDataContainers.pipe(
      map(sdc => sdc.find(s => s.name === this._structuredDataContainerName)),
      mergeMap(scd =>
        this._structuredDataApi!.getStructuredData({
          structureddataContainerId: scd?.id!,
          oid: structuredDataId,
        })
      )
    );
  }

  public createDataObject$(
    dataObjectName: string
  ): Observable<number | undefined> {
    return this.getCollectionByName$(this._collectionName).pipe(
      filter(Boolean),
      mergeMap(collection =>
        this._dataObjectApi!.createDataObject({
          collectionId: collection.id!,
          dataObject: { collectionId: collection.id!, name: dataObjectName },
        })
      ),
      map(dataObj => dataObj.id)
    );
  }

  public getDataObjectByName$(
    dataObjectName: string
  ): Observable<DataObject | undefined> {
    return this.getCollectionByName$(this._collectionName).pipe(
      filter(Boolean),
      mergeMap(collection =>
        this._dataObjectApi!.getAllDataObjects({
          collectionId: collection.id!,
        })
      ),
      map(dataObjects => dataObjects.find(d => d.name === dataObjectName))
    );
  }

  public getDataObjectById$(dataObjectId: number): Observable<DataObject> {
    return this.getCollectionByName$(this._collectionName).pipe(
      filter(Boolean),
      mergeMap(collection =>
        this._dataObjectApi!.getDataObject({
          collectionId: collection.id!,
          dataObjectId,
        })
      )
    );
  }

  public deleteDataObject$(name: string): Observable<void> {
    let collectionId: number;
    return this.getCollectionByName$(this._collectionName).pipe(
      filter(Boolean),
      mergeMap(collection => {
        collectionId = collection.id!;
        return this.getDataObjectByName$(name);
      }),
      mergeMap(dataObject => {
        if (!dataObject?.id) {
          return of(undefined);
        }
        return this._dataObjectApi!.deleteDataObject({
          collectionId,
          dataObjectId: dataObject.id!,
        });
      }),
      catchError(() => of(undefined))
    );
  }

  public addFileToDataObject$(
    dataObjectId: number,
    fileOid: string,
    refName: string
  ): Observable<number> {
    return this.getCollectionByName$(this._collectionName).pipe(
      filter(Boolean),
      combineLatestWith(this.getFileContainerByName$(this._fileContainerName)),
      mergeMap(([collection, fileContainer]) =>
        this._fileReferenceApi!.createFileReference({
          collectionId: collection.id!,
          dataObjectId,
          fileReference: {
            fileOids: [fileOid],
            fileContainerId: fileContainer.id!,
            name: refName,
          },
        })
      ),
      map(fileRef => fileRef.id!)
    );
  }

  public removeFileFromDataObject$(
    dataObjectId: number,
    fileOid: string
  ): Observable<void> {
    let collectionId: number;
    return this.getCollectionByName$(this._collectionName).pipe(
      filter(Boolean),
      mergeMap(collection => {
        collectionId = collection.id!;
        return this._fileReferenceApi!.getAllFileReferences({
          collectionId,
          dataObjectId,
        });
      }),
      map(fileRefs =>
        fileRefs.find(fileRef => fileRef.fileOids.includes(fileOid))
      ),
      mergeMap(fileRef =>
        this._fileReferenceApi!.deleteFileReference({
          collectionId,
          dataObjectId,
          fileReferenceId: fileRef?.id!,
        })
      ),
      catchError(() => of(undefined))
    );
  }

  public addDataObjectToDataObject$(
    refId: number,
    dataObjectId: number
  ): Observable<DataObjectReference> {
    return this.getCollectionByName$(this._collectionName).pipe(
      filter(Boolean),
      concatMap(collection =>
        this._dataObjectReferenceApi!.createDataObjectReference({
          collectionId: collection.id!,
          dataObjectId,
          dataObjectReference: {
            name: '' + refId,
            dataObjectId,
            referencedDataObjectId: refId,
          },
        })
      )
    );
  }
  public addStructuredDataToDataObject$(
    dataObjectId: number,
    structuredDataOid: string,
    refName: string
  ): Observable<DataObject> {
    return this.getCollectionByName$(this._collectionName).pipe(
      filter(Boolean),
      combineLatestWith(
        this.getStructuredDataContainerByName$(
          this._structuredDataContainerName
        )
      ),
      mergeMap(([collection, sdc]) =>
        this._structuredDataReferenceApi!.createStructuredDataReference({
          collectionId: collection.id!,
          dataObjectId,
          structuredDataReference: {
            structuredDataContainerId: sdc.id!,
            structuredDataOids: [structuredDataOid],
            name: refName,
          },
        })
      )
    );
  }

  public removeStructuredDataFromDataObject$(
    dataObjectId: number,
    refName: string
  ): Observable<void> {
    let collectionId: number;
    return this.getCollectionByName$(this._collectionName).pipe(
      filter(Boolean),
      mergeMap(collection => {
        collectionId = collection.id!;
        return this._structuredDataReferenceApi!.getAllStructuredDataReferences(
          {
            collectionId,
            dataObjectId,
          }
        );
      }),
      map(structuredDataRefs =>
        structuredDataRefs.find(
          structuredDataRef => structuredDataRef.name === refName
        )
      ),
      mergeMap(structuredDataRef =>
        this._structuredDataReferenceApi!.deleteStructuredDataReference({
          collectionId,
          dataObjectId,
          structureddataReferenceId: structuredDataRef?.id!,
        })
      ),
      catchError(() => of(undefined))
    );
  }

  public getStructuredDataFromDataObject$(
    dataObjId: number,
    refName: string
  ): Observable<StructuredDataPayload> {
    let structureddataContainerId: number;
    return this.getStructuredDataContainerByName$(
      this._structuredDataContainerName
    ).pipe(
      filter(Boolean),
      tap(sdc => (structureddataContainerId = sdc.id!)),
      mergeMap(() => this.getCollectionByName$(this._collectionName)),
      filter(Boolean),
      mergeMap(collection =>
        this._structuredDataReferenceApi!.getAllStructuredDataReferences({
          collectionId: collection.id!,
          dataObjectId: dataObjId,
        })
      ),
      map(structuredDataRefs =>
        structuredDataRefs.find(s => s.name === refName)
      ),
      filter(Boolean),
      map(structDataRef => structDataRef.structuredDataOids[0]),
      mergeMap(structuredDataOid =>
        this._structuredDataApi!.getStructuredData({
          oid: structuredDataOid,
          structureddataContainerId,
        })
      )
    );
  }

  private updateStructuredData$(
    structureddataContainerId: number,
    propertyName: string,
    strucData: StructuredData,
    value: string
  ): Observable<StructuredData> {
    return from(
      this._structuredDataApi!.getStructuredData({
        structureddataContainerId,
        oid: strucData.oid!,
      })
    ).pipe(
      mergeMap(strucDataPay =>
        this.deleteStructuredData$(strucData, structureddataContainerId).pipe(
          map(() => strucDataPay)
        )
      ),
      mergeMap((sdp: StructuredDataPayload) => {
        let payload = sdp.payload ? JSON.parse(sdp.payload) : {};
        payload[propertyName] = value;
        delete payload._id;
        delete payload._meta;
        payload = JSON.stringify(payload);
        return from(
          this._structuredDataApi!.createStructuredData({
            structureddataContainerId,
            structuredDataPayload: {
              structuredData: { name: strucData.name },
              payload,
            },
          })
        );
      })
    );
  }

  private createStructuredData$(
    structureddataContainerId: number,
    propertyName: string,
    elementName: string,
    value: string
  ): Observable<StructuredData> {
    const payload = JSON.stringify({ [propertyName]: value });
    const structuredDataPayload = {
      structuredData: { name: elementName },
      payload,
    };
    return from(
      this._structuredDataApi!.createStructuredData({
        structureddataContainerId,
        structuredDataPayload,
      })
    );
  }

  private deleteStructuredData$(
    strucData: StructuredData,
    structureddataContainerId: number
  ): Observable<void> {
    return from(
      this._structuredDataApi!.deleteStructuredData({
        structureddataContainerId,
        oid: strucData.oid!,
      })
    );
  }

  private createCollection(
    name: string,
    permission: PermissionsPermissionTypeEnum
  ): Observable<Collection> {
    const req = this._collectionApi!.createCollection({
      collection: { name },
    });
    let collection: Collection;
    return from(req).pipe(
      filter(col => !!col.id),
      tap(col => (collection = col)),
      mergeMap(col =>
        from(
          this._collectionApi!.getCollectionPermissions({
            collectionId: col.id!,
          })
        )
      ),
      map(perm => {
        perm.permissionType = permission;
        return perm;
      }),
      mergeMap(perm =>
        from(
          this._collectionApi!.editCollectionPermissions({
            collectionId: collection.id!,
            permissions: perm,
          })
        )
      ),
      map(() => collection)
    );
  }
  private initCollections(): void {
    this._collectionApi!.getAllCollections({}).then(col => {
      if (!col.some(c => c.name === this._collectionName)) {
        this.createCollection(this._collectionName, 'Private')
          .pipe(take(1))
          .subscribe(value =>
            this._collections.next(this.insertCollection(col, value))
          );
      }
      this._collections.next(col);
    });
  }

  private initFileContainers(): void {
    this._fileApi?.getAllFileContainers({}).then(fc => {
      if (!fc.some(c => c.name === this._fileContainerName)) {
        this._fileApi
          ?.createFileContainer({
            fileContainer: { name: this._fileContainerName },
          })
          .then(value =>
            this._fileContainers.next(this.insertFileContainer(fc, value))
          );
      }
      this._fileContainers.next(fc);
    });
  }

  private initStructuredDataContainers(): void {
    this._structuredDataApi?.getAllStructuredDataContainers({}).then(sdc => {
      if (!sdc.some(c => c.name === this._structuredDataContainerName)) {
        this._structuredDataApi
          ?.createStructuredDataContainer({
            structuredDataContainer: {
              name: this._structuredDataContainerName,
            },
          })
          .then(value =>
            this._strucDataContainers.next(
              this.insertStructuredDataContainer(sdc, value)
            )
          );
      }
      this._strucDataContainers.next(sdc);
    });
  }

  private insertCollection(
    state: Collection[],
    collection: Collection
  ): Collection[] {
    return state.concat(collection);
  }

  private insertFileContainer(
    state: FileContainer[],
    fc: FileContainer
  ): FileContainer[] {
    return state.concat(fc);
  }

  private insertStructuredDataContainer(
    state: StructuredDataContainer[],
    sdc: StructuredDataContainer
  ): StructuredDataContainer[] {
    return state.concat(sdc);
  }

  private initApi(profile: Profile): void {
    this._apiKey = profile.shepardApiKey ?? '';
    this._collectionApi = new CollectionApi(this.shepardConfig());
    this._fileApi = new FileApi(this.shepardConfig());
    this._structuredDataApi = new StructureddataApi(this.shepardConfig());
    this._dataObjectApi = new DataObjectApi(this.shepardConfig());
    this._fileReferenceApi = new FileReferenceApi(this.shepardConfig());
    this._structuredDataReferenceApi = new StructureddataReferenceApi(
      this.shepardConfig()
    );
    this._dataObjectReferenceApi = new DataObjectReferenceApi(
      this.shepardConfig()
    );
  }

  private initData(): void {
    this.initCollections();
    this.initFileContainers();
    this.initStructuredDataContainers();
  }

  private shepardConfig(): Configuration {
    return new Configuration({
      basePath: environment.shepardUrl,
      apiKey: this._apiKey,
    });
  }
}
