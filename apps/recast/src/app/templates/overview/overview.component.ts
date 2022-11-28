import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { ElementFacadeService } from 'src/app/services/element-facade.service';
import { StepFacadeService } from 'src/app/services/step-facade.service';
import { ProcessFacadeService } from '../../services/process-facade.service';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss'],
})
export class OverviewComponent {
  public tabs: string[] = ['Prozesse', 'Bauteile'];
  public columns = ['name', 'edit', 'delete'];
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

  public deleteTableRow(id: number): void {
  }

  public editTableRow(id: number): void {
    //TODO
  }
}
