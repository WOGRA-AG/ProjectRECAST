import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Process, Step } from 'build/openapi/recast';
import { Observable } from 'rxjs';
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
  public processId: any = '';
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
    public route: ActivatedRoute,
  ) {
    this.tableData$ = elementService.elements$;
    route.paramMap.subscribe(param => {
      const processId = +param.get('id')!;
      this.processService.processes$.subscribe(processes => {
        this.title =  processes.find(p => p.id === processId)?.name!;
        this.breadcrumbs = [{ label: 'Übersicht', link: '/overview' }, { label: this.title }];
      });
    });
  }

  public deleteTableRow(element: Process | Element | Step): void {
    //TODO
  }

  public editTableRow(element: Process | Element | Step): void {
    //TODO
  }
}
