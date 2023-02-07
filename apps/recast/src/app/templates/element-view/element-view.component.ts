import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  Observable,
  Subject,
  takeUntil,
  tap,
} from 'rxjs';
import { Element } from '../../../../build/openapi/recast';
import { ElementFacadeService } from '../../services/element-facade.service';
import { ProcessFacadeService } from '../../services/process-facade.service';
import { Breadcrumb } from '../../design/components/molecules/breadcrumb/breadcrumb.component';
import { elementComparator } from '../../shared/util/common-utils';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { StepPropertyService } from '../../services/step-property.service';

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
  constructor(
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly elementService: ElementFacadeService,
    private readonly processService: ProcessFacadeService,
    private readonly stepPropertyService: StepPropertyService,
    private readonly formBuilder: FormBuilder
  ) {
    this.processId$
      .pipe(
        mergeMap(id => processService.processById$(id)),
        distinctUntilChanged(elementComparator),
        takeUntil(this._destroy$)
      )
      .subscribe(process => {
        this.breadcrumbs = [
          { label: $localize`:@@header.overview:Overview`, link: '/overview' },
          { label: process.name!, link: '/overview/process/' + process.id },
          { label: $localize`:@@header.view_element:View Element` },
        ];
      });
    this.processId$
      .pipe(
        mergeMap(() => this.elementId$),
        mergeMap(id => elementService.elementById$(id)),
        distinctUntilChanged(elementComparator),
        tap(element => this.initFormGroup(element)),
        takeUntil(this._destroy$)
      )
      .subscribe(element => {
        this.element = element;
      });
  }

  get processId$(): Observable<number> {
    return this.activatedRoute.paramMap.pipe(
      filter(param => !!param.get('processId')),
      map(param => +param.get('processId')!),
      tap(id => (this.processId = id)),
      distinctUntilChanged()
    );
  }

  get elementId$(): Observable<number> {
    return this.activatedRoute.paramMap.pipe(
      filter(param => !!param.get('elementId')),
      map(param => +param.get('elementId')!),
      distinctUntilChanged()
    );
  }

  public ngOnDestroy() {
    this._destroy$.next();
    this._destroy$.complete();
  }

  public propertyName(id: number): Observable<string> {
    return this.stepPropertyService.stepPropertyById$(id).pipe(
      filter(property => !!property),
      map(property => property.name || ''),
      distinctUntilChanged()
    );
  }

  private initFormGroup(element: Element) {
    this.propertiesForm = this.formBuilder.group({});
    this.propertiesForm.addControl(
      'name',
      new FormControl({ value: element.name, disabled: true })
    );
    for (const prop of element.elementProperties!) {
      this.propertiesForm.addControl(
        `${prop.id}`,
        new FormControl({ value: prop.value, disabled: true })
      );
    }
  }
}
