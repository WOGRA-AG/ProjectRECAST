import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Element, Step, StepProperty, Process } from 'build/openapi/recast';
import {
  catchError,
  filter,
  map,
  mergeMap,
  of,
  Subject,
  takeUntil,
  combineLatestWith,
  Observable,
  tap,
} from 'rxjs';
import { Breadcrumb } from 'src/app/design/components/molecules/breadcrumb/breadcrumb.component';
import { ElementFacadeService } from 'src/app/services/element-facade.service';
import { ElementPropertyService } from 'src/app/services/element-property.service';
import { ProcessFacadeService } from 'src/app/services/process-facade.service';
import { StepFacadeService } from 'src/app/services/step-facade.service';
import { StepPropertyService } from 'src/app/services/step-property.service';
import { ConfirmDialogComponent } from '../../design/components/organisms/confirm-dialog/confirm-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { strToFile, fileToStr } from '../../shared/util/common-utils';
import TypeEnum = StepProperty.TypeEnum;

@Component({
  selector: 'app-element-detail',
  templateUrl: './element-detail.component.html',
  styleUrls: ['./element-detail.component.scss'],
})
export class ElementDetailComponent implements OnDestroy {
  public element: Element | undefined;
  public breadcrumbs: Breadcrumb[] = [];
  public stepTitles: string[] = [];
  public isLastStep = false;
  public stepProperties: StepProperty[] = [];
  public propertiesForm = this.formBuilder.group({});
  private _currentIndex = 0;
  private _currentStep: Step | undefined;
  private _steps: Step[] = [];
  private readonly _destroy$: Subject<void> = new Subject<void>();
  private _steps$: Observable<Step[]> = this.steps$();
  private _process$: Observable<Process | undefined> = this.process$();
  private _element$: Observable<Element> = this.element$();
  private _step$ = this.step$();

  constructor(
    private route: ActivatedRoute,
    private processService: ProcessFacadeService,
    private stepService: StepFacadeService,
    private stepPropertyService: StepPropertyService,
    private elementService: ElementFacadeService,
    private elementPropertyService: ElementPropertyService,
    private formBuilder: FormBuilder,
    private router: Router,
    private dialog: MatDialog
  ) {
    this._process$
      .pipe(
        takeUntil(this._destroy$),
        combineLatestWith(this._element$, this._step$, this._steps$),
        filter(
          ([process, element, step, steps]) =>
            !!process && !!element && !!step && !!steps
        ),
        tap(([_, element, step, steps]) => {
          this._steps = steps;
          this.stepTitles = steps.map(s => s.name!);
          this.element = element;
          this._currentStep = step;
          this.currentIndex = this._steps.indexOf(step);
          this.isLastStep = this._steps.length - 1 === this.currentIndex;
          this.stepProperties = step.stepProperties || [];
        })
      )
      .subscribe(([process, element, _, _1]) => {
        this.initBreadcrumbs(process!);
        this.stepProperties.forEach(p => {
          const elemProp = element.elementProperties?.find(
            e => e.stepPropertyId === p.id
          );
          const value: string = !!elemProp
            ? elemProp.value || ''
            : p.defaultValue || '';
          this.updateControl(`${p.id}`, value, p.type!);
        });
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
    for (const prop of this.stepProperties) {
      let value: any = this.propertiesForm.get(`${prop.id}`)?.value;
      if (prop.type === TypeEnum.File && value) {
        value = await fileToStr(value);
      }
      this.updateElementProperty(prop, value);
    }
    this.navigateForward();
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

  private navigateForward(): void {
    if (!this.isLastStep) {
      const nextStep = this._steps[this.currentIndex + 1];
      this.updateElementCurrentStep(this.element?.id!, nextStep.id!);
      this.navigateStep(nextStep);
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
        takeUntil(this._destroy$),
        filter(confirmed => !!confirmed),
        map(() => {
          this.updateElementCurrentStep(this.element?.id!, null);
          this.navigateBack();
        })
      )
      .subscribe();
  }

  private step$(): Observable<Step> {
    return this.route.paramMap.pipe(
      filter(param => !!param.get('stepId')),
      map(param => +param.get('stepId')!),
      mergeMap(id => this.stepService.stepById$(id))
    );
  }

  private element$(): Observable<Element> {
    return this.route.paramMap.pipe(
      filter(param => !!param.get('elementId')),
      map(param => +param.get('elementId')!),
      mergeMap(id => this.elementService.elementById$(id))
    );
  }

  private process$(): Observable<Process | undefined> {
    return this.route.paramMap.pipe(
      filter(param => !!param.get('processId')),
      map(param => +param.get('processId')!),
      mergeMap(id => this.processService.processById$(id))
    );
  }

  private steps$(): Observable<Step[]> {
    return this.route.paramMap.pipe(
      filter(param => !!param.get('processId')),
      map(param => +param.get('processId')!),
      mergeMap(id => this.stepService.stepsByProcessId$(id))
    );
  }

  private navigateStep(step: Step): void {
    this.router
      .navigate(['/'], { skipLocationChange: true })
      .then(() =>
        this.router.navigateByUrl(
          '/overview/process/' +
            step.processId! +
            '/step/' +
            step.id! +
            '/element/' +
            this.element?.id
        )
      );
  }

  private updateElementProperty(property: StepProperty, value: string): void {
    this.elementPropertyService
      .saveElementProp$(
        {
          value,
          stepPropertyId: property.id,
        },
        this.element?.id
      )
      .pipe(
        catchError(err => {
          console.error(err);
          return of(undefined);
        }),
        takeUntil(this._destroy$)
      )
      .subscribe();
  }

  private updateElementCurrentStep(id: number, stepId: number | null): void {
    this.elementService
      .saveElement$({
        id,
        currentStepId: stepId,
      })
      .pipe(
        catchError(err => {
          console.error(err);
          return of(undefined);
        }),
        takeUntil(this._destroy$)
      )
      .subscribe();
  }

  private initBreadcrumbs(process: Process): void {
    this.breadcrumbs = [
      {
        label: $localize`:@@header.overview:Overview`,
        link: '/overview',
      },
      { label: process.name!, link: '/overview/process/' + process.id },
      { label: this.element?.name! },
    ];
  }

  private async updateControl(
    name: string,
    value: any,
    type: TypeEnum
  ): Promise<void> {
    if (value && type === TypeEnum.File) {
      value = await strToFile(value);
    }
    const control = this.propertiesForm.get(name);
    if (!control) {
      this.propertiesForm.addControl(name, new FormControl(value));
      return;
    }
    control.setValue(value);
  }
}
