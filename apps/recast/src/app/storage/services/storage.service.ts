import { Inject, Injectable } from '@angular/core';
import {
  Element,
  ElementProperty,
  Process,
  StepProperty,
} from '../../../../build/openapi/recast';
import StorageBackendEnum = ElementProperty.StorageBackendEnum;
import { StorageAdapterInterface } from './adapter/storage-adapter-interface';
import {
  BehaviorSubject,
  filter,
  from,
  map,
  mergeAll,
  Observable,
  of,
  switchMap,
  take,
  toArray,
} from 'rxjs';
import { UserFacadeService } from '../../user/services/user-facade.service';
import {
  ElementViewModel,
  ElementViewProperty,
  ValueType,
} from '../../model/element-view-model';
import { ElementViewModelFacadeService } from '../../services/element-view-model-facade.service';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private _storageBackend$: BehaviorSubject<StorageBackendEnum | undefined> =
    new BehaviorSubject<StorageBackendEnum | undefined>(undefined);
  constructor(
    @Inject('StorageAdapterInterface')
    private readonly storageAdapters: StorageAdapterInterface[],
    private readonly userService: UserFacadeService,
    private readonly elementViewModelService: ElementViewModelFacadeService
  ) {
    this.userService.currentProfile$.subscribe(profile => {
      const storageBackend =
        profile.storageBackend ?? StorageBackendEnum.Postgres;
      this._storageBackend$.next(storageBackend);
    });
  }

  public loadValues$(elementId: number): Observable<ElementViewModel> {
    return this.elementViewModelService
      .elementViewModelByElementId$(elementId)
      .pipe(
        filter(Boolean),
        switchMap(elementViewModel => {
          const properties = elementViewModel.properties;
          const observables = properties.map(property => {
            if (!property.value) {
              return of(property);
            }
            return this.loadValue$(elementId, property).pipe(
              take(1),
              map(value => ({
                ...property,
                value,
              }))
            );
          });
          return from(observables).pipe(
            mergeAll(),
            toArray(),
            map(props => ({
              ...elementViewModel,
              properties: props,
            }))
          );
        })
      );
  }

  public loadValue$(
    elementId: number,
    elementProperty: ElementViewProperty
  ): Observable<ValueType> {
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
        return storageAdapter.loadValue$(elementId, elementProperty);
      })
    );
  }

  public updateValue$(
    element: Element,
    stepProperty: StepProperty,
    value: any
  ): Observable<void> {
    return this._storageBackend$.pipe(
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

  public deleteProcess$(process: Process): Observable<void> {
    return this._storageBackend$.pipe(
      filter(Boolean),
      switchMap(backend => {
        const storageAdapter = this.storageAdapters.find(
          adapter => adapter.getType() === backend
        );
        if (!storageAdapter) {
          throw new Error(`No such Storage Backend: ${backend}`);
        }
        return storageAdapter.deleteProcess$(process);
      })
    );
  }
}
