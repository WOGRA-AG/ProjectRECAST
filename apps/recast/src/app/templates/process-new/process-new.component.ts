import { Component, OnDestroy } from '@angular/core';
import { Breadcrumb } from '@wogra/wogra-ui-kit';
import { yamlToProcess$ } from '../../shared/util/common-utils';
import { ProcessFacadeService } from '../../services';
import { catchError, concatMap, filter, of, Subject, take } from 'rxjs';
import { Router } from '@angular/router';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-process-new',
  templateUrl: './process-new.component.html',
  styleUrls: ['./process-new.component.scss'],
})
export class ProcessNewComponent implements OnDestroy {
  public breadcrumbs: Breadcrumb[] = [
    { label: $localize`:@@header.overview:Overview`, link: '/overview' },
    { label: $localize`:@@header.new_process:New Process` },
  ];
  public isValid = false;

  private readonly _destroy$: Subject<void> = new Subject<void>();

  constructor(
    private readonly processFacade: ProcessFacadeService,
    private readonly router: Router,
    private readonly alert: AlertService
  ) {}

  public ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  public uploadFile(file: File | undefined): void {
    if (!file) {
      return;
    }
    yamlToProcess$(file)
      .pipe(
        filter(procs => !!procs.length),
        concatMap(procs => this.processFacade.saveProcesses$(procs)),
        catchError((err: Error) => {
          this.alert.reportError(err.message);
          return of(undefined);
        }),
        take(1)
      )
      .subscribe(processes => {
        if (!processes) {
          return;
        }
        this.cancel();
      });
  }

  public cancel(): void {
    this.router.navigate(['']);
  }
}
