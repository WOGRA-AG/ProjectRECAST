import { Component, OnDestroy, ViewEncapsulation } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { Element, Process, Step } from 'build/openapi/recast';
import {
  concatMap,
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  Observable,
  Subject,
  switchMap,
  take,
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
import { SerializationService } from '../../services/serialization.service';

@Component({
  selector: 'app-process-detail',
  templateUrl: './process-detail.component.html',
  styleUrls: ['./process-detail.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class ProcessDetailComponent implements OnDestroy {
  public title = '';
  public currentStepId: number | null = 0;
  public breadcrumbs: Breadcrumb[] = [];
  public steps: Step[] = [];
  public stepTitles: string[] = [];
  public dataColumns: TableColumn[] = [
    { key: 'id', label: 'ID', type: 'text', required: true, editable: false },
    {
      key: 'name',
      label: 'Title',
      type: 'text',
      required: true,
      editable: true,
    },
    { key: 'isEdit', label: '', type: 'isEdit' },
    { key: 'isDelete', label: '', type: 'isDelete' },
  ];
  public tableData$: Observable<any> = new Observable<any>();

  public currentIndex = 0;
  protected loading = false;

  private readonly _destroy$: Subject<void> = new Subject<void>();

  constructor(
    private readonly serializationService: SerializationService,
    private readonly processService: ProcessFacadeService,
    private readonly elementService: ElementFacadeService,
    private readonly stepService: StepFacadeService,
    private readonly elementViewModelService: ElementViewModelFacadeService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog
  ) {
    this.processId$()
      .pipe(
        concatMap(id => this.processService.processById$(id)),
        filter(process => !!process),
        takeUntil(this._destroy$)
      )
      .subscribe(process => {
        this.title = process?.name ?? '';
        this.breadcrumbs = [
          { label: $localize`:@@header.overview:Overview`, link: '/overview' },
          { label: this.title },
        ];
      });
    this.stepTitles$()
      .pipe(takeUntil(this._destroy$))
      .subscribe(titles => {
        this.stepTitles = titles;
        if (this.steps[this.currentIndex]) {
          this.currentStepId = this.steps[this.currentIndex].id!;
          this.tableData$ = this.elementService.elementsByProcessIdAndStepId$(
            this.steps[this.currentIndex].processId!,
            this.currentStepId
          );
        }
      });
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  public changeContent(index: number): void {
    this.currentIndex = index;
    this.currentStepId =
      index === this.steps.length
        ? null
        : this.steps[this.currentIndex].id ?? 0;
    this.processId$()
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
        take(1)
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

  public navigateByElementId(elementId: string): void {
    this.router.navigate(['element', elementId], {
      relativeTo: this.activatedRoute,
    });
  }

  protected stepTitles$(): Observable<string[]> {
    return this.processId$().pipe(
      mergeMap(id => this.stepService.stepsByProcessId$(id)),
      filter(steps => !!steps.length),
      distinctUntilChanged(elementComparator),
      map(steps => {
        this.steps = steps;
        const stepTitles = steps.map(step => step.name!);
        stepTitles.push($localize`:@@label.done:Abgeschlossen`);
        return stepTitles;
      }),
      distinctUntilChanged(elementComparator),
      takeUntil(this._destroy$)
    );
  }

  protected downloadDataset(): void {
    this.loading = true;
    this.processId$()
      .pipe(
        switchMap(id =>
          this.serializationService.export$(id, this.currentStepId)
        ),
        take(1)
      )
      .subscribe(blob => {
        const atag = document.createElement('a');
        atag.href = URL.createObjectURL(blob);
        atag.download = 'dataset.zip';
        document.body.appendChild(atag);
        atag.click();
        document.body.removeChild(atag);
        this.loading = false;
      });
  }

  private processId$(): Observable<number> {
    return this.activatedRoute.paramMap.pipe(
      distinctUntilChanged(),
      filter(param => !!param.get('processId')),
      map(param => +param.get('processId')!)
    );
  }
}
