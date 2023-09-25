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
import { flatMap, flatten, reduce, map as lomap } from 'lodash';
import { parse } from 'csv-parse/sync';

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
        map((rows: DatasetRow[]) => this._datasetFromRows(rows)),
        map(dataset => this._datasetToCsv(dataset)),
        concatMap(dataset => {
          this.jszip.file(this.datasetAchiveName, dataset);
          return from(this.jszip.generateAsync({ type: 'blob' }));
        })
      );
  }

  private _datasetToCsv(dataset: Dataset, sep = ';'): string {
    const header: string = dataset.columns.map(col => col.name).join(sep);
    const rows: string[] = dataset.rows.map(row =>
      row.map(r => r.value).join(sep)
    );
    return [header, ...rows].join('\n');
  }

  private _datasetValuesFromCsv(
    csv: string,
    sep: string | string[] | Buffer | undefined = ['\t', ';'],
    columns = true
  ): DatasetValue[] {
    const parsedCsv = parse(csv, {
      columns: columns,
      skip_empty_lines: true,
      delimiter: sep,
    });
    if (!columns) {
      return [
        {
          column: { name: '', type: ValueType.Timeseries },
          value: parsedCsv,
        },
      ];
    }

    const dummy: { [key: string]: string[] } = {};
    const parsedCsvObj = reduce(
      parsedCsv[0],
      (result, value, key) => {
        result[key] = lomap(parsedCsv, row => row[key]);
        return result;
      },
      dummy
    );

    return flatMap(parsedCsvObj, (values, key) => {
      return {
        column: { name: key, type: ValueType.Timeseries },
        value: values,
      };
    });
  }

  private _datasetFromRows(rows: DatasetRow[]): Dataset {
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
        return this._processDataset$(colName, type, propValue, storageBackend);
      case ValueType.Image:
        observable = this._processImage$(
          colName,
          type,
          propValue,
          storageBackend
        );
        break;
      case ValueType.Timeseries:
        observable = this._processTimeseries$(
          colName,
          type,
          propValue,
          storageBackend
        );
        break;
      case ValueType.File:
        observable = this._processFile$(
          colName,
          type,
          propValue,
          storageBackend
        );
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

  private _processDataset$(
    _1: string,
    _2: ValueType,
    propertyValue: string,
    storageBackend?: StorageBackend
  ): Observable<DatasetValue[]> {
    return this.storageService.getFile$(propertyValue, storageBackend).pipe(
      concatMap(file => file.text()),
      map(text => {
        return this._datasetValuesFromCsv(text);
      })
    );
  }

  private _processTimeseries$(
    columnName: string,
    columnType: ValueType,
    propertyValue: string,
    storageBackend?: StorageBackend
  ): Observable<DatasetValue> {
    return this.storageService.getFile$(propertyValue, storageBackend).pipe(
      concatMap(file => file.text()),
      map(text => {
        const timeseries = this._datasetValuesFromCsv(text, ',', false);
        return {
          column: { name: columnName, type: columnType },
          value: timeseries[0].value,
        };
      })
    );
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
type DatasetValue = { column: DatasetColumn; value: string | string[] };
type DatasetRow = DatasetValue[];
type Dataset = { columns: DatasetColumn[]; rows: DatasetRow[] };
