import { Injectable } from '@angular/core';
import {
  Configuration,
  DataObjectReference,
  DataObjectReferenceApi,
  FileReference,
  FileReferenceApi,
  StructuredDataReference,
  StructureddataReferenceApi,
} from '@dlr-shepard/shepard-client';
import { UserFacadeService } from '../../../user/services/user-facade.service';
import { environment } from '../../../../environments/environment';
import { filter, from, map, Observable } from 'rxjs';
import { isShepardUser } from '../../../shared/util/common-utils';

@Injectable({
  providedIn: 'root',
})
export class ReferenceService {
  private _fileReferenceApi: FileReferenceApi | undefined;
  private _structuredDataReferenceApi: StructureddataReferenceApi | undefined;
  private _dataObjectReferenceApi: DataObjectReferenceApi | undefined;
  constructor(private readonly userService: UserFacadeService) {
    this.userService.currentProfile$
      .pipe(filter(isShepardUser))
      .subscribe(profile => {
        const config: Configuration = new Configuration({
          basePath: environment.shepardUrl,
          apiKey: profile.shepardApiKey,
        });
        this._fileReferenceApi = new FileReferenceApi(config);
        this._structuredDataReferenceApi = new StructureddataReferenceApi(
          config
        );
        this._dataObjectReferenceApi = new DataObjectReferenceApi(config);
      });
  }

  public getAllFileReferences$(
    collectionId: number,
    dataObjectId: number
  ): Observable<FileReference[]> {
    return from(
      this._fileReferenceApi!.getAllFileReferences({
        collectionId,
        dataObjectId,
      })
    );
  }

  public createFileReference$(
    collectionId: number,
    dataObjectId: number,
    fileContainerId: number,
    fileOid: string,
    refName: string
  ): Observable<FileReference> {
    return from(
      this._fileReferenceApi!.createFileReference({
        collectionId,
        dataObjectId,
        fileReference: {
          fileContainerId,
          fileOids: [fileOid],
          name: refName,
        },
      })
    );
  }

  public deleteFileReference$(
    collectionId: number,
    dataObjectId: number,
    fileReferenceId: number
  ): Observable<void> {
    return from(
      this._fileReferenceApi!.deleteFileReference({
        collectionId,
        dataObjectId,
        fileReferenceId,
      })
    );
  }

  public getAllDataObjectReferences$(
    collectionId: number,
    dataObjectId: number
  ): Observable<DataObjectReference[]> {
    return from(
      this._dataObjectReferenceApi!.getAllDataObjectReferences({
        collectionId,
        dataObjectId,
      })
    );
  }
  public getDataObjectReferenceByName$(
    collectionId: number,
    dataObjectId: number,
    name: string
  ): Observable<DataObjectReference | undefined> {
    return this.getAllDataObjectReferences$(collectionId, dataObjectId).pipe(
      map(refs => refs.find(ref => ref.name === name))
    );
  }
  public createDataObjectReference$(
    collectionId: number,
    dataObjectId: number,
    referencedDataObjectId: number,
    refName: string
  ): Observable<DataObjectReference> {
    return from(
      this._dataObjectReferenceApi!.createDataObjectReference({
        collectionId,
        dataObjectId,
        dataObjectReference: {
          referencedDataObjectId,
          name: refName,
        },
      })
    );
  }

  public deleteDataObjectReference$(
    collectionId: number,
    dataObjectId: number,
    dataObjectReferenceId: number
  ): Observable<void> {
    return from(
      this._dataObjectReferenceApi!.deleteDataObjectReference({
        collectionId,
        dataObjectId,
        dataObjectReferenceId,
      })
    );
  }

  public getAllStructuredDataReferences$(
    collectionId: number,
    dataObjectId: number
  ): Observable<StructuredDataReference[]> {
    return from(
      this._structuredDataReferenceApi!.getAllStructuredDataReferences({
        collectionId,
        dataObjectId,
      })
    );
  }

  public getStructuredDataReferenceByName$(
    collectionId: number,
    dataObjectId: number,
    name: string
  ): Observable<StructuredDataReference | undefined> {
    return this.getAllStructuredDataReferences$(
      collectionId,
      dataObjectId
    ).pipe(map(refs => refs.find(ref => ref.name === name)));
  }

  public createStructuredDataReference$(
    collectionId: number,
    dataObjectId: number,
    structuredDataContainerId: number,
    structuredDataOid: string,
    refName: string
  ): Observable<StructuredDataReference> {
    return from(
      this._structuredDataReferenceApi!.createStructuredDataReference({
        collectionId,
        dataObjectId,
        structuredDataReference: {
          structuredDataContainerId,
          structuredDataOids: [structuredDataOid],
          name: refName,
        },
      })
    );
  }

  public deleteStructuredDataReference$(
    collectionId: number,
    dataObjectId: number,
    structuredDataReferenceId: number
  ): Observable<void> {
    return from(
      this._structuredDataReferenceApi!.deleteStructuredDataReference({
        collectionId,
        dataObjectId,
        structureddataReferenceId: structuredDataReferenceId,
      })
    );
  }
}
