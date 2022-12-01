import { Injectable } from '@angular/core';
import {
  PostgrestError,
  REALTIME_LISTEN_TYPES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
  SupabaseClient
} from '@supabase/supabase-js';
import {SupabaseService, Tables} from './supabase.service';
import {StepFacadeService} from './step-facade.service';
import {
  BehaviorSubject,
  catchError, concatAll,
  concatMap,
  filter,
  from,
  map, merge,
  Observable,
  of,
  skip, Subject, toArray
} from 'rxjs';
import {Process, Step} from '../../../build/openapi/recast';
import {groupBy$} from '../shared/util/common-utils';
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
      concatMap(value => groupBy$(value, 'processId')),
      filter(({key, values}) => !!key),
      map(({key, values}) => this.addStepsToProcesses(this._processes$.getValue(), key!, values))
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

  public saveProcess$(proc: Process): Observable<Process> {
    return this.upsertProcess$(proc).pipe(
      concatMap((newProc) => {
        const steps = proc.steps;
        proc = newProc;
        return steps?.map(val => this.stepFacade.saveStep$(val, proc.id))
            || of([]);
      }
      ),
      concatAll(),
      toArray(),
      map(steps => {
        proc.steps = steps;
        return proc;
      })
    );
  }

  public deleteProcess$(id: number): Observable<PostgrestError> {
    const del = this._supabaseClient
      .from(Tables.processes)
      .delete()
      .eq('id', id);
    return from(del).pipe(
      filter(({error}) => !!error),
      map(({error}) => error!)
    );
  }

  private upsertProcess$({id, name}: Process): Observable<Process> {
    const upsertStep = {id, name};
    const upsert = this._supabaseClient.from(Tables.processes)
      .upsert(snakeCase(upsertStep))
      .select();
    return from(upsert).pipe(
      filter(({data, error}) => !!data || !!error),
      map(({data, error}) => {
        if (!!error) {
          throw error;
        }
        return camelCase(data[0]);
      })
    );
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
          table: Tables.processes
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
      .from(Tables.processes)
      .select(`
        *,
        steps: ${Tables.steps}(
          *,
          step_properties: ${Tables.stepProperties} (*)
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
    return groupBy$(steps, 'processId').pipe(
      filter(({key, values}) => !!key),
      map(({key, values}) => {
        process = this.addStepsToProcess(process, key!, values);
        return state.map(value => value.id === process.id ? process : value);
      })
    );
  }

  private addStepsToProcesses(state: Process[], processId: number, steps: Step[]): Process[] {
    return state.map(process => this.addStepsToProcess(process, processId, steps));
  }

  private addStepsToProcess(process: Process, processId: number, values: Step[]): Process {
    if (process.id === processId) {
      process.steps = values;
    }
    return process;
  }
}
