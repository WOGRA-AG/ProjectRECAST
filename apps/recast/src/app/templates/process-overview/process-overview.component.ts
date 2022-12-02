import { Component } from '@angular/core';
import { Process, Step } from 'build/openapi/recast';
import { Observable } from 'rxjs';
import { TableColumn } from 'src/app/design/components/organisms/table/table.component';
import { ElementFacadeService } from 'src/app/services/element-facade.service';

@Component({
  selector: 'app-process-overview',
  templateUrl: './process-overview.component.html',
  styleUrls: ['./process-overview.component.scss'],
})
export class ProcessOverviewComponent {
  public dataColumns: TableColumn[] = [
    {key: 'name', label: 'Title', type: 'text', required: true},
    {key: 'isEdit', label: '', type: 'isEdit'},
    {key: 'isDelete', label: '', type: 'isDelete'},
  ];
  public tableData$: Observable<any> = new Observable<any>();

  constructor(
    public readonly elementService: ElementFacadeService,
  ) {
    this.tableData$ = elementService.elements$;
  }

  public deleteTableRow(element: Process | Element | Step): void {
    //TODO
  }

  public editTableRow(element: Process | Element | Step): void {
    //TODO
  }
}
