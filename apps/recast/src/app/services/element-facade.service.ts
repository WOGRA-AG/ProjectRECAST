import { Injectable } from '@angular/core';
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
  mergeAll,
  Observable,
  of,
  skip,
  Subject,
  toArray,
} from 'rxjs';
import { ElementProperty, Element } from '../../../build/openapi/recast';
import {
  PostgrestError,
  REALTIME_LISTEN_TYPES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
  SupabaseClient,
} from '@supabase/supabase-js';
import { SupabaseService, Tables } from './supabase.service';
import { ElementPropertyService } from './element-property.service';
import { elementComparator, groupBy$ } from '../shared/util/common-utils';
import { ProcessFacadeService } from './process-facade.service';
const snakeCase = require('snakecase-keys');
const camelCase = require('camelcase-keys');

@Injectable({
  providedIn: 'root',
})
export class ElementFacadeService {
  private readonly _elements$: BehaviorSubject<Element[]> = new BehaviorSubject<
    Element[]
  >([]);
  private _supabaseClient: SupabaseClient = this.supabase.supabase;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly elementPropertyService: ElementPropertyService,
    private readonly processService: ProcessFacadeService
  ) {
    const sessionChanges$ = supabase.currentSession$.pipe(
      concatMap(() => this.loadElements$()),
      catchError(() => of([]))
    );
    const elemPropChanges$ = elementPropertyService.elementProperties$.pipe(
      skip(2),
      concatMap(value => groupBy$(value, 'elementId')),
      filter(({ key }) => !!key),
      map(({ key, values }) =>
        this.addPropertiesToElements(this._elements$.getValue(), key!, values)
      )
    );
    merge(this.elementChanges$(), sessionChanges$, elemPropChanges$).subscribe(
      properties => {
        this._elements$.next(properties);
      }
    );
  }

  get elements$(): Observable<Element[]> {
    return this._elements$.pipe(distinctUntilChanged(elementComparator));
  }

  get elements(): Element[] {
    return this._elements$.getValue();
  }

  public saveElement$(elem: Element): Observable<Element> {
    return this.upsertElement$(elem).pipe(
      concatMap(newElem => {
        const props = elem.elementProperties;
        elem = newElem;
        return (
          props?.map(val =>
            this.elementPropertyService.saveElementProp$(val, newElem.id)
          ) || of([])
        );
      }),
      concatAll(),
      toArray(),
      map(elemProps => {
        elem.elementProperties = elemProps;
        return elem;
      })
    );
  }

  public deleteElement$(id: number): Observable<PostgrestError> {
    const del = this._supabaseClient
      .from(Tables.elements)
      .delete()
      .eq('id', id);
    return from(del).pipe(
      filter(({ error }) => !!error),
      map(({ error }) => error!)
    );
  }

  public elementById$(id: number): Observable<Element> {
    return this._elements$.pipe(
      mergeAll(),
      filter(elements => elements.id === id),
      distinctUntilChanged(elementComparator)
    );
  }

  public elementsByProcessIdAndStepId$(
    processId: number,
    stepId: number | null | undefined
  ): Observable<Element[]> {
    return this._elements$.pipe(
      map(elements =>
        elements.filter(
          e => e.processId === processId && e.currentStepId === stepId
        )
      )
    );
  }

  public elementsByProcessId$(id: number | undefined): Observable<Element[]> {
    return this.elements$.pipe(
      map(elements => elements.filter(element => element.processId === id))
    );
  }

  public elementsByProcessName$(processName: string): Observable<Element[]> {
    const processByName = this.processService.processes.find(
      proc => proc.name?.toLowerCase() === processName.toLowerCase()
    );
    return this.elementsByProcessId$(processByName?.id).pipe(
      map(elements => elements.filter(e => e.currentStepId === null))
    );
  }

  public elementById(id: number): Element {
    const element = this.elements.find(e => e.id === id);
    if (!element) {
      throw Error(`Element with id ${id} not found`);
    }
    return element;
  }

  private upsertElement$({
    id,
    name,
    processId,
    currentStepId,
  }: Element): Observable<Element> {
    const upsertElem = { id, name, processId, currentStepId };
    const upsert = this._supabaseClient
      .from(Tables.elements)
      .upsert(snakeCase(upsertElem))
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

  private elementChanges$(): Observable<Element[]> {
    const changes$: Subject<Element[]> = new Subject<Element[]>();
    this._supabaseClient
      .channel('element-change')
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL,
          schema: 'public',
          table: Tables.elements,
        },
        payload => {
          const state = this._elements$.getValue();
          switch (payload.eventType) {
            case 'INSERT':
              changes$.next(this.insertElement(state, camelCase(payload.new)));
              break;
            case 'UPDATE':
              const props = this.elementPropertyService.elementProperties;
              this.updateElementWithProperties$(
                state,
                camelCase(payload.new),
                props
              ).subscribe(elements => {
                changes$.next(elements);
              });
              break;
            case 'DELETE':
              const element: Element = payload.old;
              if (element.id) {
                changes$.next(this.deleteElement(state, element.id));
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

  private loadElements$(): Observable<Element[]> {
    const select = this._supabaseClient.from(Tables.elements).select(`
        *,
        element_properties: ${Tables.elementProperties} (*)
      `);
    return from(select).pipe(
      map(({ data, error }) => {
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

  private updateElementWithProperties$(
    state: Element[],
    element: Element,
    props: ElementProperty[]
  ): Observable<Element[]> {
    return groupBy$(props, 'elementId').pipe(
      filter(({ key }) => !!key),
      map(({ key, values }) => {
        element = this.addPropertiesToElement(element, key!, values);
        return state.map(value => (value.id === element.id ? element : value));
      })
    );
  }

  private addPropertiesToElements(
    state: Element[],
    elementId: number,
    values: ElementProperty[]
  ): Element[] {
    return state.map(element =>
      this.addPropertiesToElement(element, elementId, values)
    );
  }

  private addPropertiesToElement(
    element: Element,
    elementId: number,
    values: ElementProperty[]
  ): Element {
    if (element.id === elementId) {
      element.elementProperties = values;
    }
    return element;
  }
}
