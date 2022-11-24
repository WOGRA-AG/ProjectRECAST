import {Injectable} from '@angular/core';
import {SupabaseService} from './supabase.service';
import {
  REALTIME_LISTEN_TYPES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
  SupabaseClient
} from '@supabase/supabase-js';
import {Step, StepProperty} from '../../../build/openapi/recast';
import {
  BehaviorSubject, catchError, concatMap, filter,
  from,
  groupBy, map, merge,
  mergeMap,
  Observable, of,
  reduce, skip, Subject,
} from 'rxjs';
import {StepPropertyService} from './step-property.service';

const snakeCase = require('snakecase-keys');
const camelCase = require('camelcase-keys');

@Injectable({
  providedIn: 'root'
})
export class StepFacadeService {

  private readonly _steps$: BehaviorSubject<Step[]> = new BehaviorSubject<Step[]>([]);
  private readonly _supabaseClient: SupabaseClient = this.supabase.supabase;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly stepPropertyService: StepPropertyService,
  ) {
    const sessionChanges$ = supabase.currentSession$.pipe(
      concatMap(() => this.loadSteps$()),
      catchError(() => of([]))
    );
    const stepPropChanges$ = stepPropertyService.stepProperties$.pipe(
      skip(2),
      concatMap(value => this.groupPropertiesByStepId$(value)),
      filter(({stepId, values}) => !!stepId),
      map(({stepId, values}) => this.addPropertiesToSteps(this._steps$.getValue(), stepId!, values))
    );
    merge(this.stepsChanges$(), sessionChanges$, stepPropChanges$)
      .subscribe(properties => {
        this._steps$.next(properties);
      });
  }

  get steps$(): Observable<Step[]> {
    return this._steps$;
  }

  get steps(): Step[] {
    return this._steps$.getValue();
  }

  private groupPropertiesByStepId$(val: StepProperty[]):
    Observable<{ stepId: number | undefined; values: StepProperty[] }> {
    return from(val).pipe(
      groupBy(stepProp => stepProp.stepId),
      mergeMap(group$ =>
        group$.pipe(
          reduce((acc, cur) => {
            acc.values.push(cur);
            return acc;
          }, {stepId: group$.key, values: [] as StepProperty[]})
        )
      )
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
          table: 'Steps'
        },
        payload => {
          const state = this._steps$.getValue();
          switch (payload.eventType) {
            case 'INSERT':
              changes$.next(
                this.insertStep(state, camelCase(payload.new))
              );
              break;
            case 'UPDATE':
              const props = this.stepPropertyService.stepProperties;
              this.updateStepWithProperties$(state, camelCase(payload.new), props)
                .subscribe(steps => {
                  changes$.next(steps);
                });
              break;
            case 'DELETE':
              const step: Step = payload.old;
              if (step.id) {
                changes$.next(
                  this.deleteStep(state, step.id)
                );
              }
              break;
            default:
              break;
          }
        }
      ).subscribe();
    return changes$;
  }

  private loadSteps$(): Observable<Step[]> {
    const select = this._supabaseClient
      .from('Steps')
      .select(`
        *,
        step_properties: StepProperties (*)
      `);
    return from(select).pipe(
      map(({data, error}) => {
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

  private updateStepWithProperties$(state: Step[], step: Step, props: StepProperty[]): Observable<Step[]> {
    return this.groupPropertiesByStepId$(props).pipe(
      filter(({stepId, values}) => !!stepId),
      map(({stepId, values}) => {
        step = this.addPropertiesToStep(step, stepId, values);
        return state.map(value => value.id === step.id ? step : value);
      })
    );
  }

  private addPropertiesToSteps(state: Step[], stepId: number, values: StepProperty[]): Step[] {
    return state.map(step => this.addPropertiesToStep(step, stepId, values));
  }

  private addPropertiesToStep(step: Step, stepId: number | undefined, values: StepProperty[]): Step {
    if (step.id === stepId) {
      step.stepProperties = values;
    }
    return step;
  }
}
