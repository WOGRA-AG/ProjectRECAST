import { Component } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ElementProperty, Element, Step } from 'build/openapi/recast';
import { catchError, concatMap, filter, map, of } from 'rxjs';
import { Breadcrumb } from 'src/app/design/components/molecules/breadcrumb/breadcrumb.component';
import { ElementFacadeService } from 'src/app/services/element-facade.service';
import { ElementPropertyService } from 'src/app/services/element-property.service';
import { ProcessFacadeService } from 'src/app/services/process-facade.service';
import { StepFacadeService } from 'src/app/services/step-facade.service';
import { StepPropertyService } from 'src/app/services/step-property.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-element-detail',
  templateUrl: './element-detail.component.html',
  styleUrls: ['./element-detail.component.scss'],
})
export class ElementDetailComponent {
  public element: Element | undefined;
  public breadcrumbs: Breadcrumb[] = [];
  public properties: ElementProperty[] = [];
  public steps: Step[] = [];
  public currentStep: Step | undefined;
  public currentIndex = 0;
  public stepTitles: string[] = [];
  public isLastStep = false;

  propertiesForm = this.formBuilder.group({});

  constructor(
    private route: ActivatedRoute,
    private processService: ProcessFacadeService,
    private stepService: StepFacadeService,
    private stepPropertyService: StepPropertyService,
    private elementService: ElementFacadeService,
    private elementPropertyService: ElementPropertyService,
    private formBuilder: FormBuilder,
    private router: Router,
    private location: Location
  ) {
    route.paramMap
      .pipe(
        filter(param => !!param.get('elementId')),
        map((param, index) => +param.get('elementId')!),
        concatMap(id => this.elementService.elementById$(id))
      )
      .subscribe(element => {
        this.element = element;
      });

    route.paramMap
      .pipe(
        filter(param => !!param.get('id')),
        map((param, index) => +param.get('id')!),
        concatMap(id => this.stepService.stepsByProcessId$(id))
      )
      .subscribe(steps => {
        this.steps = steps;
        this.stepTitles = steps.map(step => step.name!);
      });

    route.paramMap
      .pipe(
        filter(param => !!param.get('stepId')),
        map((param, index) => +param.get('stepId')!),
        concatMap(id => this.stepService.stepById$(id))
      )
      .subscribe(step => {
        this.currentStep = step;
        this.currentIndex = this.steps.indexOf(step);
        this.isLastStep = this.steps.length - 1 === this.currentIndex;
      });

    route.paramMap
      .pipe(
        filter(param => !!param.get('id')),
        map((param, index) => +param.get('id')!),
        concatMap(id => this.processService.processById$(id))
      )
      .subscribe(process => {
        this.breadcrumbs = [
          { label: $localize`:@@header.overview:Overview`, link: '/overview' },
          { label: process.name!, link: '/overview/process/' + process.id },
          { label: this.element?.name! },
        ];
      });

    route.paramMap
      .pipe(
        filter(param => !!param.get('elementId')),
        map((param, index) => +param.get('elementId')!),
        concatMap(id =>
          this.elementPropertyService.elementPropertiesByElementId$(id)
        )
      )
      .subscribe(elementProperties => {
        this.properties = elementProperties;
        this.properties.forEach(p => {
          this.propertiesForm.addControl('' + p.id, new FormControl());
        });
      });
  }

  public getStepPropertyName(id: number): string {
    let stepPropName = '';
    this.stepPropertyService
      .stepPropertyById$(id)
      .subscribe(sp => (stepPropName = sp.name!));
    return stepPropName;
  }

  public navigateBack(): void {
    this.location.back();
  }

  public saveElementProperties(): void {
    // TODO
  }

  public goToNextStep(): void {
    // TODO
  }
}
