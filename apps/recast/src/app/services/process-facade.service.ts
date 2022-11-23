import { Injectable } from '@angular/core';
import {
  AuthSession,
  REALTIME_LISTEN_TYPES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
  RealtimeChannel,
  SupabaseClient
} from '@supabase/supabase-js';
import {SupabaseService} from './supabase.service';
import {StepFacadeService} from './step-facade.service';
import {BehaviorSubject, from, groupBy, mergeMap, Observable, reduce} from 'rxjs';
import {Process, Step, StepProperty} from '../../../build/openapi/recast';
const snakeCase = require('snakecase-keys');
const camelCase = require('camelcase-keys');

@Injectable({
  providedIn: 'root'
})
export class ProcessFacadeService {

  processes$: BehaviorSubject<Process[]> = new BehaviorSubject<Process[]>([]);
  private supabaseClient: SupabaseClient = this.supabase.client;
  private session: AuthSession | null = this.supabase.session;
  private steps: Step[] = [];

  constructor(
    private readonly supabase: SupabaseService,
    private readonly stepFacade: StepFacadeService,
  ) {
    supabase.session$.subscribe(session => {
      this.session = session;
      this.updateProcesses();
    });
    stepFacade.steps$.subscribe(steps => {
      this.steps = steps;
      this.updateProcessesWithSteps(this.processes$.getValue(), steps);
    });
    this.dbRealtimeChannel().subscribe();
  }

  private dbRealtimeChannel(): RealtimeChannel {
    return this.supabaseClient
      .channel('process-change')
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL,
          schema: 'public',
          table: 'Processes'
        },
        payload => {
          const state = this.processes$.getValue();
          switch (payload.eventType) {
            case 'INSERT':
              this.processes$.next(
                this.insertProcess(state, camelCase(payload.new))
              );
              break;
            case 'UPDATE':
              this.updateProcessWithSteps(state, camelCase(payload.new));
              break;
            case 'DELETE':
              const step: Step = payload.old;
              if (step.id) {
                this.processes$.next(
                  this.deleteProcess(state, step.id)
                );
              }
              break;
            default:
              break;
          }
        }
      );
  }

  private updateProcesses(): void {
    this.supabaseClient
      .from('Processes')
      .select(`
        *,
        steps: Steps(
          *,
          step_properties: StepProperties (*)
        )
      `)
      .then(({data, error, status}) => {
        if (error && status !== 406) {throw error;}
        if (!data) {return;}
        this.processes$.next(
          this.processesToCamelCase(data)
        );
      });
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

  private updateProcessWithSteps(state: Process[], process: Process): void {
    this.groupStepsByProcessId(this.steps).subscribe(({ processId, values }) => {
      if (!processId) {return;}
      process = this.addStepsToProcess(process, processId, values);
      this.processes$.next(
        state.map(value => value.id === process.id ? process : value)
      );
    });
  }

  private updateProcessesWithSteps(state: Process[], steps: Step[]): void {
    this.groupStepsByProcessId(steps).subscribe(({ processId, values }) => {
      if (!processId) {return;}
      this.processes$.next(
        state.map(process => this.addStepsToProcess(process, processId, values))
      );
    });
  }

  private groupStepsByProcessId(steps: Step[]):
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
