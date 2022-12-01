import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { ElementFacadeService } from 'src/app/services/element-facade.service';
import { StepFacadeService } from 'src/app/services/step-facade.service';
import { ProcessFacadeService } from '../../services/process-facade.service';
import { MatDialog } from '@angular/material/dialog';
import {TableColumn} from '../../design/components/organisms/table/table.component';
import {Process, Step, Element} from '../../../../build/openapi/recast';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss'],
})
export class OverviewComponent {
  public tabs: string[] = ['Prozesse', 'Bauteile'];
  public dataColumns: TableColumn[] = [
    {key: 'name', label: 'Title', type: 'text', required: true},
    {key: 'isEdit', label: '', type: 'isEdit'},
    {key: 'isDelete', label: '', type: 'isDelete'},
  ];
  public tableData$: Observable<any> = new Observable<any>();
  public currentIndex = 0;

  constructor(
    public readonly processService: ProcessFacadeService,
    public readonly elementService: ElementFacadeService,
    public readonly stepService: StepFacadeService,
    public dialog: MatDialog,
  ) {
    this.tableData$ = processService.processes$;
  }

  public changeContent(index: number): void {
    this.currentIndex = index;
    if (index === 0) {
      this.tableData$ = this.processService.processes$;
    }
    if (index === 1) {
      this.tableData$ = this.elementService.elements$;
    }
  }

  public deleteTableRow(element: Process | Element | Step): void {
    if (!element.id) {return;}
    switch (this.currentIndex) {
    case 0:
      if (confirm('Delete Process and all corresponding data?')) {
        this.processService.deleteProcess$(element.id).subscribe();
      }
      break;
    case 1:
      if (confirm('Delete Element and all corresponding data?')) {
        this.elementService.deleteElement$(element.id).subscribe();
      }
      break;
    default:
      break;
    }
  }

  public editTableRow(element: Process | Element | Step): void {
    if (!element) {return;}
    switch (this.currentIndex) {
    case 0:
      this.processService.saveProcess$(element as Process).subscribe();
      break;
    case 1:
      this.elementService.saveElement$(element as Element).subscribe();
      break;
    default:
      break;
    }
  }
}
