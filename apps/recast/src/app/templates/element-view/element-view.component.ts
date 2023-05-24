import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  catchError,
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
  Process,
  StepProperty,
  Element,
} from '../../../../build/openapi/recast';
import { ElementFacadeService } from '../../services/element-facade.service';
import { ProcessFacadeService } from '../../services/process-facade.service';
import { Breadcrumb } from '../../design/components/molecules/breadcrumb/breadcrumb.component';
import { isReference } from '../../shared/util/common-utils';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { StepPropertyService } from '../../services/step-property.service';
import { StorageService } from '../../storage/services/storage.service';
import TypeEnum = StepProperty.TypeEnum;
import { ElementViewModel } from '../../model/element-view-model';
import { ElementViewModelFacadeService } from '../../services';

@Component({
  selector: 'app-element-view',
  templateUrl: './element-view.component.html',
  styleUrls: ['./element-view.component.scss'],
})
export class ElementViewComponent implements OnDestroy {
  public elementViewModel: ElementViewModel | undefined = undefined;
  public breadcrumbs: Breadcrumb[] = [];
  public processId: number | undefined;
  public propertiesForm: FormGroup = this.formBuilder.group({});
  protected readonly TypeEnum = TypeEnum;
  private readonly _destroy$: Subject<void> = new Subject<void>();
  private _elementId$: Observable<number> = this.elementId$();
  private _elementViewModel$: Observable<ElementViewModel> =
    this.elementViewModel$();

  constructor(
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly elementService: ElementFacadeService,
    private readonly processService: ProcessFacadeService,
    private readonly stepPropertyService: StepPropertyService,
    private readonly viewModelService: ElementViewModelFacadeService,
    private readonly storageService: StorageService,
    private readonly formBuilder: FormBuilder
  ) {
    this._elementViewModel$
      .pipe(
        takeUntil(this._destroy$),
        tap(elementViewModel => {
          this.elementViewModel = elementViewModel;
          this.updateBreadcrumbs(elementViewModel.process);
        }),
        switchMap(elementViewModel => this.initFormGroup$(elementViewModel))
      )
      .subscribe();
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  private elementId$(): Observable<number> {
    return this.activatedRoute.paramMap.pipe(
      filter(param => !!param.get('elementId')),
      map(param => +param.get('elementId')!),
      distinctUntilChanged()
    );
  }

  private elementViewModel$(): Observable<ElementViewModel> {
    return this._elementId$.pipe(
      switchMap(elementId =>
        this.viewModelService.elementViewModelByElementId$(elementId)
      ),
      filter(Boolean),
      switchMap(model => this.storageService.loadValues$(model)),
      catchError(() => {
        alert('View Model not found');
        return of(undefined);
      }),
      filter(Boolean)
    );
  }

  private initFormGroup$(elementViewModel: ElementViewModel): Observable<void> {
    this.updateControl('name', elementViewModel.element.name);
    for (const prop of elementViewModel.properties ?? []) {
      let val = prop.value ?? prop.defaultValue;
      if (isReference(prop.type) && val.hasOwnProperty('name')) {
        val = val as Element;
        val = val.name!;
      }
      this.updateControl(`${prop.stepPropId}`, val);
    }
    return of(undefined);
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
    return;
  }

  private updateBreadcrumbs(process: Process): void {
    this.breadcrumbs = [
      { label: $localize`:@@header.overview:Overview`, link: '/overview' },
      { label: process?.name!, link: '/overview/process/' + process?.id },
      { label: $localize`:@@header.view_element:View Element` },
    ];
  }
}
