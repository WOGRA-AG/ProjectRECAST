import { Injectable } from '@angular/core';
import {
  Configuration,
  DataObject,
  DataObjectApi,
} from '@dlr-shepard/shepard-client';
import { UserFacadeService } from '../../../user/services/user-facade.service';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  filter,
  from,
  map,
  Observable,
  of,
  switchMap,
  take,
  tap,
} from 'rxjs';
import {
  elementComparator,
  isShepardUser,
} from '../../../shared/util/common-utils';
import { CollectionService } from './collection.service';

@Injectable({
  providedIn: 'root',
})
export class DataObjectService {
  private _dataObjectApi: DataObjectApi | undefined;
  private _dataObjects: BehaviorSubject<DataObject[]> = new BehaviorSubject<
    DataObject[]
  >([]);

  constructor(
    private readonly userService: UserFacadeService,
    private readonly collectionService: CollectionService
  ) {
    this.userService.currentProfile$
      .pipe(
        filter(isShepardUser),
        switchMap(profile =>
          this._initApi(profile.shepardUrl!, profile.shepardApiKey!)
        ),
        map(api => (this._dataObjectApi = api)),
        switchMap(() => this._getDataObjects())
      )
      .subscribe(dataObjects => {
        this._dataObjects.next(dataObjects);
      });
  }

  get dataObjects$(): Observable<DataObject[]> {
    return this._dataObjects
      .asObservable()
      .pipe(distinctUntilChanged(elementComparator));
  }

  get dataObjects(): DataObject[] {
    return this._dataObjects.getValue();
  }

  public dataObjectById$(
    dataObjectId: number
  ): Observable<DataObject | undefined> {
    return this.dataObjects$.pipe(
      filter(Boolean),
      map(dataObjects => dataObjects.find(d => d.id === dataObjectId)),
      distinctUntilChanged(elementComparator)
    );
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
    ).pipe(
      take(1),
      tap(dataObject => this._addDataObjectToState(dataObject))
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
    ).pipe(map(() => this._removeDataObjectFromState(dataObjectId)));
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

  private _getDataObjects(): Observable<DataObject[]> {
    return this.collectionService.collections$.pipe(
      filter(Boolean),
      switchMap(collections => {
        const observables = collections.map(collection =>
          this.getDataObjectsByCollectionId$(collection.id!)
        );
        return combineLatest(observables);
      }),
      map(arrays => arrays.reduce((acc, curr) => acc.concat(curr), []))
    );
  }

  private _initApi(
    shepardUrl: string,
    shepardApiKey: string
  ): Observable<DataObjectApi> {
    const config: Configuration = new Configuration({
      basePath: shepardUrl,
      apiKey: shepardApiKey,
    });
    const api = new DataObjectApi(config);
    return of(api);
  }

  private _removeDataObjectFromState(dataObjectId: number): void {
    this._dataObjects.next(
      this._dataObjects.getValue().filter(d => d.id !== dataObjectId) ?? []
    );
  }

  private _addDataObjectToState(dataObject: DataObject): void {
    const state = this._dataObjects.getValue();
    this._dataObjects.next(state.concat(dataObject));
  }
}
