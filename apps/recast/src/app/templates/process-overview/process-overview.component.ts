import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Process, Step } from 'build/openapi/recast';
import { concatMap, filter, map, Observable } from 'rxjs';
import { Breadcrumb } from 'src/app/design/components/molecules/breadcrumb/breadcrumb.component';
import { TableColumn } from 'src/app/design/components/organisms/table/table.component';
import { ElementFacadeService } from 'src/app/services/element-facade.service';
import { ProcessFacadeService } from 'src/app/services/process-facade.service';
import { StepFacadeService } from 'src/app/services/step-facade.service';

@Component({
  selector: 'app-process-overview',
  templateUrl: './process-overview.component.html',
  styleUrls: ['./process-overview.component.scss'],
})
export class ProcessOverviewComponent {
  public title = '';
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
    this.processId$.pipe(
      concatMap(id => this.processService.processById$(id))
    ).subscribe(process => {
        this.title = process.name!;
        this.breadcrumbs = [
          { label: $localize`:@@header.overview:Overview`, link: '/overview' },
          { label: this.title },
        ];
    });

    this.processId$.pipe(
      concatMap(id => this.stepService.stepsByProcessId$(id))
    ).subscribe(steps => {
        this.steps = steps;
        this.stepTitles = steps.map(step => step.name!);
        if (steps[0]) {
          this.tableData$ = this.elementService.elementsByProcessIdAndStepId$(steps[0].processId!, steps[0].id!);
        }
    });
  }

  private get processId$(): Observable<number> {
    return this.route.paramMap.pipe(
      filter(param => !!param.get('id')),
      map((param, index) => +param.get('id')!),
    );
  }

  public changeContent(index: number) {
    this.processId$.pipe(
      concatMap(id => this.tableData$ = this.elementService.elementsByProcessIdAndStepId$(id, this.steps[index]?.id!))
    ).subscribe();
  }

  public deleteTableRow(element: Process | Element | Step): void {
    //TODO
  }

  public editTableRow(element: Process | Element | Step): void {
    //TODO
  }
}
