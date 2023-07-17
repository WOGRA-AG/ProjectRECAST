import { Component, OnDestroy } from '@angular/core';
import { Breadcrumb } from 'src/app/design/components/molecules/breadcrumb/breadcrumb.component';
import { yamlToProcess$ } from '../../shared/util/common-utils';
import { ProcessFacadeService } from '../../services';
import { catchError, concatMap, filter, of, Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-upload-new-process',
  templateUrl: './upload-new-process.component.html',
  styleUrls: ['./upload-new-process.component.scss'],
})
export class UploadNewProcessComponent implements OnDestroy {
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

  public uploadFile(file: File | null): void {
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
        takeUntil(this._destroy$)
      )
      .subscribe(() => this.router.navigate(['']));
  }

  public cancel(): void {
    this.router.navigate(['']);
  }
}
