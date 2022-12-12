import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Process, Step } from 'build/openapi/recast';
import { concatMap, filter, map, Observable } from 'rxjs';
import { Breadcrumb } from 'src/app/design/components/molecules/breadcrumb/breadcrumb.component';
import { TableColumn } from 'src/app/design/components/organisms/table/table.component';
import { ElementFacadeService } from 'src/app/services/element-facade.service';
import { ProcessFacadeService } from 'src/app/services/process-facade.service';

@Component({
  selector: 'app-process-overview',
  templateUrl: './process-overview.component.html',
  styleUrls: ['./process-overview.component.scss'],
})
export class ProcessOverviewComponent {
  public title = '';
  public processId: number | undefined;
  public stepId: number = 1; // TODO
  public breadcrumbs: Breadcrumb[] = [];
  public dataColumns: TableColumn[] = [
    { key: 'name', label: 'Title', type: 'text', required: true },
    { key: 'isEdit', label: '', type: 'isEdit' },
    { key: 'isDelete', label: '', type: 'isDelete' },
  ];
  public tableData$: Observable<any> = new Observable<any>();

  constructor(
    public readonly processService: ProcessFacadeService,
    public readonly elementService: ElementFacadeService,
    public route: ActivatedRoute
  ) {
    this.tableData$ = elementService.elements$;
    route.paramMap
      .pipe(
        filter(param => !!param.get('id')),
        map((param, index) => +param.get('id')!),
        concatMap(id => this.processService.processById$(id))
      )
      .subscribe(process => {
        this.processId = process.id;
        this.title = process.name!;
        this.breadcrumbs = [
          { label: $localize`:@@header.overview:Overview`, link: '/overview' },
          { label: this.title },
        ];
      });
  }

  public deleteTableRow(element: Process | Element | Step): void {
    //TODO
  }

  public editTableRow(element: Process | Element | Step): void {
    //TODO
  }
}
