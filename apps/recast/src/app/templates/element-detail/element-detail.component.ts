import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Element, Step, StepProperty, Process } from 'build/openapi/recast';
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  of,
  Subject,
  takeUntil,
  tap,
  combineLatestWith,
} from 'rxjs';
import { Breadcrumb } from 'src/app/design/components/molecules/breadcrumb/breadcrumb.component';
import { ElementFacadeService } from 'src/app/services/element-facade.service';
import { ElementPropertyService } from 'src/app/services/element-property.service';
import { ProcessFacadeService } from 'src/app/services/process-facade.service';
import { StepFacadeService } from 'src/app/services/step-facade.service';
import { StepPropertyService } from 'src/app/services/step-property.service';
import { elementComparator } from '../../shared/util/common-utils';

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

  constructor(
    private route: ActivatedRoute,
    private processService: ProcessFacadeService,
    private stepService: StepFacadeService,
    private stepPropertyService: StepPropertyService,
    private elementService: ElementFacadeService,
    private elementPropertyService: ElementPropertyService,
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    const steps$ = route.paramMap.pipe(
      filter(param => !!param.get('processId')),
      map(param => +param.get('processId')!),
      mergeMap(id => this.stepService.stepsByProcessId$(id)),
      distinctUntilChanged(elementComparator)
    );

    const process$ = route.paramMap.pipe(
      filter(param => !!param.get('processId')),
      map(param => +param.get('processId')!),
      mergeMap(id => this.processService.processById$(id)),
      distinctUntilChanged(elementComparator)
    );

    const element$ = route.paramMap.pipe(
      filter(param => !!param.get('elementId')),
      map(param => +param.get('elementId')!),
      mergeMap(id => this.elementService.elementById$(id)),
      distinctUntilChanged(elementComparator)
    );

    const step$ = route.paramMap.pipe(
      filter(param => !!param.get('stepId')),
      map(param => +param.get('stepId')!),
      mergeMap(id => this.stepService.stepById$(id)),
      distinctUntilChanged(elementComparator)
    );

    process$
      .pipe(
        combineLatestWith(element$, step$, steps$),
        tap(([_, element, step, steps]) => {
          this._steps = steps;
          this.stepTitles = steps.map(s => s.name!);
          this.element = element;
          this._currentStep = step;
          this.currentIndex = this._steps.indexOf(step);
          this.isLastStep = this._steps.length - 1 === this.currentIndex;
        }),
        takeUntil(this._destroy$)
      )
      .subscribe(([process, element, step, _]) => {
        this.initBreadcrumbs(process);
        this.stepProperties = step.stepProperties!;
        this.stepProperties.forEach(p => {
          const elemProp = element.elementProperties?.find(
            e => e.stepPropertyId === p.id
          );
          this.propertiesForm.addControl(
            '' + p.id,
            new FormControl(!!elemProp ? elemProp.value : p.defaultValue)
          );
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

  public onSubmitClicked(): void {
    for (const prop of this.stepProperties) {
      const value = this.propertiesForm.get('' + prop.id)?.value!;
      this.updateElementProperty(prop, value);
      if (!this.isLastStep) {
        const nextStep = this._steps[this.currentIndex + 1];
        this.updateElement(this.element?.id!, nextStep.id!);
        this.navigateStep(nextStep);
        return;
      }
      this.updateElement(this.element?.id!, null);
      this.navigateBack();
    }
  }

  public stepChanged(event: number): void {
    if (event >= this._steps.indexOf(this._currentStep!)) {
      return;
    }
    this.navigateStep(this._steps[event]);
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

  private updateElement(id: number, stepId: number | null): void {
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
}
