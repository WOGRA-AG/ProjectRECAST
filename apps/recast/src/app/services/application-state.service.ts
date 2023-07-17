import { Injectable } from '@angular/core';
import {
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
    private readonly stepService: StepFacadeService
  ) {}

  public updateApplicationState(): void {
    this.processService
      .updateProcesses$()
      .pipe(
        mergeWith(
          this.elementService.updateElements$(),
          this.stepService.updateSteps$()
        ),
        take(1)
      )
      .subscribe();
  }
}
