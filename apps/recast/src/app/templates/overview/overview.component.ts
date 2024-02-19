import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { filter, from, mergeMap, Observable, of, Subject, take } from 'rxjs';
import {
  BundleService,
  ElementFacadeService,
  ElementViewModelFacadeService,
  ProcessFacadeService,
} from 'src/app/services';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TableColumn, ConfirmDialogComponent } from '@wogra/wogra-ui-kit';
import { Bundle, Element, Process } from '../../../../build/openapi/recast';
import {
  ApplicationStateService,
  AlertService,
  ViewStateService,
} from '../../services';
import {
  BundleColumnDef,
  ElementColumnDef,
  ProcessColumnDef,
} from '../../model/table-column-def';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class OverviewComponent implements OnDestroy, OnInit {
  public tabs: string[] = [
    $localize`:@@label.bundles:Bundles`,
    $localize`:@@label.processes:Prozesse`,
    $localize`:@@label.elements:Bauteile`,
  ];
  public dataColumns: TableColumn[] = [];
  public selectedRows: TableRow[] = [];
  public tableData$: Observable<any> = new Observable<any>();
  public currentIndex = OverviewIndex.Bundles;
  protected readonly OverviewIndex = OverviewIndex;
  private readonly _bundleColumnDef = new BundleColumnDef();
  private readonly _processColumnDef = new ProcessColumnDef(this.bundleService);
  private readonly _elementColumnDef = new ElementColumnDef(
    this.processService
  );
  private readonly _destroy$: Subject<void> = new Subject<void>();

  constructor(
    public readonly processService: ProcessFacadeService,
    public readonly elementService: ElementFacadeService,
    private readonly bundleService: BundleService,
    private readonly stateService: ViewStateService,
    private readonly elementViewModelService: ElementViewModelFacadeService,
    private readonly applicationStateService: ApplicationStateService,
    private readonly alertService: AlertService,
    public dialog: MatDialog,
    public router: Router
  ) {
    this.dataColumns = this._processColumnDef.getColumns();
    this.tableData$ = processService.processes$;
    this.applicationStateService
      .updateApplicationState$()
      .pipe(take(1))
      .subscribe();
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  public ngOnInit(): void {
    this.stateService
      .state$()
      .pipe(take(1), filter(Boolean))
      .subscribe(state => {
        this.changeContent(state.overview.index);
      });
  }

  public changeContent(index: number): void {
    this.selectedRows = [];
    this.currentIndex = index;
    if (index === OverviewIndex.Processes) {
      this.dataColumns = this._processColumnDef.getColumns();
      this.tableData$ = this.processService.processes$;
    }
    if (index === OverviewIndex.Elements) {
      this.dataColumns = this._elementColumnDef.getColumns();
      this.tableData$ = this.elementService.elements$;
    }
    if (index === OverviewIndex.Bundles) {
      this.dataColumns = this._bundleColumnDef.getColumns();
      this.tableData$ = this.bundleService.bundles$;
    }
    this.stateService.updateOverviewIndex(index);
  }

  public deleteTableRow(element: TableRow): void {
    const title =
      this.currentIndex === OverviewIndex.Processes
        ? $localize`:@@dialog.delete_process:Delete Process?`
        : this.currentIndex === OverviewIndex.Elements
        ? $localize`:@@dialog.delete_element:Delete Element?`
        : $localize`:@@dialog.delete_bundle:Delete Bundle?`;
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title,
          confirm: $localize`:@@action.confirm:Confirm`,
          cancel: $localize`:@@action.cancel:Cancel`,
        },
        autoFocus: false,
      })
      .afterClosed()
      .pipe(
        filter(confirmed => !!confirmed),
        mergeMap(() => this.deleteRow$(element)),
        take(1)
      )
      .subscribe();
  }

  public editTableRow(element: TableRow): void {
    if (!element) {
      return;
    }
    switch (this.currentIndex) {
      case OverviewIndex.Processes:
        this.processService
          .saveProcess$(element as Process)
          .pipe(take(1))
          .subscribe();
        break;
      case OverviewIndex.Elements:
        this.elementService
          .saveElement$(element as Element)
          .pipe(take(1))
          .subscribe();
        break;
      case OverviewIndex.Bundles:
        this.bundleService
          .upsertBundle(element as Bundle)
          .pipe(take(1))
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
          confirm: $localize`:@@action.confirm:Confirm`,
          cancel: $localize`:@@action.cancel:Cancel`,
        },
        autoFocus: false,
      })
      .afterClosed()
      .pipe(
        filter(confirmed => !!confirmed),
        mergeMap(() => from(this.selectedRows)),
        mergeMap(element => this.deleteRow$(element)),
        take(this.selectedRows.length)
      )
      .subscribe(() => {
        this.selectedRows = [];
      });
  }

  public navigateTo(rowItem: TableRow): void {
    if (!rowItem) {
      return;
    }
    switch (this.currentIndex) {
      case OverviewIndex.Processes: {
        this.router.navigateByUrl('overview/process/' + rowItem.id);
        break;
      }
      case OverviewIndex.Elements: {
        const elem: Element = <Element>rowItem;
        const route = `overview/process/${elem.processId}/element/${elem.id}`;
        this.router.navigateByUrl(route);
        break;
      }
      case OverviewIndex.Bundles: {
        const bundle: Bundle = <Bundle>rowItem;
        const route = `overview/bundle/${bundle.id}`;
        this.router.navigateByUrl(route);
        break;
      }
      default: {
        break;
      }
    }
  }

  protected comparator<T extends TableRow>(o1: T, o2: T): boolean {
    return o1.id === o2.id;
  }

  protected navigateByElementId(elementId: string): void {
    const element = this.elementService.elementById(+elementId);
    if (!element) {
      this.alertService.reportError('Element not found');
      return;
    }
    this.router.navigateByUrl(
      `overview/process/${element.processId}/element/${elementId}`
    );
  }

  private deleteRow$(rowElement: TableRow): Observable<void> {
    if (!rowElement) {
      return of(undefined);
    }

    switch (this.currentIndex) {
      case OverviewIndex.Processes: {
        return this.elementViewModelService.deleteProcess$(<Process>rowElement);
      }
      case OverviewIndex.Elements: {
        return this.elementViewModelService.deleteElement$(<Element>rowElement);
      }
      case OverviewIndex.Bundles: {
        return this.bundleService.deleteBundle$(<Bundle>rowElement);
      }
      default: {
        return of(undefined);
      }
    }
  }
}

type TableRow = Process | Element | Bundle;
enum OverviewIndex {
  Bundles = 0,
  Processes = 1,
  Elements = 2,
}
