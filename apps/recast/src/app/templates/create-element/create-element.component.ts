import { Component } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { StepProperty, ElementProperty } from 'build/openapi/recast';
import { catchError, concatMap, filter, map, of, tap } from 'rxjs';
import { Breadcrumb } from 'src/app/design/components/molecules/breadcrumb/breadcrumb.component';
import { ElementFacadeService } from 'src/app/services/element-facade.service';
import { ElementPropertyService } from 'src/app/services/element-property.service';
import { ProcessFacadeService } from 'src/app/services/process-facade.service';
import { StepPropertyService } from 'src/app/services/step-property.service';

@Component({
  selector: 'app-create-element',
  templateUrl: './create-element.component.html',
  styleUrls: ['./create-element.component.scss'],
})
export class CreateElementComponent {
  public processId: number | undefined;
  public stepId: number | undefined;
  public breadcrumbs: Breadcrumb[] = [];
  public properties: StepProperty[] = [];

  propertiesForm = this.formBuilder.group({
  });

  constructor(
    private route: ActivatedRoute,
    private processService: ProcessFacadeService,
    private stepPropertyService: StepPropertyService,
    private elementService: ElementFacadeService,
    private elementPropertyService: ElementPropertyService,
    private formBuilder: FormBuilder,
  ) {
    route.paramMap
      .pipe(
        filter(param => !!param.get('id')),
        map((param, index) => +param.get('id')!),
        concatMap(id => this.processService.processById$(id))
      )
      .subscribe(process => {
        this.processId = process.id;
        this.breadcrumbs = [
          { label: $localize`:@@header.overview:Overview`, link: '/overview' },
          { label: process.name!, link: '/overview/process/' + process.id },
          { label: $localize`:@@header.create_element:Create element`},
        ];
      });

    route.paramMap
      .pipe(
        filter(param => !!param.get('stepId')),
        map((param, index) => +param.get('stepId')!),
        tap(id => this.stepId = id),
        concatMap(id => this.stepPropertyService.stepPropertiesByStepId$(id))
      )
      .subscribe(stepProperties => {
        this.properties = stepProperties;
        this.propertiesForm.addControl('name', new FormControl());
        this.properties.forEach(p => {
          this.propertiesForm.addControl('' + p.id, new FormControl());
        });
      });
  }

  public saveElement(): void {
    this.elementService.saveElement$({
      processId: this.processId,
      currentStepId: this.stepId,
      name: this.propertiesForm.get('name')?.value
    }).pipe(
      catchError(err => {
        console.error(err);
        return of(undefined);
    }))
    .subscribe(element => {
      if (element) {
        for (const prop of this.properties) {
          this.saveElementProperty(prop, element.id!);
        }
      }
    });
  }

  private saveElementProperty(property: ElementProperty, elementId: number): void {
    this.elementPropertyService.saveElementProp$({
      elementId,
      stepPropertyId: property.id,
      value: this.propertiesForm.get('' + property.id)?.value
    }, elementId).pipe(
      catchError(err => {
        console.error(err);
        return of(undefined);
    })).subscribe();
  }
}
