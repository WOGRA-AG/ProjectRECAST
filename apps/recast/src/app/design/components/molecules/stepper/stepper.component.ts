import { AfterContentChecked, Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { MatStepper } from '@angular/material/stepper';

@Component({
  selector: 'app-stepper',
  templateUrl: './stepper.component.html',
})
export class StepperComponent implements AfterContentChecked {
  @Input() steps: string[] = [];
  @Input() disabled = false;
  @Input() currentIndex: number | undefined;
  @Output() stepChanged: EventEmitter<number> = new EventEmitter<number>();

  @ViewChild('stepper') stepper: MatStepper | undefined;

  ngAfterContentChecked() {
    if (this.stepper && this.currentIndex) {
      this.stepper.selectedIndex = this.currentIndex;
    }
  }
}
