import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Process, Step, Element } from 'build/openapi/recast';
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
  public currentStepId: number | undefined;
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
    public activatedRoute: ActivatedRoute,
    private router: Router,
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
          this.currentStepId = steps[0].id!;
          this.tableData$ = this.elementService.elementsByProcessIdAndStepId$(steps[0].processId!, this.currentStepId);
        }
    });

  }

  private get processId$(): Observable<number> {
    return this.activatedRoute.paramMap.pipe(
      filter(param => !!param.get('id')),
      map((param, index) => +param.get('id')!),
    );
  }


  public changeContent(index: number): void {
    this.currentStepId = this.steps[index]?.id!;
    this.processId$.pipe(
      concatMap(id => this.tableData$ = this.elementService.elementsByProcessIdAndStepId$(id, this.currentStepId!))
    ).subscribe();
  }

  public navigateToCreateElement(): void {
    this.router.navigate(['./step/' + this.currentStepId + '/element'], {relativeTo: this.activatedRoute});
  }

  public navigateTo(element: Element): void {
    this.router.navigate(
      ['./step/' + this.currentStepId + '/element/' + element.id],
      {relativeTo: this.activatedRoute}
    );
  }

  public deleteTableRow(element: Process | Element | Step): void {
    if (!element.id) {
      return;
    }
    if (confirm('Delete Element and all corresponding data?')) {
      this.elementService.deleteElement$(element.id).subscribe();
    }
  }

  public editTableRow(element: Process | Element | Step): void {
    if (!element) {
      return;
    }
    this.elementService.saveElement$(element as Element).subscribe();
  }
}
