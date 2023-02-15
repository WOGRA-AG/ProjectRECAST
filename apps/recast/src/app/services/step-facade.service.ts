import { Injectable } from '@angular/core';
import { SupabaseService, Tables } from './supabase.service';
import {
  PostgrestError,
  REALTIME_LISTEN_TYPES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
  SupabaseClient,
} from '@supabase/supabase-js';
import { Step, StepProperty } from '../../../build/openapi/recast';
import {
  BehaviorSubject,
  catchError,
  concatAll,
  concatMap,
  filter,
  from,
  map,
  merge,
  mergeAll,
  Observable,
  of,
  skip,
  Subject,
  toArray,
} from 'rxjs';
import { StepPropertyService } from './step-property.service';
import { groupBy$ } from '../shared/util/common-utils';

const snakeCase = require('snakecase-keys');
const camelCase = require('camelcase-keys');

@Injectable({
  providedIn: 'root',
})
export class StepFacadeService {
  private readonly _steps$: BehaviorSubject<Step[]> = new BehaviorSubject<
    Step[]
  >([]);
  private readonly _supabaseClient: SupabaseClient = this.supabase.supabase;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly stepPropertyService: StepPropertyService
  ) {
    const sessionChanges$ = supabase.currentSession$.pipe(
      concatMap(() => this.loadSteps$()),
      catchError(() => of([]))
    );
    const stepPropChanges$ = stepPropertyService.stepProperties$.pipe(
      skip(2),
      concatMap(value => groupBy$(value, 'stepId')),
      filter(({ key, values }) => !!key),
      map(({ key, values }) =>
        this.addPropertiesToSteps(this._steps$.getValue(), key!, values)
      )
    );
    merge(this.stepsChanges$(), sessionChanges$, stepPropChanges$).subscribe(
      properties => {
        this._steps$.next(properties);
      }
    );
  }

  get steps$(): Observable<Step[]> {
    return this._steps$;
  }

  get steps(): Step[] {
    return this._steps$.getValue();
  }

  public saveStep$(step: Step, processId: number): Observable<Step> {
    return this.upsertStep$(step, processId).pipe(
      concatMap(newStep => {
        const props = step.stepProperties;
        step = newStep;
        return (
          props?.map(val =>
            this.stepPropertyService.saveStepProp$(val, newStep.id)
          ) || of([])
        );
      }),
      concatAll(),
      toArray(),
      map(stepProps => {
        step.stepProperties = stepProps;
        return step;
      })
    );
  }

  public stepById$(id: number): Observable<Step> {
    return this._steps$.pipe(
      mergeAll(),
      filter(step => step.id === id)
    );
  }

  public stepsByProcessId$(id: number): Observable<Step[]> {
    return this._steps$.pipe(
      map(steps =>
        steps.filter(s => s.processId === id).sort((a, b) => a.id! - b.id!)
      )
    );
  }

  public deleteStep$(id: number): Observable<PostgrestError> {
    const del = this._supabaseClient.from(Tables.steps).delete().eq('id', id);
    return from(del).pipe(
      filter(({ error }) => !!error),
      map(({ error }) => error!)
    );
  }

  private upsertStep$({ id, name }: Step, processId: number): Observable<Step> {
    const upsertStep = { id, name, processId };
    const upsert = this._supabaseClient
      .from(Tables.steps)
      .upsert(snakeCase(upsertStep))
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

  private stepsChanges$(): Observable<Step[]> {
    const changes$: Subject<Step[]> = new Subject<Step[]>();
    this._supabaseClient
      .channel('step-change')
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL,
          schema: 'public',
          table: Tables.steps,
        },
        payload => {
          const state = this._steps$.getValue();
          switch (payload.eventType) {
            case 'INSERT':
              changes$.next(this.insertStep(state, camelCase(payload.new)));
              break;
            case 'UPDATE':
              const props = this.stepPropertyService.stepProperties;
              this.updateStepWithProperties$(
                state,
                camelCase(payload.new),
                props
              ).subscribe(steps => {
                changes$.next(steps);
              });
              break;
            case 'DELETE':
              const step: Step = payload.old;
              if (step.id) {
                changes$.next(this.deleteStep(state, step.id));
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

  private loadSteps$(): Observable<Step[]> {
    const select = this._supabaseClient.from(Tables.steps).select(`
        *,
        step_properties: ${Tables.stepProperties} (*)
      `);
    return from(select).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }
        return this.stepsToCamelCase(data);
      })
    );
  }

  private stepsToCamelCase(state: Step[]): Step[] {
    return state.map(step => {
      step = camelCase(step);
      step.stepProperties = step.stepProperties?.map(camelCase);
      return step;
    });
  }

  private deleteStep(state: Step[], id: number): Step[] {
    return state.filter(step => step.id !== id);
  }

  private insertStep(state: Step[], step: Step): Step[] {
    return state.concat(step);
  }

  private updateStepWithProperties$(
    state: Step[],
    step: Step,
    props: StepProperty[]
  ): Observable<Step[]> {
    return groupBy$(props, 'stepId').pipe(
      filter(({ key, values }) => !!key),
      map(({ key, values }) => {
        step = this.addPropertiesToStep(step, key, values);
        return state.map(value => (value.id === step.id ? step : value));
      })
    );
  }

  private addPropertiesToSteps(
    state: Step[],
    stepId: number,
    values: StepProperty[]
  ): Step[] {
    return state.map(step => this.addPropertiesToStep(step, stepId, values));
  }

  private addPropertiesToStep(
    step: Step,
    stepId: number | undefined,
    values: StepProperty[]
  ): Step {
    if (step.id === stepId) {
      step.stepProperties = values;
    }
    return step;
  }
}
