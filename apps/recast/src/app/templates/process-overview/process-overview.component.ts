import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Process, Step } from 'build/openapi/recast';
import { concatMap, filter, map, Observable } from 'rxjs';
import { Breadcrumb } from 'src/app/design/components/molecules/breadcrumb/breadcrumb.component';
import { TableColumn } from 'src/app/design/components/organisms/table/table.component';
import { ElementFacadeService } from 'src/app/services/element-facade.service';
import { ProcessFacadeService } from 'src/app/services/process-facade.service';
import { MatStepper } from '@angular/material/stepper';
import { StepFacadeService } from 'src/app/services/step-facade.service';

@Component({
  selector: 'app-process-overview',
  templateUrl: './process-overview.component.html',
  styleUrls: ['./process-overview.component.scss'],
})
export class ProcessOverviewComponent {
  @ViewChild(MatStepper) stepper: MatStepper | undefined;

  public title = '';
  public processId: any = '';
  public breadcrumbs: Breadcrumb[] = [];
  public steps: Step[] = [];
  public stepTitles: string[] = [];
  public dataColumns: TableColumn[] = [
    { key: 'name', label: 'Title', type: 'text', required: true },
    { key: 'isEdit', label: '', type: 'isEdit' },
    { key: 'isDelete', label: '', type: 'isDelete' },
  ];
  public tableData$: Observable<any> = new Observable<any>();

  constructor(
    public readonly processService: ProcessFacadeService,
    public readonly elementService: ElementFacadeService,
    public readonly stepService: StepFacadeService,
    public route: ActivatedRoute
  ) {
    this.tableData$ = elementService.elements$;
    const processId$ = route.paramMap.pipe(
      filter(param => !!param.get('id')),
      map((param, index) => +param.get('id')!),
    );

    processId$.pipe(concatMap(id => this.processService.processById$(id)))
      .subscribe(process => {
        this.title = process.name!;
        this.breadcrumbs = [
          { label: $localize`:@@header.overview:Overview`, link: '/overview' },
          { label: this.title },
        ];
    });

    processId$.pipe(concatMap(id => this.stepService.stepsByProcessId$(id)))
      .subscribe(steps => {
        this.steps = steps;
        this.stepTitles = steps.map(step => step.name!);
    });
  }

  public changeContent(id: number) {
    //TODO
  }

  public deleteTableRow(element: Process | Element | Step): void {
    //TODO
  }

  public editTableRow(element: Process | Element | Step): void {
    //TODO
  }
}
