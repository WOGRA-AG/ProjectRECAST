import { Component, OnDestroy } from '@angular/core';
import { Breadcrumb } from '../../design/components/molecules/breadcrumb/breadcrumb.component';
import { ActivatedRoute, Router } from '@angular/router';
import {
  distinctUntilChanged,
  filter,
  map,
  Observable,
  of,
  Subject,
  switchMap,
  take,
  takeUntil,
  tap,
  zip,
} from 'rxjs';
import { BundleService, ProcessFacadeService } from '../../services';
import { Bundle, Process } from '../../../../build/openapi/recast';
import { Edge, Node } from '@swimlane/ngx-graph';
import { elementComparator } from '../../shared/util/common-utils';
import { SerializationService } from '../../services/serialization.service';

@Component({
  selector: 'app-bundle-detail',
  templateUrl: './bundle-detail.component.html',
  styleUrls: ['./bundle-detail.component.scss'],
})
export class BundleDetailComponent implements OnDestroy {
  public title = '';
  public breadcrumbs: Breadcrumb[] = [];
  public nodes: Node[] = [];
  public links: Edge[] = [];
  private readonly _destroy$: Subject<void> = new Subject<void>();

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly router: Router,
    private readonly bundleService: BundleService,
    private readonly processService: ProcessFacadeService,
    private readonly serializationService: SerializationService
  ) {
    this.bundle$()
      .pipe(
        takeUntil(this._destroy$),
        tap(bundle => {
          this.title = bundle.name ?? '';
          this.breadcrumbs = [
            {
              label: $localize`:@@header.overview:Overview`,
              link: '/overview',
            },
            { label: this.title },
          ];
        }),
        switchMap(bundle =>
          this.bundleService.processesByBundleId$(bundle.id ?? 0)
        ),
        takeUntil(this._destroy$),
        switchMap(processes => zip([processes], this.prepareNodes$(processes))),
        switchMap(([processes, nodes]) =>
          zip([nodes], this.prepareEdges$(processes))
        )
      )
      .subscribe(([nodes, edges]) => {
        this.nodes = nodes;
        this.links = edges;
      });
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  protected onNodeSelect(node: Node): void {
    const processId = +node.id;
    this.router.navigate([`/overview/process/${processId}`]);
  }

  protected navigateBack(): void {
    this.router.navigate(['/overview']);
  }

  protected downloadDataset(): void {
    this.serializationService
      .export(280, 482)
      .pipe(take(1))
      .subscribe(csv => {
        const atag = document.createElement('a');
        atag.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        atag.download = 'dataset.csv';
        document.body.appendChild(atag);
        atag.click();
        document.body.removeChild(atag);
      });
  }

  private prepareNodes$(processes: Process[]): Observable<Node[]> {
    return of(processes).pipe(
      map(processes => {
        return processes.map(process => {
          return {
            id: process.id.toString(),
            label: process.name,
          };
        });
      }),
      distinctUntilChanged(elementComparator)
    );
  }

  private prepareEdges$(processes: Process[]): Observable<Edge[]> {
    return of(processes).pipe(
      map(processes => {
        const edges: Edge[] = [];
        processes.map(process => {
          edges.push(...this.generateEdgesForProcess(process));
        });
        return edges;
      }),
      distinctUntilChanged(elementComparator)
    );
  }

  private generateEdgesForProcess(process: Process): Edge[] {
    const edges: Edge[] = [];
    process.steps?.map(step => {
      step.stepProperties?.map(stepProperty => {
        if (this.processService.isReference(stepProperty.type ?? '')) {
          const target = process.id?.toString();
          const source =
            this.bundleService
              .processInBundleByName(
                process.bundleId ?? 0,
                stepProperty.type ?? ''
              )
              ?.id.toString() ?? '';
          edges.push({
            id: 'id-' + stepProperty.id,
            target: target,
            label: stepProperty.name,
            source: source,
          });
        }
      });
    });
    return edges;
  }

  private bundleId$(): Observable<number> {
    return this.activatedRoute.paramMap.pipe(
      distinctUntilChanged(),
      filter(param => !!param.get('bundleId')),
      map(param => +param.get('bundleId')!)
    );
  }

  private bundle$(): Observable<Bundle> {
    return this.bundleId$().pipe(
      switchMap(bundleId => this.bundleService.bundleById$(bundleId)),
      filter(Boolean)
    );
  }
}
