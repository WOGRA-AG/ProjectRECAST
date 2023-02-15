import { Injectable } from '@angular/core';
import { SupabaseService, Tables } from './supabase.service';
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
import { UserFacadeService } from '../user/services/user-facade.service';
const snakeCase = require('snakecase-keys');
const camelCase = require('camelcase-keys');

@Injectable({
  providedIn: 'root',
})
export class StorageService {
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