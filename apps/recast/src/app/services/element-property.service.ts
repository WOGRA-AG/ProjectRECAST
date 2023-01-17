import { Injectable } from '@angular/core';
import {
  PostgrestError,
  REALTIME_LISTEN_TYPES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
  SupabaseClient,
} from '@supabase/supabase-js';
import { SupabaseService, Tables } from './supabase.service';
import {
  BehaviorSubject,
  catchError,
  concatMap,
  filter,
  from,
  map,
  merge,
  Observable,
  of,
  Subject,
} from 'rxjs';
import { ElementProperty } from '../../../build/openapi/recast';

const snakeCase = require('snakecase-keys');
const camelCase = require('camelcase-keys');

@Injectable({
  providedIn: 'root',
})
export class ElementPropertyService {
  private readonly _elementProperties$: BehaviorSubject<ElementProperty[]> =
    new BehaviorSubject<ElementProperty[]>([]);
  private readonly _supabaseClient: SupabaseClient = this.supabase.supabase;

  constructor(private readonly supabase: SupabaseService) {
    const sessionChanges$ = supabase.currentSession$.pipe(
      concatMap(() => this.loadProperties$()),
      catchError(() => of([]))
    );
    merge(sessionChanges$, this.propertyChanges$()).subscribe(properties => {
      this._elementProperties$.next(properties);
    });
  }

  get elementProperties$(): Observable<ElementProperty[]> {
    return this._elementProperties$;
  }

  get elementProperties(): ElementProperty[] {
    return this._elementProperties$.getValue();
  }

  public saveElementProp$(
    prop: ElementProperty,
    elementId: number | undefined
  ): Observable<ElementProperty> {
    return this.upsertElementProp$(prop, elementId);
  }

  public deleteElementProperty$(id: number): Observable<PostgrestError> {
    const del = this._supabaseClient
      .from(Tables.elementProperties)
      .delete()
      .eq('id', id);
    return from(del).pipe(
      filter(({ error }) => !!error),
      map(({ error }) => error!)
    );
  }

  public elementPropertiesByElementId$(
    id: number
  ): Observable<ElementProperty[]> {
    return this._elementProperties$.pipe(
      map(props => props.filter(p => p.elementId === id))
    );
  }

  private upsertElementProp$(
    { id, value, stepPropertyId }: ElementProperty,
    elementId: number | undefined
  ): Observable<ElementProperty> {
    const upsertProp = { id, value, stepPropertyId, elementId };
    const upsert = this._supabaseClient
      .from(Tables.elementProperties)
      .upsert(snakeCase(upsertProp))
      .select();
    return from(upsert).pipe(
      filter(({ data, error }) => !!data || !!error),
      map(({ data, error }) => {
        if (!!error) {
          throw error;
        }
        return camelCase(data[0]);
      })
    );
  }

  private propertyChanges$(): Observable<ElementProperty[]> {
    const changes$: Subject<ElementProperty[]> = new Subject<
      ElementProperty[]
    >();
    this._supabaseClient
      .channel('element-property-change')
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL,
          schema: 'public',
          table: Tables.elementProperties,
        },
        payload => {
          const state = this._elementProperties$.getValue();
          switch (payload.eventType) {
            case 'INSERT':
              changes$.next(
                this.insertElementProperty(state, camelCase(payload.new))
              );
              break;
            case 'UPDATE':
              changes$.next(
                this.updateElementProperty(state, camelCase(payload.new))
              );
              break;
            case 'DELETE':
              const elemProp: ElementProperty = payload.old;
              if (elemProp.id) {
                changes$.next(this.deleteElementProperty(state, elemProp.id));
              }
              break;
            default:
              break;
          }
        }
      )
      .subscribe();
    return changes$;
  }

  private loadProperties$(): Observable<ElementProperty[]> {
    const select = this._supabaseClient.from(Tables.elementProperties).select();
    return from(select).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }
        return data?.map(camelCase);
      })
    );
  }

  private deleteElementProperty(
    state: ElementProperty[],
    id: number
  ): ElementProperty[] {
    return state.filter(elemProp => elemProp.id !== id);
  }

  private insertElementProperty(
    state: ElementProperty[],
    elementProperty: ElementProperty
  ): ElementProperty[] {
    return state.concat(elementProperty);
  }

  private updateElementProperty(
    state: ElementProperty[],
    elementProperty: ElementProperty
  ): ElementProperty[] {
    return state.map(value =>
      value.id === elementProperty.id ? elementProperty : value
    );
  }
}
