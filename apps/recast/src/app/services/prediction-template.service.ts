import { Injectable } from '@angular/core';
import { SupabaseService, Tables } from './supabase.service';
import {
  REALTIME_LISTEN_TYPES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
  SupabaseClient,
} from '@supabase/supabase-js';
import { PredictionTemplate } from '../../../build/openapi/recast';
import {
  BehaviorSubject,
  catchError,
  concatMap,
  distinctUntilChanged,
  from,
  map,
  merge,
  Observable,
  of,
  Subject,
  tap,
} from 'rxjs';
import {
  camelCaseKeys,
  elementComparator,
  snakeCaseKeys,
} from '../shared/util/common-utils';

@Injectable({
  providedIn: 'root',
})
export class PredictionTemplateService {
  private readonly _predictionTemplates$: BehaviorSubject<
    PredictionTemplate[]
  > = new BehaviorSubject<PredictionTemplate[]>([]);
  private readonly _supabaseClient: SupabaseClient = this.supabase.supabase;

  constructor(private readonly supabase: SupabaseService) {
    const sessionChanges$ = supabase.currentSession$.pipe(
      concatMap(() => this.loadProperties$()),
      catchError(() => of([]))
    );
    merge(sessionChanges$, this.propertyChanges$()).subscribe(properties => {
      this._predictionTemplates$.next(properties);
    });
  }

  get predictionTemplates$(): Observable<PredictionTemplate[]> {
    return this._predictionTemplates$.pipe(
      distinctUntilChanged(elementComparator)
    );
  }

  get predictionTemplates(): PredictionTemplate[] {
    return this._predictionTemplates$.getValue();
  }

  public predictionTemplateByStepPropertyId(
    id: number
  ): PredictionTemplate | undefined {
    return this.predictionTemplates.find(
      template => template.stepPropertyId === id
    );
  }

  public savePredictionTemplate$(
    template: PredictionTemplate
  ): Observable<PredictionTemplate> {
    return this.upsertPredictionTemplate$(template);
  }

  private upsertPredictionTemplate$(
    template: PredictionTemplate
  ): Observable<PredictionTemplate> {
    const upsert = this._supabaseClient
      .from(Tables.predictionTemplates)
      .upsert(snakeCaseKeys(template))
      .select();
    return from(upsert).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }
        return camelCaseKeys(data[0]);
      }),
      tap(template => {
        this._predictionTemplates$.next(
          this.updateElementInState(
            this._predictionTemplates$.getValue(),
            template
          )
        );
      })
    );
  }

  private loadProperties$(): Observable<PredictionTemplate[]> {
    const select = this._supabaseClient
      .from(Tables.predictionTemplates)
      .select();
    return from(select).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }
        return data?.map(camelCaseKeys);
      })
    );
  }

  private propertyChanges$(): Observable<PredictionTemplate[]> {
    const changes$: Subject<PredictionTemplate[]> = new Subject<
      PredictionTemplate[]
    >();
    this._supabaseClient
      .channel('prediction-template-change')
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL,
          schema: 'public',
          table: Tables.predictionTemplates,
        },
        payload => {
          const state = this._predictionTemplates$.getValue();
          switch (payload.eventType) {
            case 'INSERT':
              changes$.next(
                this.insertElementToState(state, camelCaseKeys(payload.new))
              );
              break;
            case 'UPDATE':
              changes$.next(
                this.updateElementInState(state, camelCaseKeys(payload.new))
              );
              break;
            case 'DELETE': {
              const prop: Partial<{ [p: string]: any }> = payload.old;
              if (prop['id']) {
                changes$.next(this.deleteElementFromState(state, prop['id']));
              }
              break;
            }
            default:
              break;
          }
        }
      )
      .subscribe();
    return changes$;
  }

  private updateElementInState(
    state: PredictionTemplate[],
    prop: PredictionTemplate
  ): PredictionTemplate[] {
    const exists = !!state.find(value => value.id === prop.id);
    if (!exists) {
      return this.insertElementToState(state, prop);
    }
    return state.map(value => (value.id === prop.id ? prop : value));
  }

  private deleteElementFromState(
    state: PredictionTemplate[],
    id: number
  ): PredictionTemplate[] {
    return state.filter(prop => prop.id !== id);
  }

  private insertElementToState(
    state: PredictionTemplate[],
    prop: PredictionTemplate
  ): PredictionTemplate[] {
    return state.concat(prop);
  }
}
