import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  filter,
  from,
  map,
  mergeMap,
  Observable,
  Subject,
  take,
  takeUntil,
} from 'rxjs';
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
import { ViewStateService } from '../../services/view-state.service';
import { ApplicationStateService } from '../../services/application-state.service';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss'],
})
export class OverviewComponent implements OnDestroy, OnInit {
  public tabs: string[] = [
    $localize`:@@label.processes:Prozesse`,
    $localize`:@@label.elements:Bauteile`,
  ];
  public selectedRows: any[] = [];
  public dataColumns: TableColumn[] = [
    {
      key: 'id',
      label: $localize`:@@label.id:ID`,
      type: 'text',
      required: true,
      editable: false,
    },
    {
      key: 'name',
      label: $localize`:@@label.title:Title`,
      type: 'text',
      required: true,
      editable: true,
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
    private readonly stateService: ViewStateService,
    private readonly elementViewModelService: ElementViewModelFacadeService,
    private readonly applicationStateService: ApplicationStateService
  ) {
    this.tableData$ = processService.processes$;
    this.applicationStateService.updateApplicationState();
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  public ngOnInit(): void {
    this.stateService
      .state$()
      .pipe(
        take(1),
        filter(state => !!state)
      )
      .subscribe(state => {
        this.changeContent(state.overview.index);
      });
  }

  public changeContent(index: number): void {
    this.selectedRows = [];
    this.currentIndex = index;
    if (index === 0) {
      this.tableData$ = this.processService.processes$;
    }
    if (index === 1) {
      this.tableData$ = this.elementService.elements$;
    }
    this.stateService.updateOverviewIndex(index);
  }

  public deleteTableRow(element: Process | Element | Step): void {
    const title =
      this.currentIndex === 0
        ? $localize`:@@dialog.delete_process:Delete Process?`
        : $localize`:@@dialog.delete_element:Delete Element?`;
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title,
        },
        autoFocus: false,
      })
      .afterClosed()
      .pipe(
        filter(confirmed => !!confirmed),
        map(() => this.deleteRow(element)),
        take(1)
      )
      .subscribe();
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

  public deleteSelectedRows(): void {
    if (!this.selectedRows.length) {
      return;
    }
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: $localize`:@@dialog.delete_selected_rows:Delete Selected Rows?`,
        },
        autoFocus: false,
      })
      .afterClosed()
      .pipe(
        filter(confirmed => !!confirmed),
        mergeMap(() => from(this.selectedRows)),
        map((element: Process | Element | Step) => {
          this.deleteRow(element);
        }),
        take(this.selectedRows.length)
      )
      .subscribe(() => (this.selectedRows = []));
  }

  public navigateTo(rowItem: Process | Element | Step): void {
    if (!rowItem) {
      return;
    }
    switch (this.currentIndex) {
      case 0: {
        this.router.navigateByUrl('overview/process/' + rowItem.id);
        break;
      }
      case 1: {
        const elem: Element = rowItem as Element;
        const route = `overview/process/${elem.processId}/element/${elem.id}`;
        this.router.navigateByUrl(route);
        break;
      }
      default: {
        break;
      }
    }
  }

  private deleteRow(element: Process | Element | Step): void {
    if (!element.id) {
      return;
    }
    switch (this.currentIndex) {
      case 0:
        this.elementViewModelService
          .deleteProcess$(element as Process)
          .pipe(take(1))
          .subscribe();
        break;
      case 1:
        this.elementViewModelService
          .deleteElement$(element as Element)
          .pipe(take(1))
          .subscribe();
        break;
      default:
        break;
    }
  }
}
