import { Component } from '@angular/core';
import { Breadcrumb } from '../../design/components/molecules/breadcrumb/breadcrumb.component';
import { yamlToProcess$ } from '../../shared/util/common-utils';
import { catchError, concatMap, filter, of, take } from 'rxjs';
import { Router } from '@angular/router';
import { AlertService } from '../../services/alert.service';
import { BundleService } from '../../services';

@Component({
  selector: 'app-bundle-new',
  templateUrl: './bundle-new.component.html',
  styleUrls: ['./bundle-new.component.scss'],
})
export class BundleNewComponent {
  public breadcrumbs: Breadcrumb[] = [
    { label: $localize`:@@header.overview:Overview`, link: '/overview' },
    { label: $localize`:@@header.new_bundle:New Bundle` },
  ];
  public isValid = false;

  constructor(
    private readonly router: Router,
    private readonly alert: AlertService,
    private readonly bundleService: BundleService
  ) {}

  public uploadFile(file: File | null): void {
    if (!file) {
      return;
    }
    const bundleName = file.name.split('.')[0];
    yamlToProcess$(file)
      .pipe(
        filter(procs => !!procs.length),
        concatMap(procs =>
          this.bundleService.saveProcessesAsBundle$(bundleName, procs)
        ),
        catchError((err: Error) => {
          this.alert.reportError(err.message);
          return of(undefined);
        }),
        take(1)
      )
      .subscribe(bundle => {
        if (!bundle) {
          return;
        }
        this.cancel();
      });
  }

  public cancel(): void {
    this.router.navigate(['']);
  }
}
