import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  concatMap,
  filter,
  from,
  map, merge,
  Observable, of,
  skip,
  Subject
} from 'rxjs';
import {ElementProperty, Element} from '../../../build/openapi/recast';
import {
  REALTIME_LISTEN_TYPES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
  SupabaseClient
} from '@supabase/supabase-js';
import {SupabaseService} from './supabase.service';
import {ElementPropertyService} from './element-property.service';
import {groupBy$} from '../shared/util/common-utils';
const snakeCase = require('snakecase-keys');
const camelCase = require('camelcase-keys');

@Injectable({
  providedIn: 'root'
})
export class ElementFacadeService {

  private readonly _elements$: BehaviorSubject<Element[]> = new BehaviorSubject<Element[]>([]);
  private supabaseClient: SupabaseClient = this.supabase.supabase;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly elementPropertyService: ElementPropertyService,
  ) {
    const sessionChanges$ = supabase.currentSession$.pipe(
      concatMap(() => this.loadElements$()),
      catchError(() => of([]))
    );
    const elemPropChanges$ = elementPropertyService.elementProperties$.pipe(
      skip(2),
      concatMap(value => groupBy$(value, 'elementId')),
      filter(({key, values}) => !!key),
      map(({key, values}) => this.addPropertiesToElements(this._elements$.getValue(), key!, values))
    );
    merge(this.elementChanges$(), sessionChanges$, elemPropChanges$).subscribe(properties => {
      this._elements$.next(properties);
    });
  }

  get elements$(): Observable<Element[]> {
    return this._elements$;
  }

  get elements(): Element[] {
    return this._elements$.getValue();
  }

  private elementChanges$(): Observable<Element[]> {
    const changes$: Subject<Element[]> = new Subject<Element[]>();
    this.supabaseClient
      .channel('element-change')
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL,
          schema: 'public',
          table: 'Elements'
        },
        payload => {
          const state = this._elements$.getValue();
          switch (payload.eventType) {
            case 'INSERT':
              changes$.next(
                this.insertElement(state, camelCase(payload.new))
              );
              break;
            case 'UPDATE':
              const props = this.elementPropertyService.elementProperties;
              this.updateElementWithProperties$(state, camelCase(payload.new), props)
                .subscribe(elements => {
                  changes$.next(elements);
                });
              break;
            case 'DELETE':
              const element: Element = payload.old;
              if (element.id) {
                changes$.next(
                  this.deleteElement(state, element.id)
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

  private loadElements$(): Observable<Element[]> {
    const select = this.supabaseClient
      .from('Elements')
      .select(`
        *,
        element_properties: ElementProperties (*)
      `);
    return from(select).pipe(
      map(({data, error}) => {
        if (error) {
          throw error;
        }
        return this.elementsToCamelCase(data);
      })
    );
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

  private updateElementWithProperties$(state: Element[], element: Element, props: ElementProperty[]): Observable<Element[]> {
    return groupBy$(props, 'elementId').pipe(
      filter(({key, values}) => !!key),
      map(({key, values}) => {
        element = this.addPropertiesToElement(element, key!, values);
        return state.map(value => value.id === element.id ? element : value);
      })
    );
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
