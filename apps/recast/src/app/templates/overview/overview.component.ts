import { Component, OnDestroy } from '@angular/core';
import { concatMap, filter, Observable, Subject, takeUntil } from 'rxjs';
import { ElementFacadeService } from 'src/app/services/element-facade.service';
import { ProcessFacadeService } from '../../services/process-facade.service';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TableColumn } from '../../design/components/organisms/table/table.component';
import { Process, Step, Element } from '../../../../build/openapi/recast';
import { ConfirmDialogComponent } from 'src/app/design/components/organisms/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss'],
})
export class OverviewComponent implements OnDestroy {
  public tabs: string[] = [
    $localize`:@@label.processes:Prozesse`,
    $localize`:@@label.elements:Bauteile`,
  ];
  public dataColumns: TableColumn[] = [
    {
      key: 'name',
      label: $localize`:@@label.title:Title`,
      type: 'text',
      required: true,
    },
    { key: 'isEdit', label: '', type: 'isEdit' },
    { key: 'isDelete', label: '', type: 'isDelete' },
  ];
  public tableData$: Observable<any> = new Observable<any>();
  public currentIndex = 0;
  private readonly _destroy$: Subject<void> = new Subject<void>();

  constructor(
    public readonly processService: ProcessFacadeService,
    public readonly elementService: ElementFacadeService,
    public dialog: MatDialog,
    public router: Router
  ) {
    this.tableData$ = processService.processes$;
  }

  public ngOnDestroy() {
    this._destroy$.next();
    this._destroy$.complete();
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
    if (!element.id) {
      return;
    }
    switch (this.currentIndex) {
      case 0:
        this.dialog
          .open(ConfirmDialogComponent, {
            data: {
              title: $localize`:@@dialog.delete_process:Delete Process?`,
            },
          })
          .afterClosed()
          .pipe(
            filter(confirmed => !!confirmed),
            concatMap(() => this.processService.deleteProcess$(element.id!)),
            takeUntil(this._destroy$)
          )
          .subscribe();
        break;
      case 1:
        this.dialog
          .open(ConfirmDialogComponent, {
            data: {
              title: $localize`:@@dialog.delete_element:Delete Element?`,
            },
          })
          .afterClosed()
          .pipe(
            filter(confirmed => !!confirmed),
            concatMap(() => this.elementService.deleteElement$(element.id!)),
            takeUntil(this._destroy$)
          )
          .subscribe();
        break;
      default:
        break;
    }
  }

  public editTableRow(element: Process | Element | Step): void {
    if (!element) {
      return;
    }
    switch (this.currentIndex) {
      case 0:
        this.processService
          .saveProcess$(element as Process)
          .pipe(takeUntil(this._destroy$))
          .subscribe();
        break;
      case 1:
        this.elementService
          .saveElement$(element as Element)
          .pipe(takeUntil(this._destroy$))
          .subscribe();
        break;
      default:
        break;
    }
  }

  public navigateTo(element: Process | Element | Step): void {
    if (!element) {
      return;
    }
    switch (this.currentIndex) {
      case 0:
        this.router.navigateByUrl('overview/process/' + element.id);
        break;
      case 1:
        const elem: Element = element as Element;
        const route = elem.currentStepId
          ? `overview/process/${elem.processId}/step/${elem.currentStepId}/element/${elem.id}`
          : `overview/process/${elem.processId}/element/${elem.id}`;
        this.router.navigateByUrl(route);
        break;
      default:
        break;
    }
  }
}
