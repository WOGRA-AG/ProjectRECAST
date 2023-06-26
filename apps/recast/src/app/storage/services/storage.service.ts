import { Inject, Injectable } from '@angular/core';
import {
  Element,
  ElementProperty,
  Process,
} from '../../../../build/openapi/recast';
import StorageBackendEnum = ElementProperty.StorageBackendEnum;
import { StorageAdapterInterface } from './adapter/storage-adapter-interface';
import {
  BehaviorSubject,
  catchError,
  concatAll,
  concatMap,
  filter,
  from,
  map,
  mergeAll,
  mergeMap,
  Observable,
  of,
  switchMap,
  take,
  toArray,
  zip,
} from 'rxjs';
import { UserFacadeService } from '../../user/services/user-facade.service';
import {
  ElementViewModel,
  ElementViewProperty,
  ValueType,
} from '../../model/element-view-model';
import { ElementFacadeService, ProcessFacadeService } from '../../services';

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
    private readonly elementService: ElementFacadeService,
    private readonly processService: ProcessFacadeService
  ) {
    this.userService.currentProfile$.subscribe(profile => {
      const storageBackend =
        profile.storageBackend ?? StorageBackendEnum.Postgres;
      this._storageBackend$.next(storageBackend);
    });
  }

  public loadValues$(
    elementViewModel: ElementViewModel
  ): Observable<ElementViewModel> {
    return of(elementViewModel).pipe(
      mergeMap(viewModel => {
        const properties = viewModel.properties;
        const observables = properties.map(property => {
          if (!property.value) {
            return of(property);
          }
          return this._loadValue$(property).pipe(
            take(1),
            map(value => ({
              ...property,
              value,
            }))
          );
        });
        return from(observables).pipe(
          concatAll(),
          toArray(),
          map(props => ({
            ...viewModel,
            properties: props,
          }))
        );
      })
    );
  }

  public updateValues$(
    elementViewModel: ElementViewModel
  ): Observable<ElementViewModel> {
    return this._storageBackend$.pipe(
      filter(Boolean),
      concatMap(backend => {
        const storageAdapter = this.storageAdapters.find(
          adapter => adapter.getType() === backend
        );
        if (!storageAdapter) {
          throw new Error(`No such Storage Backend: ${backend}`);
        }
        return storageAdapter.saveValues$(elementViewModel);
      })
    );
  }

  public deleteElement$(
    element: Element,
    elementViewModel: ElementViewModel
  ): Observable<void> {
    if (!element.id) {
      return of(undefined);
    }
    return this._storageBackend$.pipe(
      mergeMap(defaultBackend => {
        const observables: Observable<void>[] = [];
        const defaultAdapter = this.storageAdapters.find(
          adapter => adapter.getType() === defaultBackend
        );
        if (!elementViewModel?.storageBackends.length) {
          if (!defaultAdapter) {
            throw new Error(`No such Storage Backend: ${defaultBackend}`);
          }
          observables.push(defaultAdapter.deleteElement$(element));
        } else {
          if (!elementViewModel?.storageBackends.length) {
            return observables;
          }
          for (const storageBackend of elementViewModel.storageBackends) {
            const storageAdapter = this.storageAdapters.find(
              adapter => adapter.getType() === storageBackend
            );
            if (!storageAdapter) {
              throw new Error(`No such Storage Backend: ${storageBackend}`);
            }
            observables.push(storageAdapter.deleteElement$(element));
          }
        }
        return observables;
      }),
      mergeAll(),
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

  public deleteProcess$(
    process: Process,
    backends: StorageBackendEnum[]
  ): Observable<void> {
    if (!process.id) {
      return of(undefined);
    }
    return zip(this._storageBackend$, of(backends)).pipe(
      switchMap(([defaultBackend, processBackends]) => {
        const observables = [];
        const defaultAdapter = this.storageAdapters.find(
          adapter => adapter.getType() === defaultBackend
        );
        if (!processBackends.length) {
          if (!defaultAdapter) {
            throw new Error(`No such Storage Backend: ${defaultBackend}`);
          }
          observables.push(defaultAdapter.deleteProcess$(process));
        } else {
          for (const storageBackend of processBackends) {
            const storageAdapter = this.storageAdapters.find(
              adapter => adapter.getType() === storageBackend
            );
            if (!storageAdapter) {
              throw new Error(`No such Storage Backend: ${storageBackend}`);
            }
            observables.push(storageAdapter.deleteProcess$(process));
          }
        }
        return from(observables);
      }),
      mergeAll(),
      catchError(() => of(undefined)),
      mergeMap(() => this.processService.deleteProcess$(process.id!)),
      map(err => {
        if (err) {
          console.error(err);
        }
        return;
      })
    );
  }

  private _loadValue$(
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
        return storageAdapter.loadValue$(elementProperty);
      })
    );
  }
}
