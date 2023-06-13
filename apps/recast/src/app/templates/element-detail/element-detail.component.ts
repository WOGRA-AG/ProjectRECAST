import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Element, Step, StepProperty, Process } from 'build/openapi/recast';
import {
  catchError,
  filter,
  map,
  of,
  Subject,
  takeUntil,
  Observable,
  tap,
  switchMap,
  take,
  mergeMap,
  from,
} from 'rxjs';
import { Breadcrumb } from 'src/app/design/components/molecules/breadcrumb/breadcrumb.component';
import {
  ElementFacadeService,
  ProcessFacadeService,
  StepFacadeService,
  StepPropertyService,
  ElementViewModelFacadeService,
} from 'src/app/services';
import { ConfirmDialogComponent } from '../../design/components/organisms/confirm-dialog/confirm-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import TypeEnum = StepProperty.TypeEnum;
import {
  ElementViewModel,
  ElementViewProperty,
  ValueType,
} from '../../model/element-view-model';
import { isReference } from '../../shared/util/common-utils';

// TODO: refactor this class
@Component({
  selector: 'app-element-detail',
  templateUrl: './element-detail.component.html',
  styleUrls: ['./element-detail.component.scss'],
})
export class ElementDetailComponent implements OnDestroy {
  public breadcrumbs: Breadcrumb[] = [];
  public stepTitles: string[] = [];
  public isLastStep = false;
  public propertiesForm: FormGroup = this.formBuilder.group({});
  public loading = false;
  public elementViewModel: ElementViewModel | undefined;
  protected readonly TypeEnum = TypeEnum;
  protected currentProperties: ElementViewProperty[] = [];
  private _currentIndex = 0;
  private _currentStep: Step | undefined;
  private _steps: Step[] = [];
  private readonly _destroy$: Subject<void> = new Subject<void>();
  private _elementViewModel$: Observable<ElementViewModel> =
    this.elementViewModel$();

  constructor(
    private route: ActivatedRoute,
    private processService: ProcessFacadeService,
    private stepService: StepFacadeService,
    private stepPropertyService: StepPropertyService,
    private elementService: ElementFacadeService,
    private elementViewService: ElementViewModelFacadeService,
    private formBuilder: FormBuilder,
    private router: Router,
    private dialog: MatDialog
  ) {
    this._elementViewModel$
      .pipe(
        takeUntil(this._destroy$),
        tap(elementViewModel => {
          this.elementViewModel = elementViewModel;
          this.initBreadcrumbs(elementViewModel.process);
          this.initializeComponentProperties(
            elementViewModel.currentStep,
            elementViewModel.sortedSteps
          );
        }),
        switchMap(elementViewModel => this.initFormGroup$(elementViewModel))
      )
      .subscribe();
  }

  get currentIndex(): number {
    return this._currentIndex;
  }

