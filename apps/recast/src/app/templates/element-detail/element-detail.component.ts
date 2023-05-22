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
  distinctUntilChanged,
  mergeMap,
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
import { StorageService } from '../../storage/services/storage.service';
import TypeEnum = StepProperty.TypeEnum;
import {
  ElementViewModel,
  ElementViewProperty,
} from '../../model/element-view-model';
import { elementComparator, isReference } from '../../shared/util/common-utils';

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
  private _stepProperties: StepProperty[] = [];
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
    private storageService: StorageService,
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
    this.propertiesForm.valueChanges
      .pipe(takeUntil(this._destroy$), distinctUntilChanged(elementComparator))
      .subscribe(values => {
        const props = this.elementViewModel?.properties ?? [];
        for (const key of Object.keys(values)) {
          const elementViewProperty = props.find(
            prop => '' + prop.stepPropId === key
          );
          if (!elementViewProperty) {
            continue;
          }
          elementViewProperty.value = values[key];
        }
      });
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

  public navigateBack(): void {
    this.router.navigate(['../../../..'], { relativeTo: this.route });
  }

  public async onSubmitClicked(): Promise<void> {
    if (!this.elementViewModel?.element) {
      return;
    }
    this.loading = true;
    if (!this.isLastStep) {
      this.storageService
        .updateValues$(this.elementViewModel)
        .pipe(
          take(1),
          takeUntil(this._destroy$),
          catchError(err => {
            console.log(err);
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
        takeUntil(this._destroy$),
        filter(confirmed => !!confirmed),
        mergeMap(() =>
          this.storageService.updateValues$(this.elementViewModel!)
        )
      )
      .subscribe(() => this.navigateForward());
  }

  public stepChanged(event: number): void {
    if (event >= this._steps.indexOf(this._currentStep!)) {
      return;
    }
    this.navigateStep(this._steps[event]);
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
      let val = prop.value ?? prop.defaultValue;
      if (isReference(prop.type) && val.hasOwnProperty('name')) {
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
    this._stepProperties = step?.stepProperties || [];
    this.currentProperties =
      this.elementViewModel?.properties.filter(
        p => p.stepId === this._currentStep?.id
      ) ?? [];
  }

  private navigateForward(): void {
    if (!this.elementViewModel) {
      return;
    }
    const element = JSON.parse(JSON.stringify(this.elementViewModel.element));
    element.elementProperties = [];
    const nextStep = this.stepService.nextStep(this._currentStep!);
    element.currentStepId = nextStep ? nextStep.id : null;
    this.elementService
      .saveElement$(element)
      .pipe(take(1))
      .subscribe(() => {
        if (nextStep) {
          this.navigateStep(nextStep);
          return;
        }
        this.navigateBack();
      });
  }

  private elementId$(): Observable<number> {
    return this.route.paramMap.pipe(
      filter(param => !!param.get('elementId')),
      map(param => +param.get('elementId')!)
    );
  }

  private elementViewModel$(): Observable<ElementViewModel> {
    return this.elementId$().pipe(
      switchMap(elementId => this.storageService.loadValues$(elementId)),
      catchError(() => {
        alert('View Model not found');
        return of(undefined);
      }),
      filter(Boolean)
    );
  }

  private navigateStep(step: Step): void {
    this.elementService
      .updateCurrentStepInState$(this.elementViewModel?.element.id!, step.id!)
      .pipe(take(1), filter(Boolean))
      .subscribe(element => {
        this.router
          .navigate(['/'], { skipLocationChange: false })
          .then(() =>
            this.router.navigateByUrl(
              '/overview/process/' +
                step.processId! +
                '/step/' +
                step.id! +
                '/element/' +
                element.id
            )
          );
      });
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
    if (type === TypeEnum.Boolean) {
      value = value === 'true';
    }
    if (isReference(type) && value.hasOwnProperty('name')) {
      value = value as Element;
      value = value.id!;
    }
    const control = this.propertiesForm.get(name);
    if (!control) {
      this.propertiesForm.addControl(name, new FormControl(value));
      return;
    }
    control.setValue(value);
  }
}
