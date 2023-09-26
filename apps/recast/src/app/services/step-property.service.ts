import { Injectable } from '@angular/core';
import { SupabaseService, Tables } from './supabase.service';
import {
  PostgrestError,
  REALTIME_LISTEN_TYPES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
  SupabaseClient,
} from '@supabase/supabase-js';
import { StepProperty } from '../../../build/openapi/recast';
import {
  BehaviorSubject,
  catchError,
  concatMap,
  distinctUntilChanged,
  filter,
  from,
  map,
  merge,
  Observable,
  of,
  Subject,
  tap,
  zip,
} from 'rxjs';
import {
  elementComparator,
  snakeCaseKeys,
  camelCaseKeys,
} from '../shared/util/common-utils';
import { PredictionTemplateService } from './prediction-template.service';

@Injectable({
  providedIn: 'root',
})
export class StepPropertyService {
  private readonly _stepProperties$: BehaviorSubject<StepProperty[]> =
    new BehaviorSubject<StepProperty[]>([]);
  private readonly _supabaseClient: SupabaseClient = this.supabase.supabase;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly predictionTemplateService: PredictionTemplateService
  ) {
    const predictionTemplateChanges$ =
      predictionTemplateService.predictionTemplates$.pipe(
        concatMap(() => this.loadProperties$()),
        catchError(() => of([]))
      );
    const sessionChanges$ = supabase.currentSession$.pipe(
      concatMap(() => this.loadProperties$()),
      catchError(() => of([]))
    );
    merge(
      sessionChanges$,
      this.propertyChanges$(),
      predictionTemplateChanges$
    ).subscribe(properties => {
      this._stepProperties$.next(properties);
    });
  }

  get stepProperties$(): Observable<StepProperty[]> {
    return this._stepProperties$.pipe(distinctUntilChanged(elementComparator));
  }

  get stepProperties(): StepProperty[] {
    return this._stepProperties$.getValue();
  }

  public saveStepProp$(
    prop: StepProperty,
    stepId: number | undefined
  ): Observable<StepProperty> {
    return this.upsertStepProp$(prop, stepId).pipe(
      map(stepProp => {
        stepProp.predictionTemplate = prop.predictionTemplate;
        if (stepProp.predictionTemplate) {
          stepProp.predictionTemplate.stepPropertyId = stepProp.id;
        }
        return stepProp;
      }),
      concatMap(stepProp => {
        const template = stepProp.predictionTemplate;
        if (template) {
          return zip(
            of(stepProp),
            this.predictionTemplateService.savePredictionTemplate$(template)
          );
        }
        return zip(of(stepProp));
      }),
      map(([stepProp]) => stepProp)
    );
  }

  public deleteStepPropById$(id: number): Observable<PostgrestError> {
    const del = this._supabaseClient
      .from(Tables.stepProperties)
      .delete()
      .eq('id', id);
    return from(del).pipe(
      filter(({ error }) => !!error),
      map(({ error }) => error!)
    );
  }

  public stepPropertyById$(id: number): Observable<StepProperty | undefined> {
    return this._stepProperties$.pipe(
      map(props => props.find(prop => prop.id === id)),
      distinctUntilChanged(elementComparator)
    );
  }

  public stepPropertyById(id: number): StepProperty {
    const stepProp = this.stepProperties.find(prop => prop.id === id);
    if (!stepProp) {
      throw Error(`stepProperty with id ${id} not found`);
    }
    return stepProp;
  }

  public stepPropertiesByStepId$(id: number): Observable<StepProperty[]> {
    return this._stepProperties$.pipe(
      map(props => props.filter(p => p.stepId === id))
    );
  }

  private upsertStepProp$(
    { id, name, defaultValue, description, type, required }: StepProperty,
    stepId: number | undefined
  ): Observable<StepProperty> {
    const upsertProp = {
      id,
      name,
      stepId,
      defaultValue,
      description,
      type,
      required,
    };
    const upsert = this._supabaseClient
      .from(Tables.stepProperties)
      .upsert(snakeCaseKeys(upsertProp))
      .select();
    return from(upsert).pipe(
      filter(({ data, error }) => !!data || !!error),
      map(({ data, error }) => {
        if (error) {
          throw error;
        }
        return camelCaseKeys(data[0]);
      }),
      tap(stepProp => {
        this._stepProperties$.next(
          this.updateProperty(this._stepProperties$.getValue(), stepProp)
        );
      })
    );
  }

  private propertyChanges$(): Observable<StepProperty[]> {
    const changes$: Subject<StepProperty[]> = new Subject<StepProperty[]>();
    this._supabaseClient
      .channel('step-property-change')
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL,
          schema: 'public',
          table: Tables.stepProperties,
        },
        payload => {
          const state = this._stepProperties$.getValue();
          switch (payload.eventType) {
            case 'INSERT': {
              const property = camelCaseKeys(payload.new) as StepProperty;
              if (!property.predictionTemplate) {
                property.predictionTemplate =
                  this.predictionTemplateService.predictionTemplateByStepPropertyId(
                    property.id
                  );
              }
              changes$.next(this.insertProperty(state, property));
              break;
            }
            case 'UPDATE': {
              const property = camelCaseKeys(payload.new) as StepProperty;
              if (!property.predictionTemplate) {
                property.predictionTemplate =
                  this.predictionTemplateService.predictionTemplateByStepPropertyId(
                    property.id
                  );
              }
              changes$.next(this.updateProperty(state, property));
              break;
            }
            case 'DELETE': {
              const prop: Partial<{ [p: string]: any }> = payload.old;
              if (prop['id']) {
                changes$.next(this.deleteProperty(state, prop['id']));
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

  private loadProperties$(): Observable<StepProperty[]> {
    const select = this._supabaseClient.from(Tables.stepProperties).select();
    return from(select).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }
        return data?.map(camelCaseKeys);
      })
    );
  }

  private updateProperty(
    state: StepProperty[],
    prop: StepProperty
  ): StepProperty[] {
    const exists = !!state.find(value => value.id === prop.id);
    if (!exists) {
      return this.insertProperty(state, prop);
    }
    return state.map(value => (value.id === prop.id ? prop : value));
  }

  private deleteProperty(state: StepProperty[], id: number): StepProperty[] {
    return state.filter(prop => prop.id !== id);
  }

  private insertProperty(
    state: StepProperty[],
    prop: StepProperty
  ): StepProperty[] {
    return state.concat(prop);
  }
}
