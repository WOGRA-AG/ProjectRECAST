import { Injectable } from '@angular/core';
import {BehaviorSubject, from, groupBy, mergeMap, Observable, reduce} from 'rxjs';
import {ElementProperty, Element} from '../../../build/openapi/recast';
import {
  AuthSession,
  REALTIME_LISTEN_TYPES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
  RealtimeChannel,
  SupabaseClient
} from '@supabase/supabase-js';
import {SupabaseService} from './supabase.service';
import {ElementPropertyService} from './element-property.service';
const snakeCase = require('snakecase-keys');
const camelCase = require('camelcase-keys');

@Injectable({
  providedIn: 'root'
})
export class ElementFacadeService {

  elements$: BehaviorSubject<Element[]> = new BehaviorSubject<Element[]>([]);
  private supabaseClient: SupabaseClient = this.supabase.client;
  private session: AuthSession | null = this.supabase.session;
  private elementProps: ElementProperty[] = [];

  constructor(
    private readonly supabase: SupabaseService,
    private readonly elementPropertyService: ElementPropertyService,
  ) {
    supabase.session$.subscribe(session => {
      this.session = session;
      this.updateElements();
    });
    elementPropertyService.elementProperties$.subscribe( val => {
      this.elementProps = val;
      this.groupPropertiesByElementId(val).subscribe(({ elementId, values }) => {
        if (!elementId) {return;}
        this.elements$.next(
          this.addPropertiesToElements(this.elements$.getValue(), elementId, values)
        );
      });
    });
    this.dbRealtimeChannel().subscribe();
  }

  private groupPropertiesByElementId(val: ElementProperty[]):
    Observable<{ elementId: number | undefined; values: ElementProperty[] }> {
    return from(val).pipe(
      groupBy(elementProp => elementProp.elementId),
      mergeMap(group$ =>
        group$.pipe(
          reduce((acc, cur) => {
            acc.values.push(cur);
            return acc;
          }, {elementId: group$.key, values: [] as ElementProperty[]})
        )
      )
    );
  }

  private dbRealtimeChannel(): RealtimeChannel {
    return this.supabaseClient
      .channel('element-change')
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL,
          schema: 'public',
          table: 'Elements'
        },
        payload => {
          const state = this.elements$.getValue();
          switch (payload.eventType) {
            case 'INSERT':
              this.elements$.next(
                this.insertElement(state, camelCase(payload.new))
              );
              break;
            case 'UPDATE':
              this.updateElementWithProperties(state, camelCase(payload.new));
              break;
            case 'DELETE':
              const element: Element = payload.old;
              if (element.id) {
                this.elements$.next(
                  this.deleteElement(state, element.id)
                );
              }
              break;
            default:
              break;
          }
        }
      );
  }

  private updateElements(): void {
    this.supabaseClient
      .from('Elements')
      .select(`
        *,
        element_properties: ElementProperties (*)
      `)
      .then(({data, error, status}) => {
        if (error && status !== 406) {throw error;}
        if (!data) {return;}
        this.elements$.next(
          this.elementsToCamelCase(data)
        );
      });
  }

  private elementsToCamelCase(state: Element[]): Element[] {
    return state.map(element => {
      element = camelCase(element);
      element.elementProperties = element.elementProperties?.map(camelCase);
      return element;
    });
  }

  private deleteElement(state: Element[], id: number): Element[] {
    return state.filter(element => element.id !== id);
  }

  private insertElement(state: Element[], element: Element): Element[] {
    return state.concat(element);
  }

  private updateElementWithProperties(state: Element[], element: Element): void {
    this.groupPropertiesByElementId(this.elementProps).subscribe(({ elementId, values }) => {
      if (!elementId) {return;}
      element = this.addPropertiesToElement(element, elementId, values);
      this.elements$.next(
        state.map(value => value.id === element.id ? element : value)
      );
    });
  }

  private addPropertiesToElements(state: Element[], elementId: number, values: ElementProperty[]): Element[] {
    return state.map(element => this.addPropertiesToElement(element, elementId, values));
  }

  private addPropertiesToElement(element: Element, elementId: number, values: ElementProperty[]): Element {
    if (element.id === elementId) {
      element.elementProperties = values;
    }
    return element;
  }
}
