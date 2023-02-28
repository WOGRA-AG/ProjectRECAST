import { Injectable } from '@angular/core';
import { SupabaseService, Tables } from './supabase.service';
import {
  PostgrestError,
  REALTIME_LISTEN_TYPES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
  SupabaseClient,
} from '@supabase/supabase-js';
import { StepProperty } from '../../../build/openapi/recast';
import {
  BehaviorSubject,
  catchError,
  concatMap,
  distinctUntilChanged,
  filter,
  from,
  map,
  merge,
  mergeAll,
  Observable,
  of,
  Subject,
} from 'rxjs';
import { elementComparator } from '../shared/util/common-utils';

const snakeCase = require('snakecase-keys');
const camelCase = require('camelcase-keys');

@Injectable({
  providedIn: 'root',
})
export class StepPropertyService {
  private readonly _stepProperties$: BehaviorSubject<StepProperty[]> =
    new BehaviorSubject<StepProperty[]>([]);
  private readonly _supabaseClient: SupabaseClient = this.supabase.supabase;

  constructor(private readonly supabase: SupabaseService) {
    const sessionChanges$ = supabase.currentSession$.pipe(
      concatMap(() => this.loadProperties$()),
      catchError(() => of([]))
    );
    merge(sessionChanges$, this.propertyChanges$()).subscribe(properties => {
      this._stepProperties$.next(properties);
    });
  }

  get stepProperties$(): Observable<StepProperty[]> {
    return this._stepProperties$.pipe(distinctUntilChanged(elementComparator));
  }

  get stepProperties(): StepProperty[] {
    return this._stepProperties$.getValue();
  }

  public saveStepProp$(
    prop: StepProperty,
    stepId: number | undefined
  ): Observable<StepProperty> {
    return this.upsertStepProp$(prop, stepId);
  }

  public deleteProcess$(id: number): Observable<PostgrestError> {
    const del = this._supabaseClient
      .from(Tables.stepProperties)
      .delete()
      .eq('id', id);
    return from(del).pipe(
      filter(({ error }) => !!error),
      map(({ error }) => error!)
    );
  }

  public stepPropertyById$(id: number): Observable<StepProperty> {
    return this._stepProperties$.pipe(
      mergeAll(),
      filter(step => step.id === id)
    );
  }

  public stepPropertyById(id: number): StepProperty {
    const stepProp = this.stepProperties.find(prop => prop.id === id);
    if (!stepProp) {
      throw Error(`stepProperty with id ${id} not found`);
    }
    return stepProp;
  }

  public stepPropertiesByStepId$(id: number): Observable<StepProperty[]> {
    return this._stepProperties$.pipe(
      map(props => props.filter(p => p.stepId === id))
    );
  }

  private upsertStepProp$(
    { id, name, defaultValue, description, type }: StepProperty,
    stepId: number | undefined
  ): Observable<StepProperty> {
    const upsertProp = { id, name, stepId, defaultValue, description, type };
    const upsert = this._supabaseClient
      .from(Tables.stepProperties)
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

  private propertyChanges$(): Observable<StepProperty[]> {
    const changes$: Subject<StepProperty[]> = new Subject<StepProperty[]>();
    this._supabaseClient
      .channel('step-property-change')
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL,
          schema: 'public',
          table: Tables.stepProperties,
        },
        payload => {
          const state = this._stepProperties$.getValue();
          switch (payload.eventType) {
            case 'INSERT':
              changes$.next(this.insertProperty(state, camelCase(payload.new)));
              break;
            case 'UPDATE':
              changes$.next(this.updateProperty(state, camelCase(payload.new)));
              break;
            case 'DELETE':
              const prop: StepProperty = payload.old;
              if (prop.id) {
                changes$.next(this.deleteProperty(state, prop.id));
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

  private loadProperties$(): Observable<StepProperty[]> {
    const select = this._supabaseClient.from(Tables.stepProperties).select();
    return from(select).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }
        return data?.map(camelCase);
      })
    );
  }

  private updateProperty(
    state: StepProperty[],
    prop: StepProperty
  ): StepProperty[] {
    return state.map(value => (value.id === prop.id ? prop : value));
  }

  private deleteProperty(state: StepProperty[], id: number): StepProperty[] {
    return state.filter(prop => prop.id !== id);
  }

  private insertProperty(
    state: StepProperty[],
    prop: StepProperty
  ): StepProperty[] {
    return state.concat(prop);
  }
}
