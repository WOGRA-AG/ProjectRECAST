import { Injectable } from '@angular/core';
import {
  REALTIME_LISTEN_TYPES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
  SupabaseClient
} from '@supabase/supabase-js';
import {SupabaseService} from './supabase.service';
import {StepFacadeService} from './step-facade.service';
import {
  BehaviorSubject,
  catchError,
  concatMap,
  filter,
  from,
  groupBy,
  map, merge,
  mergeMap,
  Observable,
  of,
  reduce, skip, Subject
} from 'rxjs';
import {Process, Step} from '../../../build/openapi/recast';
const snakeCase = require('snakecase-keys');
const camelCase = require('camelcase-keys');

@Injectable({
  providedIn: 'root'
})
export class ProcessFacadeService {

  private readonly _processes$: BehaviorSubject<Process[]> = new BehaviorSubject<Process[]>([]);
  private readonly _supabaseClient: SupabaseClient = this.supabase.supabase;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly stepFacade: StepFacadeService,
  ) {
    const sessionChanges$ = supabase.currentSession$.pipe(
      concatMap(() => this.loadProcesses$()),
      catchError(() => of([]))
    );
    const stepChanges$ = stepFacade.steps$.pipe(
      skip(2),
      concatMap(value => this.groupStepsByProcessId$(value)),
      filter(({processId, values}) => !!processId),
      map(({processId, values}) => this.addStepsToProcesses(this._processes$.getValue(), processId!, values))
    );
    merge(this.processChanges$(), stepChanges$, sessionChanges$).subscribe(properties => {
      this._processes$.next(properties);
    });
  }

  get processes$(): Observable<Process[]> {
    return this._processes$;
  }

  get processes(): Process[] {
    return this._processes$.getValue();
  }

  private processChanges$(): Observable<Process[]> {
    const changes$: Subject<Process[]> = new Subject<Process[]>();
    this._supabaseClient
      .channel('process-change')
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL,
          schema: 'public',
          table: 'Processes'
        },
        payload => {
          const state = this._processes$.getValue();
          switch (payload.eventType) {
            case 'INSERT':
              changes$.next(
                this.insertProcess(state, camelCase(payload.new))
              );
              break;
            case 'UPDATE':
              const steps = this.stepFacade.steps;
              this.updateProcessWithSteps$(state, camelCase(payload.new), steps)
                .subscribe(processes => changes$.next(processes));
              break;
            case 'DELETE':
              const step: Step = payload.old;
              if (step.id) {
                changes$.next(
                  this.deleteProcess(state, step.id)
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

  private loadProcesses$(): Observable<Process[]> {
    const select = this._supabaseClient
      .from('Processes')
      .select(`
        *,
        steps: Steps(
          *,
          step_properties: StepProperties (*)
        )
      `);
    return from(select).pipe(
      map(({data, error}) => {
        if (error) {
          throw error;
        }
        return this.processesToCamelCase(data);
      })
    );
  }

  private processesToCamelCase(state: Process[]): Process[] {
    return state.map(process => {
      process = camelCase(process);
      process.steps = process.steps?.map(step => {
        step = camelCase(step);
        step.stepProperties = step.stepProperties?.map(camelCase);
        return step;
      });
      return process;
    });
  }

  private deleteProcess(state: Process[], id: number): Process[] {
    return state.filter(step => step.id !== id);
  }

  private insertProcess(state: Process[], step: Process): Process[] {
    return state.concat(step);
  }

  private updateProcessWithSteps$(state: Process[], process: Process, steps: Step[]): Observable<Process[]> {
    return this.groupStepsByProcessId$(steps).pipe(
      filter(({processId, values}) => !!processId),
      map(({processId, values}) => {
        process = this.addStepsToProcess(process, processId!, values);
        return state.map(value => value.id === process.id ? process : value);
      })
    );
  }

  private addStepsToProcesses(state: Process[], processId: number, steps: Step[]): Process[] {
    return state.map(process => this.addStepsToProcess(process, processId, steps));
  }

  private groupStepsByProcessId$(steps: Step[]):
    Observable<{ processId: number | undefined; values: Step[] }> {
    return from(steps).pipe(
      groupBy(stepProp => stepProp.processId),
      mergeMap(group$ =>
        group$.pipe(
          reduce((acc, cur) => {
            acc.values.push(cur);
            return acc;
          }, {processId: group$.key, values: [] as Step[]})
        )
      )
    );
  }

  private addStepsToProcess(process: Process, processId: number, values: Step[]): Process {
    if (process.id === processId) {
      process.steps = values;
    }
    return process;
  }
}
