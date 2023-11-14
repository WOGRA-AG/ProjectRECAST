import { Injectable } from '@angular/core';
import {
  BundleService,
  ElementFacadeService,
  ProcessFacadeService,
  StepFacadeService,
} from 'src/app/services';
import { mergeWith, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApplicationStateService {
  constructor(
    private readonly elementService: ElementFacadeService,
    private readonly processService: ProcessFacadeService,
    private readonly stepService: StepFacadeService,
    private readonly bundleService: BundleService
  ) {}

  public updateApplicationState$(): Observable<void> {
    return this.processService
      .updateProcesses$()
      .pipe(
        mergeWith(
          this.elementService.updateElements$(),
          this.stepService.updateSteps$(),
          this.bundleService.updateBundles$()
        )
      );
  }
}
