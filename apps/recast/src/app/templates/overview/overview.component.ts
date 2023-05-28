import { Component, OnDestroy } from '@angular/core';
import { concatMap, filter, Observable, Subject, takeUntil } from 'rxjs';
import {
  ElementFacadeService,
  ElementViewModelFacadeService,
  ProcessFacadeService,
} from 'src/app/services';
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
      key: 'id',
      label: $localize`:@@label.id:ID`,
      type: 'text',
      required: true,
    },
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
    public router: Router,
    private readonly elementViewModelService: ElementViewModelFacadeService
  ) {
    this.tableData$ = processService.processes$;
  }

  public ngOnDestroy(): void {
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
            autoFocus: false,
          })
          .afterClosed()
          .pipe(
            filter(confirmed => !!confirmed),
            concatMap(() =>
              this.elementViewModelService.deleteProcess$(element as Process)
            ),
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
            autoFocus: false,
          })
          .afterClosed()
          .pipe(
            filter(confirmed => !!confirmed),
            concatMap(() =>
              this.elementViewModelService.deleteElement$(element as Element)
            ),
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

  public navigateTo(rowItem: Process | Element | Step): void {
    if (!rowItem) {
      return;
    }
    switch (this.currentIndex) {
      case 0:
        this.router.navigateByUrl('overview/process/' + rowItem.id);
        break;
      case 1:
        const elem: Element = rowItem as Element;
        const route = `overview/process/${elem.processId}/element/${elem.id}`;
        this.router.navigateByUrl(route);
        break;
      default:
        break;
    }
  }
}
