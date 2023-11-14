import { Injectable } from '@angular/core';
import {
  REALTIME_LISTEN_TYPES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
  SupabaseClient,
} from '@supabase/supabase-js';
import { SupabaseService, Tables } from './supabase.service';
import { StepFacadeService } from './step-facade.service';
import {
  BehaviorSubject,
  catchError,
  concatAll,
  concatMap,
  distinctUntilChanged,
  filter,
  from,
  map,
  merge,
  mergeMap,
  Observable,
  of,
  skip,
  Subject,
  take,
  toArray,
} from 'rxjs';
import { Process, Step, ValueType } from '../../../build/openapi/recast';
import {
  elementComparator,
  groupBy$,
  snakeCaseKeys,
  camelCaseKeys,
} from '../shared/util/common-utils';

@Injectable({
  providedIn: 'root',
})
export class ProcessFacadeService {
  private readonly _processes$: BehaviorSubject<Process[]> =
    new BehaviorSubject<Process[]>([]);
  private readonly _supabaseClient: SupabaseClient = this.supabase.supabase;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly stepFacade: StepFacadeService
  ) {
    const sessionChanges$ = supabase.currentSession$.pipe(
      concatMap(() => this.loadProcesses$()),
      catchError(() => of([]))
    );
    const stepChanges$ = stepFacade.steps$.pipe(
      skip(2),
      concatMap(value => groupBy$(value, 'processId')),
      filter(({ key }) => !!key),
      map(({ key, values }) =>
        this.addStepsToProcesses(this._processes$.getValue(), key!, values)
      )
    );
    merge(this.processChanges$(), stepChanges$, sessionChanges$).subscribe(
      properties => {
        this._processes$.next(properties);
      }
    );
  }

  get processes$(): Observable<Process[]> {
    return this._processes$;
  }

  get processes(): Process[] {
    return this._processes$.getValue();
  }

  public saveProcess$(proc: Process): Observable<Process> {
    return this.upsertProcess$(proc).pipe(
      concatMap(newProc => {
        const steps = proc.steps;
        proc = newProc;
        return (
          steps?.map(val => this.stepFacade.saveStep$(val, proc.id)) || of([])
        );
      }),
      concatAll(),
      toArray(),
      map(steps => {
        proc.steps = steps;
        return proc;
      })
    );
  }

  public saveProcesses$(procs: Process[]): Observable<Process[]> {
    return from(procs).pipe(
      mergeMap(proc => this.saveProcess$(proc)),
      take(procs.length),
      toArray()
    );
  }

  public deleteProcess$(id: number): Observable<void> {
    const del = this._supabaseClient
      .from(Tables.processes)
      .delete()
      .eq('id', id);
    return from(del).pipe(
      map(({ error }) => {
        if (error) {
          throw error;
        }
      })
    );
  }

  public processById$(id: number): Observable<Process | undefined> {
    return this._processes$.pipe(
      map(processes => processes.find(proc => proc.id === id)),
      distinctUntilChanged(elementComparator)
    );
  }

  public processById(id: number): Process | undefined {
    return this._processes$.getValue().find(proc => proc.id === id);
  }

  public processByName$(name: string): Observable<Process | undefined> {
    return this._processes$.pipe(
      map(processes =>
        processes.find(proc => proc.name?.toLowerCase() === name.toLowerCase())
      ),
      distinctUntilChanged(elementComparator)
    );
  }

  public processByName(name: string): Process | undefined {
    return this.processes.find(
      proc => proc.name?.toLowerCase() === name.toLowerCase()
    );
  }

  public updateProcesses$(): Observable<void> {
    return this.loadProcesses$().pipe(
      take(1),
      map(processes => {
        this._processes$.next(processes);
      })
    );
  }

  public processesByBundleId$(bundleId: number): Observable<Process[]> {
    return this._processes$.pipe(
      map(processes => processes.filter(proc => proc.bundleId === bundleId))
    );
  }

  public processNames(): string[] {
    return this.processes.map(proc => proc.name ?? '');
  }

  public isReference(name: string): boolean {
    return (
      !Object.values(ValueType).toString().includes(name) &&
      this.processNames().includes(name)
    );
  }

  private upsertProcess$({ id, name, bundleId }: Process): Observable<Process> {
    const upsertProcess = { id, name, bundleId };
    const upsert = this._supabaseClient
      .from(Tables.processes)
      .upsert(snakeCaseKeys(upsertProcess))
      .select();
    return from(upsert).pipe(
      filter(({ data, error }) => !!data || !!error),
      map(({ data, error }) => {
        if (error) {
          throw error;
        }
        return camelCaseKeys(data[0]);
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
          table: Tables.processes,
        },
        payload => {
          const state = this._processes$.getValue();
          switch (payload.eventType) {
            case 'INSERT': {
              changes$.next(
                this.insertProcess(state, camelCaseKeys(payload.new))
              );
              break;
            }
            case 'UPDATE': {
              const steps = this.stepFacade.steps;
              this.updateProcessWithSteps$(
                state,
                camelCaseKeys(payload.new),
                steps
              ).subscribe(processes => changes$.next(processes));
              break;
            }
            case 'DELETE': {
              const step: Step = payload.old;
              if (step.id) {
                changes$.next(this.deleteProcess(state, step.id));
              }
              break;
            }
            default: {
              break;
            }
          }
        }
      )
      .subscribe();
    return changes$;
  }

  private loadProcesses$(): Observable<Process[]> {
    const select = this._supabaseClient.from(Tables.processes).select(`
        *,
        steps: ${Tables.steps}(
          *,
          step_properties: ${Tables.stepProperties} (*)
        )
      `);
    return from(select).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }
        return this.processesToCamelCase(data as Process[]);
      })
    );
  }

  private processesToCamelCase(state: Process[]): Process[] {
    return state.map(process => {
      process = camelCaseKeys(process);
      process.steps = process.steps?.map(step => {
        step = camelCaseKeys(step);
        step.stepProperties = step.stepProperties?.map(camelCaseKeys);
        return step;
      });
      return process;
    });
  }

  private deleteProcess(state: Process[], id: number): Process[] {
    return state.filter(step => step.id !== id);
  }

  private insertProcess(state: Process[], process: Process): Process[] {
    return state.concat(process);
  }

  private updateProcessWithSteps$(
    state: Process[],
    process: Process,
    steps: Step[]
  ): Observable<Process[]> {
    return groupBy$(steps, 'processId').pipe(
      filter(({ key }) => !!key),
      map(({ key, values }) => {
        process = this.addStepsToProcess(process, key!, values);
        return state.map(value => (value.id === process.id ? process : value));
      })
    );
  }

  private addStepsToProcesses(
    state: Process[],
    processId: number,
    steps: Step[]
  ): Process[] {
    return state.map(process =>
      this.addStepsToProcess(process, processId, steps)
    );
  }

  private addStepsToProcess(
    process: Process,
    processId: number,
    values: Step[]
  ): Process {
    if (process.id === processId) {
      process.steps = values;
    }
    return process;
  }
}
