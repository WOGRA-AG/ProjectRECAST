import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { StepProperty } from 'build/openapi/recast';
import { concatMap, filter, map } from 'rxjs';
import { Breadcrumb } from 'src/app/design/components/molecules/breadcrumb/breadcrumb.component';
import { ProcessFacadeService } from 'src/app/services/process-facade.service';
import { StepPropertyService } from 'src/app/services/step-property.service';

@Component({
  selector: 'app-create-element',
  templateUrl: './create-element.component.html',
  styleUrls: ['./create-element.component.scss'],
})
export class CreateElementComponent {
  public processId: number | undefined;
  public breadcrumbs: Breadcrumb[] = [];
  public properties: StepProperty[] = [];

  propertiesForm = this.formBuilder.group({
  });

  constructor(
    private route: ActivatedRoute,
    private processService: ProcessFacadeService,
    private stepPropertyService: StepPropertyService,
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
        concatMap(id => this.stepPropertyService.stepPropertiesByStepId$(id))
      )
      .subscribe(stepProperties => {
        this.properties = stepProperties;
        this.properties.forEach(p => {
          this.propertiesForm.addControl('' + p.id!, new FormControl());
        });
      });
  }
}
