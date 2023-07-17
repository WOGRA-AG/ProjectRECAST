import { Injectable } from '@angular/core';
import {
  BundleService,
  ElementFacadeService,
  ProcessFacadeService,
  StepFacadeService,
} from 'src/app/services';
import { mergeWith, take } from 'rxjs';

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

  public updateApplicationState(): void {
    this.processService
      .updateProcesses$()
      .pipe(
        mergeWith(
          this.elementService.updateElements$(),
          this.stepService.updateSteps$(),
          this.bundleService.updateBundles$()
        ),
        take(1)
      )
      .subscribe();
  }
}
