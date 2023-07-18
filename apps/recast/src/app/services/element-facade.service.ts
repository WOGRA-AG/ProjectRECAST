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
  mergeMap,
  Observable,
  of,
  skip,
  Subject,
  take,
  tap,
  toArray,
} from 'rxjs';
import { Element, ElementProperty } from '../../../build/openapi/recast';
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
import { StepFacadeService } from './step-facade.service';

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
    private readonly processService: ProcessFacadeService,
    private readonly stepService: StepFacadeService
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
    merge(this.elementChanges$(), sessionChanges$, elemPropChanges$)
      .pipe(distinctUntilChanged(elementComparator))
      .subscribe(elements => {
        this._elements$.next(elements);
      });
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
          props?.map(val => {
            val.elementId = elem.id;
            return this.elementPropertyService.saveElementProp$(val);
          }) || of([])
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

  public createElement$(processId: number, name: string): Observable<Element> {
    return this.stepService.stepsByProcessId$(processId).pipe(
      concatMap(steps => {
        const stepId = steps.length > 0 ? steps[0].id : null;
        return this.saveElement$({
          processId,
          name,
          currentStepId: stepId,
        });
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
      tap(() => this._elements$.next(this.deleteElement(this.elements, id))),
      map(({ error }) => error!)
    );
  }

  public elementById$(id: number): Observable<Element> {
    return this._elements$.pipe(
      map(elements => elements.find(e => e.id === id)),
      filter(Boolean),
      filter(e => !!e.elementProperties),
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
    return this.processService.processByName$(processName).pipe(
      mergeMap(process => this.elementsByProcessId$(process?.id)),
      map(elements => elements.filter(e => e.currentStepId === null))
    );
  }

  public elementById(id: number): Element | undefined {
    return this.elements.find(e => e.id === id);
  }

  public updateCurrentStepInState$(
    elementId: number,
    stepId: number | null
  ): Observable<Element | undefined> {
    const element = { ...this.elementById(elementId) };
    if (!element) {
      return of(undefined);
    }
    element.currentStepId = stepId;
    const newState = this.deleteElement(this._elements$.getValue(), elementId);
    this._elements$.next(newState.concat(element));
    return of(element);
  }

  public updateElements$(): Observable<void> {
    return this.loadElements$().pipe(
      take(1),
      map(elements => {
        this._elements$.next(elements);
      })
    );
  }

  public elementsByBundleIdAndProcessName$(
    bundleId: number,
    processName: string
  ): Observable<Element[]> {
    return this.processService.processesByBundleId$(bundleId).pipe(
      map(processes => processes.find(p => p.name === processName)),
      mergeMap(process => this.elementsByProcessId$(process?.id))
    );
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
        if (error) {
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
            case 'INSERT': {
              changes$.next(this.insertElement(state, camelCase(payload.new)));
              break;
            }
            case 'UPDATE': {
              const props = this.elementPropertyService.elementProperties;
              this.updateElementWithProperties$(
                state,
                camelCase(payload.new),
                props
              )
                .pipe(distinctUntilChanged(elementComparator))
                .subscribe(elements => changes$.next(elements));
              break;
            }
            case 'DELETE': {
              const element: Element = payload.old;
              if (element.id) {
                changes$.next(this.deleteElement(state, element.id));
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

  private loadElements$(): Observable<Element[]> {
    const select = this._supabaseClient.from(Tables.elements).select(
      `
        *,
        element_properties: ${Tables.elementProperties} (*)
      `,
      {
        head: false,
        count: 'planned',
      }
    );
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
    element.elementProperties = [];
    return state.concat(element);
  }

  private updateElementWithProperties$(
    state: Element[],
    element: Element,
    props: ElementProperty[]
  ): Observable<Element[]> {
    const filteredProps = props.filter(prop => prop.elementId === element.id);
    if (!filteredProps.length) {
      element = this.addPropertiesToElement(element, element.id!, []);
      return of(
        state.map(value => (value.id === element.id ? element : value))
      );
    }
    return groupBy$(props, 'elementId').pipe(
      filter(({ key }) => key === element.id),
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
