import { AfterViewInit, Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { MatStepper } from '@angular/material/stepper';

@Component({
  selector: 'app-stepper',
  templateUrl: './stepper.component.html',
})
export class StepperComponent implements AfterViewInit {
  @Input() steps: string[] = [];
  @Input() disabled = false;
  @Input() currentIndex = 0;
  @Output() stepChanged: EventEmitter<number> = new EventEmitter<number>();

  @ViewChild(MatStepper) stepper: MatStepper | undefined;

  ngAfterViewInit() {
    this.stepper!._getIndicatorType = () => 'number';
  }
}
