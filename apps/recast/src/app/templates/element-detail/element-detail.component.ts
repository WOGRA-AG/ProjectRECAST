import { Component, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Element, Step, ValueType, Process } from 'build/openapi/recast';
import {
  catchError,
  filter,
  map,
  of,
  Subject,
  takeUntil,
  Observable,
  take,
  from,
  distinctUntilChanged,
  concatMap,
  zip,
  toArray,
} from 'rxjs';
import { Breadcrumb } from 'src/app/design/components/molecules/breadcrumb/breadcrumb.component';
import {
  ElementFacadeService,
  ProcessFacadeService,
  ElementViewModelFacadeService,
} from 'src/app/services';
import { ConfirmDialogComponent } from '../../design/components/organisms/confirm-dialog/confirm-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import {
  ElementViewModel,
  ElementViewProperty,
  ViewModelValueType,
} from '../../model/element-view-model';
import { elementComparator } from '../../shared/util/common-utils';
import { AlertService } from '../../services/alert.service';
import {
  fileExtensionValidator,
  imageFileExtensionValidator,
} from '../../validators/file-extension-validator';
import { PredictionService } from '../../services/prediction.service';

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
  public propertiesForm: FormGroup = this.formBuilder.group({
    invalid: new FormControl({ value: '', disabled: true }),
  });
  public loading = false;
  public elementViewModel: ElementViewModel | undefined;
  protected readonly ValueTypeEnum = ValueType;
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
    private elementService: ElementFacadeService,
    private elementViewService: ElementViewModelFacadeService,
    private formBuilder: FormBuilder,
    private router: Router,
    private dialog: MatDialog,
    private alert: AlertService,
    private predictionService: PredictionService
  ) {
    this._elementViewModel$
      .pipe(
        takeUntil(this._destroy$),
        concatMap(elementViewModel => {
          this.elementViewModel = elementViewModel;
          this.initBreadcrumbs(elementViewModel.process);
          this.initializeComponentProperties(
            elementViewModel.currentStep,
            elementViewModel.sortedSteps
          );
          return this.initFormGroup$(elementViewModel);
        }),
        concatMap(() => this.initPredictions(this.elementViewModel!))
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
      this.router.navigate(['../..'], { relativeTo: this.route })
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
          takeUntil(this._destroy$),
          catchError((err: Error) => {
            this.alert.reportError(err.message);
            return of(undefined);
          })
        )
        .subscribe(element => {
          this.loading = false;
          if (!element) {
            return;
          }
          this.navigateForward();
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
        take(1),
        concatMap(confirmed => {
          if (!confirmed) {
            return of(undefined);
          }
          return this.elementViewService
            .updateValuesFromElementViewModel$(newModel)
            .pipe(
              takeUntil(this._destroy$),
              catchError((err: Error) => {
                this.alert.reportError(err.message);
                return of(undefined);
              })
            );
        })
      )
      .subscribe(element => {
        this.loading = false;
        if (!element) {
          return;
        }
        this.navigateForward();
      });
  }

  public stepChanged(index: number): void {
    if (index >= this._steps.indexOf(this._currentStep!)) {
      return;
    }
    this.navigateStep$(this._steps[index]).pipe(take(1)).subscribe();
  }

  public elementsByReference(
    reference: string | undefined
  ): Observable<Element[]> {
    if (!reference) {
      return of([]);
    }
    const bundleId = this.elementViewModel?.process?.bundleId ?? 0;
    return this.elementService.elementsByBundleIdAndProcessName$(
      bundleId,
      reference
    );
  }

  protected isReference(type: string): boolean {
    return this.processService.isReference(type);
  }

  protected compareByStepPropId = (
    a: ElementViewProperty,
    b: ElementViewProperty
  ): number => a.stepPropId - b.stepPropId;

  private initFormGroup$(elementViewModel: ElementViewModel): Observable<void> {
    for (const prop of elementViewModel.properties ?? []) {
      let val: ViewModelValueType = prop.value ?? prop.defaultValue;
      if (
        this.processService.isReference(prop.type) &&
        !!Object.getOwnPropertyDescriptor(val, 'name')
      ) {
        val = val as Element;
        val = val.name!;
      }
      this.updateControl(`${prop.stepPropId}`, val, prop.type, prop.required);
    }
    return of(undefined);
  }

  private initPredictions(
    elementViewModel: ElementViewModel
  ): Observable<void> {
    return from(elementViewModel.properties).pipe(
      concatMap(prop => {
        if (!prop.predictionTemplate) {
          return zip(of(prop), of(prop.predictionTemplate));
        }
        return zip(
          of(prop),
          this.predictionService
            .updatePredictionValue(
              elementViewModel.element.id!,
              prop.predictionTemplate
            )
            .pipe(take(1))
        );
      }),
      map(([prop, predictionTemplate]) => {
        prop.predictionTemplate = predictionTemplate;
      }),
      toArray(),
      map(() => undefined)
    );
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
    const nextStep = !this.isLastStep
      ? this._steps[this.currentIndex + 1]
      : undefined;
    const element = {
      ...this.elementViewModel.element,
      elementProperties: [],
      currentStepId: !this.isLastStep && !!nextStep ? nextStep.id : null,
    };
    this.elementService
      .saveElement$(element)
      .pipe(
        take(1),
        concatMap(() => {
          if (!this.isLastStep) {
            return of(undefined);
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
      concatMap(id => this.elementViewService.elementViewModelByElementId$(id)),
      catchError((err: Error) => {
        this.alert.reportError(err.message);
        return of(undefined);
      }),
      filter(Boolean),
      distinctUntilChanged(elementComparator)
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

  private updateControl(
    name: string,
    value: any,
    type: ValueType,
    req = false
  ): void {
    if (
      this.processService.isReference(type) &&
      !!Object.getOwnPropertyDescriptor(value, 'name')
    ) {
      value = value as Element;
      value = value.id!;
    }
    const control = this.propertiesForm.get(name);
    if (!control) {
      this.propertiesForm.addControl(
        name,
        new FormControl(
          { value, disabled: !this._currentStep },
          this._getValidators(type, req)
        )
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

  private _getValidators(type: ValueType, required = false): ValidatorFn[] {
    const validators: ValidatorFn[] = required ? [Validators.required] : [];
    if (type === ValueType.Image) {
      validators.push(imageFileExtensionValidator);
    }
    if (type === ValueType.Dataset || type === ValueType.Timeseries) {
      validators.push(fileExtensionValidator(['csv']));
    }
    if (type === ValueType.Color) {
      validators.push(Validators.pattern(/^#[0-9A-F]{6}$/i));
    }
    if (type === ValueType.Number) {
      validators.push(Validators.pattern(/^-?\d*([,.])?\d*$/));
    }
    return validators;
  }
}
