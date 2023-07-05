import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  catchError,
  concatMap,
  filter,
  map,
  of,
  Subject,
  takeUntil,
} from 'rxjs';
import { Breadcrumb } from 'src/app/design/components/molecules/breadcrumb/breadcrumb.component';
import { ElementFacadeService } from 'src/app/services/element-facade.service';
import { ProcessFacadeService } from 'src/app/services/process-facade.service';

@Component({
  selector: 'app-create-element',
  templateUrl: './create-element.component.html',
  styleUrls: ['./create-element.component.scss'],
})
export class CreateElementComponent implements OnDestroy {
  public processId: number | undefined;
  public breadcrumbs: Breadcrumb[] = [];

  propertiesForm = this.formBuilder.group({});
  private readonly _destroy$: Subject<void> = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private readonly processService: ProcessFacadeService,
    private readonly elementService: ElementFacadeService
  ) {
    this.propertiesForm.addControl(
      'name',
      new FormControl('', [Validators.minLength(3), Validators.required])
    );

    route.paramMap
      .pipe(
        filter(param => !!param.get('processId')),
        map(param => +param.get('processId')!),
        concatMap(id => this.processService.processById$(id)),
        takeUntil(this._destroy$)
      )
      .subscribe(process => {
        this.processId = process?.id;
        this.breadcrumbs = [
          { label: $localize`:@@header.overview:Overview`, link: '/overview' },
          { label: process?.name!, link: '/overview/process/' + process?.id },
          { label: $localize`:@@header.create_element:Create element` },
        ];
      });
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  public saveElement(): void {
    if (!this.processId || !this.propertiesForm.valid) {
      return;
    }
    this.elementService
      .createElement$(
        this.processId,
        this.propertiesForm.get('name')?.value ?? ''
      )
      .pipe(
        catchError(err => {
          console.error(err);
          return of(undefined);
        }),
        map(element => element?.id),
        takeUntil(this._destroy$)
      )
      .subscribe(elementId => {
        if (!elementId) {
          return;
        }
        this.router.navigate([
          `/overview/process/${this.processId}/element/${elementId}`,
        ]);
      });
  }
}
