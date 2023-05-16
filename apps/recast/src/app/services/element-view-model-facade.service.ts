import { Injectable } from '@angular/core';
import {
  ElementViewModel,
  ElementViewProperty,
} from '../model/element-view-model';
import {
  BehaviorSubject,
  map,
  merge,
  Observable,
  of,
  filter,
  switchMap,
  distinctUntilChanged,
  combineLatestWith,
  mergeMap,
} from 'rxjs';
import { ElementFacadeService } from './element-facade.service';
import { ProcessFacadeService } from './process-facade.service';
import { SupabaseService } from './supabase.service';
import {
  Element,
  Process,
  Step,
  StepProperty,
  ElementProperty,
} from '../../../build/openapi/recast';
import { StepFacadeService } from './step-facade.service';
import { elementComparator } from '../shared/util/common-utils';
import {
  addObjectToState,
  removeObjectFromState,
} from '../shared/util/state-management';

@Injectable({
  providedIn: 'root',
})
export class ElementViewModelFacadeService {
  private _elementViewModels$ = new BehaviorSubject<ElementViewModel[]>([]);
  constructor(
    private readonly supabase: SupabaseService,
    private readonly processService: ProcessFacadeService,
    private readonly elementService: ElementFacadeService,
    private readonly stepService: StepFacadeService
  ) {
    merge(supabase.currentSession$, elementService.elements$)
      .pipe(
        switchMap(() => this._initElementViewModels$()),
        map(elementViewModel =>
          this._addOrUpdateElementViewModel(elementViewModel)
        )
      )
      .subscribe();
  }

  public get elementViewModels$(): Observable<ElementViewModel[]> {
    return this._elementViewModels$.asObservable();
  }

  public get elementViewModels(): ElementViewModel[] {
    return this._elementViewModels$.getValue();
  }

  public elementViewModelByElementId$(
    elementId: number
  ): Observable<ElementViewModel | undefined> {
    return this._elementViewModels$.pipe(
      filter(elementViewModels => !!elementViewModels.length),
      map(elementViewModels =>
        elementViewModels.find(
          (elementViewModel: ElementViewModel) =>
            elementViewModel.element.id === elementId
        )
      )
    );
  }

  public elementViewModelByProcessId$(
    processId: number
  ): Observable<ElementViewModel | undefined> {
    return this._elementViewModels$.pipe(
      map(elementViewModels =>
        elementViewModels.find(
          elementViewModel => elementViewModel.element.processId === processId
        )
      )
    );
  }
  private _initElementViewModels$(): Observable<ElementViewModel> {
    return this._elements$().pipe(
      switchMap(elements =>
        elements.map(element => this._elementViewModelFromElement$(element))
      ),
      mergeMap(elementViewModel => elementViewModel),
      distinctUntilChanged(elementComparator)
    );
  }

  private _elementViewModelFromElement$(
    element: Element
  ): Observable<ElementViewModel> {
    return this._processById$(element.processId!).pipe(
      combineLatestWith(
        this._stepById$(element.currentStepId!),
        this._stepsByProcessId$(element.processId!),
        this._stepPropertiesByProcessId$(element.processId!),
        this._elementPropertiesByElementId$(element.id!)
      ),
      filter(([process, _1, _2, _3, _4]) => !!process),
      switchMap(([process, step, steps, stepProperties, elementProperties]) =>
        this._elementViewModelFromElementAndProcessAndStepAndStepPropertiesAndElementProperties$(
          element,
          process,
          step,
          steps,
          stepProperties,
          elementProperties
        )
      )
    );
  }

  private _elementViewModelFromElementAndProcessAndStepAndStepPropertiesAndElementProperties$(
    element: Element,
    process: Process | undefined,
    step: Step | undefined,
    steps: Step[],
    stepProperties: StepProperty[],
    elementProperties: ElementProperty[]
  ): Observable<ElementViewModel> {
    if (!process) {
      throw new Error('Process is undefined');
    }
    const elementViewProperties: ElementViewProperty[] =
      this._elementViewModelsFromElementPropertiesAndStepProperties(
        elementProperties,
        stepProperties
      );
    console.log('elementViewProperties', elementViewProperties);
    return of({
      element,
      process,
      currentStep: step,
      sortedSteps: steps,
      properties: elementViewProperties,
    });
  }

  private _elements$(): Observable<Element[]> {
    return this.elementService.elements$;
  }

  private _processById$(id: number): Observable<Process | undefined> {
    return this.processService.processById$(id);
  }

  private _stepById$(id: number): Observable<Step | undefined> {
    return this.stepService.stepById$(id);
  }

  private _stepsByProcessId$(id: number): Observable<Step[]> {
    return this.stepService.stepsByProcessId$(id);
  }

  private _stepPropertiesByStepId$(id: number): Observable<StepProperty[]> {
    return this.stepService
      .stepById$(id)
      .pipe(map(step => step?.stepProperties ?? []));
  }

  private _stepPropertiesByProcessId$(id: number): Observable<StepProperty[]> {
    return this.stepService.stepsByProcessId$(id).pipe(
      map(steps => {
        const stepProperties: StepProperty[] = [];
        steps.forEach(step => {
          stepProperties.push(...(step.stepProperties ?? []));
        });
        return stepProperties;
      })
    );
  }

  private _elementPropertiesByElementId$(
    id: number
  ): Observable<ElementProperty[]> {
    return this.elementService
      .elementById$(id)
      .pipe(map(element => element?.elementProperties ?? []));
  }

  private _elementViewModelsFromElementPropertiesAndStepProperties(
    elementProperties: ElementProperty[],
    stepProperties: StepProperty[]
  ): ElementViewProperty[] {
    const elementViewProperties: ElementViewProperty[] = [];
    stepProperties.forEach(stepProperty => {
      const elementProperty = elementProperties.find(
        prop => prop.stepPropertyId === stepProperty.id
      );
      elementViewProperties.push({
        type: stepProperty.type!,
        label: stepProperty.name!,
        hint: stepProperty.description!,
        stepPropId: stepProperty.id!,
        stepId: stepProperty.stepId!,
        storageBackend: elementProperty?.storageBackend,
        defaultValue: stepProperty.defaultValue ?? '',
        value: elementProperty?.value,
      });
    });
    return elementViewProperties;
  }

  private _addOrUpdateElementViewModel(
    elementViewModel: ElementViewModel
  ): void {
    const state = this._elementViewModels$.getValue();
    const index = state.findIndex(
      viewModel => viewModel.element.id === elementViewModel.element.id
    );
    let newState = state.slice();
    if (index !== -1) {
      newState = removeObjectFromState(index, newState);
    }
    newState = addObjectToState(elementViewModel, newState);
    this._elementViewModels$.next(newState);
  }
}
