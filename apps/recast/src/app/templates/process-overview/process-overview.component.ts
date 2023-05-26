import { Component, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { Process, Step, Element } from 'build/openapi/recast';
import {
  concatMap,
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  Observable,
  Subject,
  takeUntil,
} from 'rxjs';
import { Breadcrumb } from 'src/app/design/components/molecules/breadcrumb/breadcrumb.component';
import { ConfirmDialogComponent } from 'src/app/design/components/organisms/confirm-dialog/confirm-dialog.component';
import { TableColumn } from 'src/app/design/components/organisms/table/table.component';
import { ElementFacadeService } from 'src/app/services/element-facade.service';
import { ProcessFacadeService } from 'src/app/services/process-facade.service';
import { StepFacadeService } from 'src/app/services/step-facade.service';
import { elementComparator } from '../../shared/util/common-utils';
import { ElementViewModelFacadeService } from '../../services';

@Component({
  selector: 'app-process-overview',
  templateUrl: './process-overview.component.html',
  styleUrls: ['./process-overview.component.scss'],
})
export class ProcessOverviewComponent implements OnDestroy {
  public title = '';
  public currentStepId: number | null | undefined;
  public breadcrumbs: Breadcrumb[] = [];
  public steps: Step[] = [];
  public dataColumns: TableColumn[] = [
    { key: 'id', label: 'ID', type: 'text', required: true },
    { key: 'name', label: 'Title', type: 'text', required: true },
    { key: 'isEdit', label: '', type: 'isEdit' },
    { key: 'isDelete', label: '', type: 'isDelete' },
  ];
  public tableData$: Observable<any> = new Observable<any>();

  public currentIndex = 0;

  private readonly _destroy$: Subject<void> = new Subject<void>();

  constructor(
    private readonly processService: ProcessFacadeService,
    private readonly elementService: ElementFacadeService,
    private readonly stepService: StepFacadeService,
    private readonly elementViewModelService: ElementViewModelFacadeService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog
  ) {
    this.processId$
      .pipe(
        concatMap(id => this.processService.processById$(id)),
        filter(process => !!process),
        takeUntil(this._destroy$)
      )
      .subscribe(process => {
        this.title = process?.name!;
        this.breadcrumbs = [
          { label: $localize`:@@header.overview:Overview`, link: '/overview' },
          { label: this.title },
        ];
      });
  }

  get stepTitles$(): Observable<string[]> {
    return this.processId$.pipe(
      mergeMap(id => this.stepService.stepsByProcessId$(id)),
      filter(steps => !!steps.length),
      distinctUntilChanged(elementComparator),
      map(steps => {
        this.steps = steps;
        const stepTitles = steps.map(step => step.name!);
        stepTitles.push($localize`:@@label.done:Abgeschlossen`);
        if (this.steps[this.currentIndex]) {
          this.currentStepId = this.steps[this.currentIndex].id!;
          this.tableData$ = this.elementService.elementsByProcessIdAndStepId$(
            this.steps[this.currentIndex].processId!,
            this.currentStepId
          );
        }
        return stepTitles;
      }),
      takeUntil(this._destroy$)
    );
  }

  get processId$(): Observable<number> {
    return this.activatedRoute.paramMap.pipe(
      filter(param => !!param.get('processId')),
      map(param => +param.get('processId')!),
      takeUntil(this._destroy$)
    );
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  public changeContent(index: number): void {
    this.currentIndex = index;
    this.currentStepId =
      index === this.steps.length ? null : this.steps[this.currentIndex]?.id!;
    this.processId$
      .pipe(
        concatMap(
          id =>
            (this.tableData$ =
              this.elementService.elementsByProcessIdAndStepId$(
                id,
                this.currentStepId
              ))
        ),
        takeUntil(this._destroy$)
      )
      .subscribe();
  }

  public navigateToCreateElement(): void {
    this.router.navigate([`./element`], {
      relativeTo: this.activatedRoute,
    });
  }

  public navigateTo(element: Element): void {
    const route = `./element/${element.id}`;
    this.router.navigate([route], {
      relativeTo: this.activatedRoute,
    });
  }

  public deleteTableRow(element: Process | Element | Step): void {
    if (!element.id) {
      return;
    }
    this.dialog
      .open(ConfirmDialogComponent, {
        data: { title: $localize`:@@dialog.delete_element:Delete Element?` },
        autoFocus: false,
      })
      .afterClosed()
      .pipe(
        filter(confirmed => !!confirmed),
        concatMap(() => this.elementViewModelService.deleteElement$(element)),
        takeUntil(this._destroy$)
      )
      .subscribe();
  }

  public editTableRow(element: Process | Element | Step): void {
    if (!element) {
      return;
    }
    this.elementService
      .saveElement$(element as Element)
      .pipe(takeUntil(this._destroy$))
      .subscribe();
  }
}
