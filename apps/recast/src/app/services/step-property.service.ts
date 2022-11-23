import {Injectable} from '@angular/core';
import {SupabaseService} from './supabase.service';
import {
  AuthSession,
  REALTIME_LISTEN_TYPES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT, RealtimeChannel,
  SupabaseClient
} from '@supabase/supabase-js';
import {StepProperty} from '../../../build/openapi/recast';
import {BehaviorSubject} from 'rxjs';
const snakeCase = require('snakecase-keys');
const camelCase = require('camelcase-keys');

@Injectable({
  providedIn: 'root'
})
export class StepPropertyService {

  stepProperties$: BehaviorSubject<StepProperty[]> = new BehaviorSubject<StepProperty[]>([]);
  private supabaseClient: SupabaseClient = this.supabase.client;
  private session: AuthSession | null = this.supabase.session;

  constructor(
    private readonly supabase: SupabaseService,
  ) {
    supabase.session$.subscribe(session => {
      this.session = session;
      this.updateProperties();
    });
    this.dbRealtimeChannel().subscribe();
  }

  private dbRealtimeChannel(): RealtimeChannel {
    return this.supabaseClient
      .channel('step-property-change')
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL,
          schema: 'public',
          table: 'StepProperties'
        },
        payload => {
          const state = this.stepProperties$.getValue();
          switch (payload.eventType) {
            case 'INSERT':
              this.stepProperties$.next(
                this.insertProperty(state, camelCase(payload.new))
              );
              break;
            case 'UPDATE':
              this.stepProperties$.next(
                this.updateProperty(state, camelCase(payload.new))
              );
              break;
            case 'DELETE':
              const prop: StepProperty = payload.old;
              if (prop.id) {
                this.stepProperties$.next(
                  this.deleteProperty(state, prop.id)
                );
              }
              break;
            default:
              break;
          }
        }
      );
  }

  private updateProperties(): void {
    this.supabaseClient
      .from('StepProperties')
      .select()
      .then(({data, error, status}) => {
        if (error && status !== 406) {throw error;}
        this.stepProperties$.next(data?.map(camelCase) as StepProperty[]);
      });
  }

  private updateProperty(state: StepProperty[], prop: StepProperty): StepProperty[] {
    return state.map(value => value.id === prop.id ? prop : value);
  }

  private deleteProperty(state: StepProperty[], id: number): StepProperty[] {
    return state.filter(prop => prop.id !== id);
  }

  private insertProperty(state: StepProperty[], prop: StepProperty): StepProperty[] {
    return state.concat(prop);
  }
}
