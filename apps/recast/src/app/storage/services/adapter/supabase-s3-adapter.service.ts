import { Injectable } from '@angular/core';
import { SupabaseService, Tables } from '../../../services/supabase.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { FileObject } from '@supabase/storage-js';
import {
  BehaviorSubject,
  catchError,
  concatMap,
  filter,
  from,
  map,
  Observable,
  of,
} from 'rxjs';
import { UserFacadeService } from '../../../user/services/user-facade.service';
import { StorageAdapterInterface } from './storage-adapter-interface';
import {
  Element,
  ElementProperty,
  Process,
  StepProperty,
} from '../../../../../build/openapi/recast';
import TypeEnum = StepProperty.TypeEnum;
import StorageBackendEnum = ElementProperty.StorageBackendEnum;
const camelCase = require('camelcase-keys');

@Injectable({
  providedIn: 'root',
})
export class SupabaseS3Adapter implements StorageAdapterInterface {
  private readonly _supabaseClient: SupabaseClient = this.supabase.supabase;
  private readonly _objects: BehaviorSubject<FileObject[]> =
    new BehaviorSubject<FileObject[]>([]);
  constructor(
    private readonly supabase: SupabaseService,
    private readonly userFacade: UserFacadeService
  ) {
    const sessionChanges$ = supabase.currentSession$.pipe(
      concatMap(() => this.loadValues$(1)),
      catchError(() => of([]))
    );
    sessionChanges$.subscribe(properties => {
      this._objects.next(properties);
    });
  }

  get objects$(): Observable<FileObject[]> {
    return this._objects;
  }

  public getType(): StorageBackendEnum {
    return StorageBackendEnum.S3;
  }

  public upsertObject$(
    elementId: number,
    file: File
  ): Observable<{ path: string }> {
    const user = this.userFacade.currentProfile;
    const path = `${user?.id}/${elementId.toString()}/${file.name}`;
    const upload = this._supabaseClient.storage
      .from(Tables.values)
      .upload(path, file, { upsert: true });
    return from(upload).pipe(
      filter(({ data, error }) => !!data || !!error),
      map(({ data, error }) => {
        if (!!error) {
          throw error;
        }
        return camelCase(data);
      })
    );
  }

  public loadValue$(_2: ElementProperty, _3: TypeEnum): Observable<string> {
    throw new Error('Not Implemented Yet');
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  public async saveValue(
    element: Element,
    property: StepProperty,
    value: any,
    type: TypeEnum
  ): Promise<void> {
    throw new Error('Not Implemented Yet');
  }

  public deleteElement$(_: Element): Observable<void> {
    return of(undefined);
  }

  public deleteProcess$(_: Process): Observable<void> {
    return of(undefined);
  }

  private deleteObject$(path: string): Observable<any> {
    const rm = this._supabaseClient.storage.from(Tables.values).remove([path]);
    return from(rm);
  }

  private loadValues$(elementId?: number): Observable<FileObject[]> {
    const user = this.userFacade.currentProfile;
    const path = `${user?.id}/${elementId?.toString()}`;
    const select = this._supabaseClient.storage.from(Tables.values).list(path);
    return from(select).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }
        return data?.map(camelCase);
      })
    );
  }
}
