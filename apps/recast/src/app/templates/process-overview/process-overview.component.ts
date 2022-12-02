import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { ElementFacadeService } from 'src/app/services/element-facade.service';

@Component({
  selector: 'app-process-overview',
  templateUrl: './process-overview.component.html',
  styleUrls: ['./process-overview.component.scss'],
})
export class ProcessOverviewComponent {
  public iconColumns = ['edit', 'delete'];
  public dataColumns = [{key: 'name', title: 'Title'}];
  public tableData$: Observable<any> = new Observable<any>();

  constructor(
    public readonly elementService: ElementFacadeService,
  ) {
    this.tableData$ = elementService.elements$;
  }

  public deleteTableRow(id: number): void {
    //TODO
  }

  public editTableRow(id: number): void {
    //TODO
  }
}
