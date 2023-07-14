import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  concatMap,
  distinctUntilChanged,
  filter,
  from,
  map,
  mergeMap,
  Observable,
  take,
  tap,
} from 'rxjs';
import {
  Collection,
  CollectionApi,
  Configuration,
  PermissionsPermissionTypeEnum,
} from '@dlr-shepard/shepard-client';
import { UserFacadeService } from '../../../user/services/user-facade.service';
import {
  elementComparator,
  isShepardUser,
} from '../../../shared/util/common-utils';

@Injectable({
  providedIn: 'root',
})
export class CollectionService {
  private _collectionApi: CollectionApi | undefined;
  private _collections: BehaviorSubject<Collection[]> = new BehaviorSubject<
    Collection[]
  >([]);

  constructor(private readonly userService: UserFacadeService) {
    this.userService.currentProfile$
      .pipe(filter(isShepardUser))
      .subscribe(profile => {
        const config: Configuration = new Configuration({
          basePath: profile.shepardUrl,
          apiKey: profile.shepardApiKey,
        });
        this._collectionApi = new CollectionApi(config);
        this.initCollections$().subscribe();
      });
  }

  get collections$(): Observable<Collection[]> {
    return this._collections.pipe(distinctUntilChanged(elementComparator));
  }

  get collections(): Collection[] {
    return this._collections.getValue();
  }

  public deleteCollection$(collectionId: number): Observable<void> {
    return from(
      this._collectionApi!.deleteCollection({
        collectionId,
      })
    ).pipe(
      map(() => {
        this._collections.next(
          this._collections.value.filter(c => c.id !== collectionId)
        );
      })
    );
  }

  public createCollection$(
    name: string,
    permission: PermissionsPermissionTypeEnum,
    processId: number
  ): Observable<Collection> {
    const req = this._collectionApi!.createCollection({
      collection: { name, attributes: { process_id: '' + processId } },
    });
    let collection: Collection;
    return from(req).pipe(
      filter(col => !!col.id),
      tap(col => (collection = col)),
      concatMap(col =>
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
      concatMap(perm =>
        from(
          this._collectionApi!.editCollectionPermissions({
            collectionId: collection.id!,
            permissions: perm,
          })
        )
      ),
      map(() => {
        this._collections.next(
          this.insertCollection(this._collections.value, collection)
        );
        return collection;
      })
    );
  }

  public getCollectionByAttribute$(
    attribute: string,
    value: string
  ): Observable<Collection | undefined> {
    return this._collections.pipe(
      map(collections =>
        collections.find(
          c =>
            Object.prototype.hasOwnProperty.call(c.attributes, attribute) &&
            c.attributes![attribute] === value
        )
      )
    );
  }

  public deleteAllCollectionsByName$(name: string): Observable<void> {
    return this._collections.pipe(
      take(1),
      map(collections => collections.filter(c => c.name === name)),
      concatMap(collections => from(collections)),
      mergeMap(collection => this.deleteCollection$(collection.id!))
    );
  }

  private initCollections$(): Observable<void> {
    return from(this._collectionApi!.getAllCollections({})).pipe(
      map(collections => this._collections.next(collections))
    );
  }

  private insertCollection(
    state: Collection[],
    collection: Collection
  ): Collection[] {
    return state.concat(collection);
  }
}
