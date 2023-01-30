import { Component, OnDestroy } from '@angular/core';
import { Breadcrumb } from 'src/app/design/components/molecules/breadcrumb/breadcrumb.component';
import { yamlToProcess$ } from '../../shared/util/common-utils';
import { ProcessFacadeService } from '../../services/process-facade.service';
import { catchError, concatMap, filter, of, Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';

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
    private processFacade: ProcessFacadeService,
    private router: Router
  ) {}

  public ngOnDestroy() {
    this._destroy$.next();
    this._destroy$.complete();
  }

  uploadFile(file: File | null) {
    if (!file) {
      return;
    }
    yamlToProcess$(file)
      .pipe(
        filter(proc => !!proc.name),
        concatMap(proc => this.processFacade.saveProcess$(proc)),
        catchError(err => {
          console.error(err);
          return of(undefined);
        }),
        takeUntil(this._destroy$)
      )
      .subscribe(proc => this.router.navigate(['']));
  }

  cancel() {
    this.router.navigate(['']);
  }
}
