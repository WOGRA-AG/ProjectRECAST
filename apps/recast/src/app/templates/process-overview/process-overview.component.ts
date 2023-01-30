import { Component, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { Process, Step, Element } from 'build/openapi/recast';
import {
  concatMap,
  filter,
  map,
  Observable,
  Subject,
  takeUntil,
  tap,
} from 'rxjs';
import { Breadcrumb } from 'src/app/design/components/molecules/breadcrumb/breadcrumb.component';
import { ConfirmDialogComponent } from 'src/app/design/components/organisms/confirm-dialog/confirm-dialog.component';
import { TableColumn } from 'src/app/design/components/organisms/table/table.component';
import { ElementFacadeService } from 'src/app/services/element-facade.service';
import { ProcessFacadeService } from 'src/app/services/process-facade.service';
import { StepFacadeService } from 'src/app/services/step-facade.service';

@Component({
  selector: 'app-process-overview',
  templateUrl: './process-overview.component.html',
  styleUrls: ['./process-overview.component.scss'],
})
export class ProcessOverviewComponent implements OnDestroy {
  public title = '';
  public currentStepId: number | undefined;
  public breadcrumbs: Breadcrumb[] = [];
  public steps: Step[] = [];
  public stepTitles: string[] = [];
  public dataColumns: TableColumn[] = [
    { key: 'name', label: 'Title', type: 'text', required: true },
    { key: 'isEdit', label: '', type: 'isEdit' },
    { key: 'isDelete', label: '', type: 'isDelete' },
  ];
  public tableData$: Observable<any> = new Observable<any>();

  private _currentIndex = 0;

  private readonly _destroy$: Subject<void> = new Subject<void>();

  constructor(
    private readonly processService: ProcessFacadeService,
    private readonly elementService: ElementFacadeService,
    private readonly stepService: StepFacadeService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog
  ) {
    this.processId$
      .pipe(
        concatMap(id => this.processService.processById$(id)),
        takeUntil(this._destroy$)
      )
      .subscribe(process => {
        this.title = process.name!;
        this.breadcrumbs = [
          { label: $localize`:@@header.overview:Overview`, link: '/overview' },
          { label: this.title },
        ];
      });

    this.processId$
      .pipe(
        concatMap(id => this.stepService.stepsByProcessId$(id)),
        takeUntil(this._destroy$)
      )
      .subscribe(steps => {
        this.steps = steps;
        this.stepTitles = steps.map(step => step.name!);
        if (steps[this.currentIndex]) {
          this.currentStepId = steps[this.currentIndex].id!;
          this.tableData$ = this.elementService.elementsByProcessIdAndStepId$(
            steps[this.currentIndex].processId!,
            this.currentStepId
          );
        }
      });

    this.currentIndex$.pipe(takeUntil(this._destroy$)).subscribe();
  }

  public get currentIndex(): number {
    return this._currentIndex;
  }

  public set currentIndex(index: number) {
    this._currentIndex = index;
  }

  private get processId$(): Observable<number> {
    return this.activatedRoute.paramMap.pipe(
      filter(param => !!param.get('processId')),
      map(param => +param.get('processId')!),
      takeUntil(this._destroy$)
    );
  }
  private get currentIndex$(): Observable<number> {
    return this.activatedRoute.queryParamMap.pipe(
      filter(param => !!param.get('idx')),
      map(param => +param.get('idx')!),
      tap(idx => (this.currentIndex = idx)),
      takeUntil(this._destroy$)
    );
  }

  public ngOnDestroy() {
    this._destroy$.next();
    this._destroy$.complete();
  }

  public changeContent(index: number): void {
    this.currentIndex = index;
    this.currentStepId = this.steps[this.currentIndex]?.id!;
    this.processId$
      .pipe(
        concatMap(
          id =>
            (this.tableData$ =
              this.elementService.elementsByProcessIdAndStepId$(
                id,
                this.currentStepId!
              ))
        ),
        takeUntil(this._destroy$)
      )
      .subscribe();
    this.router.navigate(['.'], {
      relativeTo: this.activatedRoute,
      queryParams: {
        idx: `${this._currentIndex}`,
      },
    });
  }

  public navigateToCreateElement(): void {
    this.router.navigate(['./step/' + this.currentStepId + '/element'], {
      relativeTo: this.activatedRoute,
    });
  }

  public navigateTo(element: Element): void {
    this.router.navigate(
      ['./step/' + this.currentStepId + '/element/' + element.id],
      { relativeTo: this.activatedRoute }
    );
  }

  public deleteTableRow(element: Process | Element | Step): void {
    if (!element.id) {
      return;
    }
    this.dialog
      .open(ConfirmDialogComponent, {
        data: { title: $localize`:@@dialog.delete_element:Delete Element?` },
      })
      .afterClosed()
      .pipe(
        filter(confirmed => !!confirmed),
        concatMap(() => this.elementService.deleteElement$(element.id!)),
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