  set currentIndex(idx: number) {
    if (idx >= 0) {
      this._currentIndex = idx;
    }
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  public navigateBack$(): Observable<void> {
    return from(
      this.router.navigate(['../../../..'], { relativeTo: this.route })
    ).pipe(map(() => undefined));
  }

  public async onSubmitClicked(): Promise<void> {
    if (!this.elementViewModel?.element) {
      return;
    }
    const newModel = this._prepareValueModel();
    this.loading = true;
    if (!this.isLastStep) {
      this.elementViewService
        .updateValuesFromElementViewModel$(newModel)
        .pipe(
          take(newModel.properties.length),
          takeUntil(this._destroy$),
          catchError(err => {
            console.error(err);
            return of(undefined);
          })
        )
        .subscribe(() => {
          this.navigateForward();
          this.loading = false;
        });
      return;
    }
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: $localize`:@@dialog.submit_element:Save Element?`,
        },
        autoFocus: false,
      })
      .afterClosed()
      .pipe(
        tap(() => (this.loading = false)),
        take(newModel.properties.length),
        filter(confirmed => !!confirmed),
        mergeMap(() =>
          this.elementViewService.updateValuesFromElementViewModel$(newModel)
        )
      )
      .subscribe(() => this.navigateForward());
  }

  public stepChanged(event: number): void {
    if (event >= this._steps.indexOf(this._currentStep!)) {
      return;
    }
    this.navigateStep$(this._steps[event]);
  }

  public elementsByReference(
    reference: string | undefined
  ): Observable<Element[]> {
    if (!reference) {
      return of([]);
    }
    return this.elementService.elementsByProcessName$(reference);
  }

  private initFormGroup$(elementViewModel: ElementViewModel): Observable<void> {
    for (const prop of elementViewModel.properties ?? []) {
      let val: ValueType = prop.value ?? prop.defaultValue;
      if (isReference(prop.type) && val?.hasOwnProperty('name')) {
        val = val as Element;
        val = val.name!;
      }
      this.updateControl(`${prop.stepPropId}`, val, prop.type);
    }
    return of(undefined);
  }

  private initializeComponentProperties(
    step: Step | undefined,
    steps: Step[]
  ): void {
    this.stepTitles = steps.map(s => s.name!);
    this._steps = steps;
    this._currentStep = step;
    this.currentIndex = step ? this._steps.indexOf(step) : 0;
    this.isLastStep = this._steps.length - 1 === this.currentIndex;
    this.currentProperties = !this._currentStep
      ? this.elementViewModel?.properties!
      : this.elementViewModel?.properties.filter(
          p => p.stepId === this._currentStep?.id
        ) ?? [];
  }

  private navigateForward(): void {
    if (!this.elementViewModel) {
      return;
    }
    const nextStep = this.stepService.nextStep(this._currentStep!);
    const element = {
      ...this.elementViewModel.element,
      elementProperties: [],
      currentStepId: !this.isLastStep && !!nextStep ? nextStep.id : null,
    };
    this.elementService
      .saveElement$(element)
      .pipe(
        take(1),
        switchMap(() => {
          if (!this.isLastStep) {
            return this.navigateStep$(nextStep!);
          }
          return this.navigateBack$();
        })
      )
      .subscribe(() => (this.loading = false));
  }

  private elementId$(): Observable<number> {
    return this.route.paramMap.pipe(
      filter(param => !!param.get('elementId')),
      map(param => +param.get('elementId')!)
    );
  }

  private elementViewModel$(): Observable<ElementViewModel> {
    return this.elementId$().pipe(
      switchMap(id => this.elementViewService.elementViewModelByElementId$(id)),
      filter(Boolean),
      catchError(err => {
        console.error(err);
        return of(undefined);
      }),
      filter(Boolean)
    );
  }

  private navigateStep$(step: Step): Observable<void> {
    return this.elementService
      .updateCurrentStepInState$(this.elementViewModel?.element.id!, step.id!)
      .pipe(
        take(1),
        filter(Boolean),
        map(() => undefined)
      );
  }

  private initBreadcrumbs(process: Process): void {
    this.breadcrumbs = [
      {
        label: $localize`:@@header.overview:Overview`,
        link: '/overview',
      },
      { label: process.name!, link: '/overview/process/' + process.id },
      { label: this.elementViewModel?.element.name! },
    ];
  }

  private updateControl(name: string, value: any, type: TypeEnum): void {
    if (isReference(type) && value.hasOwnProperty('name')) {
      value = value as Element;
      value = value.id!;
    }
    const control = this.propertiesForm.get(name);
    if (!control) {
      this.propertiesForm.addControl(
        name,
        new FormControl({ value, disabled: !this._currentStep })
      );
      return;
    }
    control.setValue(value);
  }

  private _prepareValueModel(): ElementViewModel {
    return {
      ...this.elementViewModel!,
      properties: this.elementViewModel!.properties.map(prop => {
        const stepIndex = this._steps.findIndex(s => s.id === prop.stepId);
        const value = this.propertiesForm.get('' + prop.stepPropId)?.value;
        return stepIndex <= this.currentIndex ? { ...prop, value } : prop;
      }),
    };
  }
}
