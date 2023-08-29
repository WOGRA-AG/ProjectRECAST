import { Injectable } from '@angular/core';
import { ProcessFacadeService } from './process-facade.service';
import { ElementFacadeService } from './element-facade.service';
import {
  concatMap,
  forkJoin,
  from,
  map,
  mergeMap,
  Observable,
  of,
  take,
  toArray,
} from 'rxjs';
import {
  Element,
  ElementProperty,
  StorageBackend,
  ValueType,
} from '../../../build/openapi/recast';
import { StepPropertyService } from './step-property.service';
import * as JSZip from 'jszip';
import { StorageService } from '../storage/services/storage.service';
import { flatten } from 'lodash';

@Injectable({
  providedIn: 'root',
})
export class SerializationService {
  jszip = new JSZip();
  datasetAchiveName = 'dataset.csv';
  constructor(
    private readonly processService: ProcessFacadeService,
    private readonly stepPropertyService: StepPropertyService,
    private readonly elementService: ElementFacadeService,
    private readonly storageService: StorageService
  ) {}

  public export$(processId: number, stepId: number | null): Observable<Blob> {
    return this.elementService
      .elementsByProcessIdTillStep$(processId, stepId)
      .pipe(
        take(1),
        mergeMap(elements => from(elements)),
        mergeMap(element => this._processElementProperties$(element)),
        toArray(),
        map((rows: DatasetRow[]) => this.datasetFromRows(rows)),
        map(dataset => this.datasetToCsv(dataset)),
        concatMap(dataset => {
          this.jszip.file(this.datasetAchiveName, dataset);
          return from(this.jszip.generateAsync({ type: 'blob' }));
        })
      );
  }

  private datasetToCsv(dataset: Dataset, sep = ';'): string {
    const header: string = dataset.columns.map(col => col.name).join(sep);
    const rows: string[] = dataset.rows.map(row =>
      row.map(r => r.value).join(sep)
    );
    return [header, ...rows].join('\n');
  }

  private datasetFromRows(rows: DatasetRow[]): Dataset {
    const dataset = rows.reduce(
      (acc, row): Dataset => {
        for (const value of row) {
          if (
            !acc.columns
              .map(c => JSON.stringify(c))
              .includes(JSON.stringify(value.column))
          ) {
            acc.columns.push(value.column);
          }
        }
        acc.rows.push(row);
        return acc;
      },
      { columns: [], rows: [] } as Dataset
    );
    dataset.columns.sort((a, b) => a.name.localeCompare(b.name));
    dataset.rows.map(row =>
      row.sort((a, b) => a.column.name.localeCompare(b.column.name))
    );
    return dataset;
  }

  private _processElementProperties$(element: Element): Observable<DatasetRow> {
    const row: Observable<DatasetRow>[] = [];
    for (const elementProperty of element.elementProperties ?? []) {
      row.push(this._processElementProperty$(elementProperty).pipe(take(1)));
    }
    return forkJoin(row).pipe(map(flatten), take(1));
  }

  private _processElementProperty$(
    elementProperty: ElementProperty
  ): Observable<DatasetValue[]> {
    const stepProperty = this.stepPropertyService.stepPropertyById(
      elementProperty.stepPropertyId ?? 0
    );
    const colName: string = stepProperty.name?.toLowerCase() ?? '';
    const propValue: string = elementProperty.value ?? '';
    const type: ValueType = stepProperty.type ?? ValueType.Text;
    const storageBackend = elementProperty.storageBackend;
    let observable: Observable<DatasetValue>;
    switch (stepProperty.type) {
      case ValueType.Dataset:
        observable = this._processDataset$(colName, type, propValue);
        break;
      case ValueType.Image:
        observable = this._processImage$(
          colName,
          type,
          propValue,
          storageBackend
        );
        break;
      case ValueType.Timeseries:
        observable = this._processTimeseries$(colName, type, propValue);
        break;
      case ValueType.File:
        observable = this._processFile$(colName, type, propValue);
        break;
      default:
        if (this.processService.isReference(type)) {
          return this._processReference$(propValue);
        }
        return of([
          {
            column: { name: colName, type },
            value: propValue ?? '',
          },
        ]);
    }
    return observable.pipe(take(1), toArray());
  }

  private _processImage$(
    columnName: string,
    columnType: ValueType,
    propertyValue: string,
    storageBackend?: StorageBackend
  ): Observable<DatasetValue> {
    return this.storageService.getFile$(propertyValue, storageBackend).pipe(
      map(file => {
        this.jszip.file(file.name, file as Blob, { binary: true });
        return {
          column: { name: columnName, type: columnType },
          value: file.name,
        };
      })
    );
  }

  private _processFile$(
    columnName: string,
    columnType: ValueType,
    propertyValue: string
  ): Observable<DatasetValue> {
    return of({
      column: { name: columnName, type: columnType },
      value: propertyValue ?? '',
    });
  }

  private _processDataset$(
    columnName: string,
    columnType: ValueType,
    propertyValue: string
  ): Observable<DatasetValue> {
    return of({
      column: { name: columnName, type: columnType },
      value: propertyValue ?? '',
    });
  }

  private _processTimeseries$(
    columnName: string,
    columnType: ValueType,
    propertyValue: string
  ): Observable<DatasetValue> {
    return of({
      column: { name: columnName, type: columnType },
      value: propertyValue ?? '',
    });
  }

  private _processReference$(
    propertyValue: string
  ): Observable<DatasetValue[]> {
    const element = this.elementService.elementById(Number(propertyValue));
    if (!element) {
      return of([]);
    }
    return this._processElementProperties$(element);
  }
}

type DatasetColumn = { name: string; type: ValueType };
type DatasetValue = { column: DatasetColumn; value: string };
type DatasetRow = DatasetValue[];
type Dataset = { columns: DatasetColumn[]; rows: DatasetRow[] };
