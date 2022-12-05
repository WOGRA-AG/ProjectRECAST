import { Component } from '@angular/core';
import {yamlToProcess$} from '../../shared/util/common-utils';
import {ProcessFacadeService} from '../../services/process-facade.service';
import {catchError, concatMap, filter, of} from 'rxjs';
import {Router} from '@angular/router';
import { Breadcrumb } from 'src/app/design/components/molecules/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-upload-new-process',
  templateUrl: './upload-new-process.component.html',
  styleUrls: ['./upload-new-process.component.scss']
})
export class UploadNewProcessComponent {
  public breadcrumbs: Breadcrumb[] = [{label: 'Übersicht', link: '/overview'}, {label: 'Neuen Prozess erstellen'}];
  public isValid: boolean = false;

  constructor(
    private processFacade: ProcessFacadeService,
    private router: Router,
  ) { }

  uploadFile(file: File | null) {
    if (!file) {return;}
    yamlToProcess$(file).pipe(
      filter(proc => !!proc.name),
      concatMap(proc => this.processFacade.saveProcess$(proc)),
      catchError(err => {
        console.error(err);
        return of(undefined);
      })
    ).subscribe(proc => this.router.navigate(['']));
  }

  cancel() {
    this.router.navigate(['']);
  }
}
