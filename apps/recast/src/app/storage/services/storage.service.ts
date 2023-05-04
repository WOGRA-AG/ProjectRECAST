import { Inject, Injectable } from '@angular/core';
import {
  Element,
  ElementProperty,
  StepProperty,
} from '../../../../build/openapi/recast';
import StorageBackendEnum = ElementProperty.StorageBackendEnum;
import { StorageAdapterInterface } from './adapter/storage-adapter-interface';
import TypeEnum = StepProperty.TypeEnum;
import {
  BehaviorSubject,
  filter,
  firstValueFrom,
  map,
  Observable,
  switchMap,
} from 'rxjs';
import { UserFacadeService } from '../../user/services/user-facade.service';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private _storageBackend$: BehaviorSubject<StorageBackendEnum | undefined> =
    new BehaviorSubject<StorageBackendEnum | undefined>(undefined);
  constructor(
    @Inject('StorageAdapterInterface')
    private readonly storageAdapters: StorageAdapterInterface[],
    private readonly userService: UserFacadeService
  ) {
    this.userService.currentProfile$.subscribe(profile => {
      const storageBackend =
        profile.storageBackend ?? StorageBackendEnum.Postgres;
      this._storageBackend$.next(storageBackend);
    });
  }

  public loadValue$(
    elementProperty: ElementProperty,
    type: TypeEnum
  ): Observable<string | File> {
    return this._storageBackend$.pipe(
      filter(Boolean),
      map(backend => elementProperty.storageBackend ?? backend),
      switchMap(backend => {
        const storageAdapter = this.storageAdapters.find(
          adapter => adapter.getType() === backend
        );
        if (!storageAdapter) {
          throw new Error(`No such Storage Backend: ${backend}`);
        }
        return storageAdapter.loadValue$(elementProperty, type);
      })
    );
  }

  public updateValue(
    element: Element,
    stepProperty: StepProperty,
    value: any
  ): Promise<void> {
    return firstValueFrom(
      this._storageBackend$.pipe(
        filter(Boolean),
        switchMap(backend => {
          const storageAdapter = this.storageAdapters.find(
            adapter => adapter.getType() === backend
          );
          if (!storageAdapter) {
            throw new Error(`No such Storage Backend: ${backend}`);
          }
          return storageAdapter.saveValue(
            element,
            stepProperty,
            value,
            stepProperty.type!
          );
        })
      )
    );
  }

  public deleteElement$(element: Element): Observable<void> {
    return this._storageBackend$.pipe(
      filter(Boolean),
      switchMap(backend => {
        const storageAdapter = this.storageAdapters.find(
          adapter => adapter.getType() === backend
        );
        if (!storageAdapter) {
          throw new Error(`No such Storage Backend: ${backend}`);
        }
        return storageAdapter.deleteElement$(element);
      })
    );
  }
}
