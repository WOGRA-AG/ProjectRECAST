import { Injectable } from '@angular/core';
import {
  AuthSession,
  REALTIME_LISTEN_TYPES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
  RealtimeChannel,
  SupabaseClient
} from '@supabase/supabase-js';
import {SupabaseService} from './supabase.service';
import {BehaviorSubject} from 'rxjs';
import {ElementProperty} from '../../../build/openapi/recast';
const snakeCase = require('snakecase-keys');
const camelCase = require('camelcase-keys');

@Injectable({
  providedIn: 'root'
})
export class ElementPropertyService {

  elementProperties$: BehaviorSubject<ElementProperty[]> = new BehaviorSubject<ElementProperty[]>([]);
  private supabaseClient: SupabaseClient = this.supabase.client;
  private session: AuthSession | null = this.supabase.session;

  constructor(
    private readonly supabase: SupabaseService,
  ) {
    supabase.session$.subscribe(session => {
      this.session = session;
      this.updateElementProperties();
    });

    this.dbRealtimeChannel().subscribe();
  }

  private dbRealtimeChannel(): RealtimeChannel {
    return this.supabaseClient
      .channel('element-property-change')
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL,
          schema: 'public',
          table: 'ElementProperties'
        },
        payload => {
          const state = this.elementProperties$.getValue();
          switch (payload.eventType) {
            case 'INSERT':
              this.elementProperties$.next(
                this.insertElementProperty(state, camelCase(payload.new))
              );
              break;
            case 'UPDATE':
              this.elementProperties$.next(
                this.updateElementProperty(state, camelCase(payload.new))
              );
              break;
            case 'DELETE':
              const elemProp: ElementProperty = payload.old;
              if (elemProp.id) {
                this.elementProperties$.next(
                  this.deleteElementProperty(state, elemProp.id)
                );
              }
              break;
            default:
              break;
          }
        }
      );
  }

  private updateElementProperties(): void {
    this.supabaseClient
      .from('ElementProperties')
      .select()
      .then(({data, error, status}) => {
        if (error && status !== 406) {throw error;}
        if (!data) {return;}
        this.elementProperties$.next(
          this.elementPropertiesToCamelCase(data)
        );
      });
  }

  private elementPropertiesToCamelCase(elementProperties: ElementProperty[]): ElementProperty[] {
    return elementProperties.map(camelCase);
  }

  private deleteElementProperty(state: ElementProperty[], id: number): ElementProperty[] {
    return state.filter(elemProp => elemProp.id !== id);
  }

  private insertElementProperty(state: ElementProperty[], elementProperty: ElementProperty): ElementProperty[] {
    return state.concat(elementProperty);
  }

  private updateElementProperty(state: ElementProperty[], elementProperty: ElementProperty): ElementProperty[] {
    return state.map(value => value.id === elementProperty.id ? elementProperty : value);
  }
}
