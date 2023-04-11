import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  combineLatestWith,
  distinctUntilChanged,
  filter,
  map,
  Observable,
  of,
  Subject,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import {
  Element,
  Process,
  StepProperty,
} from '../../../../build/openapi/recast';
import { ElementFacadeService } from '../../services/element-facade.service';
import { ProcessFacadeService } from '../../services/process-facade.service';
import { Breadcrumb } from '../../design/components/molecules/breadcrumb/breadcrumb.component';
import { isReference, strToFile } from '../../shared/util/common-utils';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { StepPropertyService } from '../../services/step-property.service';
import TypeEnum = StepProperty.TypeEnum;

@Component({
  selector: 'app-element-view',
  templateUrl: './element-view.component.html',
  styleUrls: ['./element-view.component.scss'],
})
export class ElementViewComponent implements OnDestroy {
  public element: Element | undefined = undefined;
  public breadcrumbs: Breadcrumb[] = [];
  public processId: number | undefined;
  public properties: [{ id: string; name: string; value: any }] | undefined;
  public propertiesForm: FormGroup = this.formBuilder.group({});
  private readonly _destroy$: Subject<void> = new Subject<void>();
  private _processId$: Observable<number> = this.processId$();
  private _elementId$: Observable<number> = this.elementId$();

  constructor(
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly elementService: ElementFacadeService,
    private readonly processService: ProcessFacadeService,
    private readonly stepPropertyService: StepPropertyService,
    private readonly formBuilder: FormBuilder
  ) {
    const process$: Observable<Process | undefined> = this._processId$.pipe(
      switchMap(id => processService.processById$(id)),
      filter(process => !!process)
    );

    const element$: Observable<Element> = this._processId$.pipe(
      combineLatestWith(
        this.elementService.elements$,
        this.stepPropertyService.stepProperties$,
        this._elementId$
      ),
      filter(
        ([_, elements, stepProps, _1]) =>
          !!stepProps.length && !!elements.length
      ),
      switchMap(([_, _1, _2, elementId]) =>
        elementService.elementById$(elementId)
      ),
      filter(element => !!element?.elementProperties?.length)
    );

    process$
      .pipe(takeUntil(this._destroy$), combineLatestWith(element$))
      .subscribe(([process, element]) => {
        this.updateBreadcrumbs(process!);
        this.element = element;
        this.initFormGroup();
      });
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  public propertyName$(id: number): Observable<string> {
    return this.stepPropertyById$(id).pipe(
      filter(property => !!property),
      map(property => property.name || ''),
      distinctUntilChanged()
    );
  }

  public stepPropertyById$(id: number | undefined): Observable<StepProperty> {
    if (!id) {
      return of({});
    }
    return this.stepPropertyService.stepPropertyById$(id);
  }

  private processId$(): Observable<number> {
    return this.activatedRoute.paramMap.pipe(
      filter(param => !!param.get('processId')),
      map(param => +param.get('processId')!),
      tap(id => (this.processId = id)),
      distinctUntilChanged()
    );
  }

  private elementId$(): Observable<number> {
    return this.activatedRoute.paramMap.pipe(
      filter(param => !!param.get('elementId')),
      map(param => +param.get('elementId')!),
      distinctUntilChanged()
    );
  }

  private async initFormGroup(): Promise<void> {
    this.updateControl('name', this.element?.name);
    for (const prop of this.element?.elementProperties!) {
      let value: string = prop.value || '';
      const stepProp = this.stepPropertyService.stepPropertyById(
        prop.stepPropertyId || 0
      );
      if (value && stepProp.type === TypeEnum.File) {
        const file = await strToFile(value);
        value = file?.name || '';
      }
      if (isReference(stepProp) && value) {
        value = this.elementService.elementById(+value)?.name || '';
      }
      this.updateControl(`${prop.id}`, value);
    }
  }

  private updateControl(name: string, value: any): void {
    const control = this.propertiesForm.get(name);
    if (!control) {
      this.propertiesForm.addControl(
        name,
        new FormControl({ value, disabled: true })
      );
      return;
    }
    control.setValue(value);
  }

  private updateBreadcrumbs(process: Process): void {
    this.breadcrumbs = [
      { label: $localize`:@@header.overview:Overview`, link: '/overview' },
      { label: process?.name!, link: '/overview/process/' + process?.id },
      { label: $localize`:@@header.view_element:View Element` },
    ];
  }
}
