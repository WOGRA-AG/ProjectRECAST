import { Injectable } from '@angular/core';
import {
  Configuration,
  DataObject,
  DataObjectApi,
} from '@dlr-shepard/shepard-client';
import { UserFacadeService } from '../../../user/services/user-facade.service';
import { filter, from, map, Observable, of, switchMap } from 'rxjs';
import { isShepardUser } from '../../../shared/util/common-utils';

@Injectable({
  providedIn: 'root',
})
export class DataObjectService {
  private _dataObjectApi: DataObjectApi | undefined;

  constructor(private readonly userService: UserFacadeService) {
    this.userService.currentProfile$
      .pipe(filter(isShepardUser))
      .subscribe(profile => {
        const config: Configuration = new Configuration({
          basePath: profile.shepardUrl,
          apiKey: profile.shepardApiKey,
        });
        this._dataObjectApi = new DataObjectApi(config);
      });
  }

  public createDataObject$(
    collectionId: number,
    attributes: { [key: string]: string },
    name: string
  ): Observable<DataObject> {
    return from(
      this._dataObjectApi!.createDataObject({
        collectionId,
        dataObject: {
          collectionId,
          name,
          attributes,
        },
      })
    );
  }

  public getDataObjectById$(
    collectionId: number,
    dataObjectId: number
  ): Observable<DataObject> {
    return from(
      this._dataObjectApi!.getDataObject({
        collectionId,
        dataObjectId,
      })
    );
  }

  public deleteDataObjectById$(
    collectionId: number,
    dataObjectId: number
  ): Observable<void> {
    return from(
      this._dataObjectApi!.deleteDataObject({
        collectionId,
        dataObjectId,
      })
    );
  }

  public deleteDataObjectByAttribute$(
    collectionId: number,
    attribute: string,
    value: string
  ): Observable<void> {
    return this.getDataObjectByAttribute$(collectionId, attribute, value).pipe(
      map(dataObject => dataObject),
      switchMap(dataObject => {
        if (!dataObject) {
          return of(undefined);
        }
        return this.deleteDataObjectById$(collectionId, dataObject.id!);
      })
    );
  }

  public getDataObjectByAttribute$(
    collectionId: number,
    attribute: string,
    value: string
  ): Observable<DataObject | undefined> {
    return from(
      this._dataObjectApi!.getAllDataObjects({
        collectionId,
      })
    ).pipe(
      map(dataObjects =>
        dataObjects.find(
          d =>
            d.attributes?.hasOwnProperty(attribute) &&
            d.attributes[attribute] === value
        )
      )
    );
  }

  public getDataObjectsByCollectionId$(
    collectionId: number
  ): Observable<DataObject[]> {
    return from(
      this._dataObjectApi!.getAllDataObjects({
        collectionId,
      })
    );
  }
}
