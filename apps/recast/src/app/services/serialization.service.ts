import { Injectable } from '@angular/core';
import { ProcessFacadeService } from './process-facade.service';
import { ElementFacadeService } from './element-facade.service';
import { concatMap, from, map, Observable } from 'rxjs';
import {
  Element,
  ElementProperty,
  ValueType,
} from '../../../build/openapi/recast';
import { StepPropertyService } from './step-property.service';
import * as JSZip from 'jszip';

@Injectable({
  providedIn: 'root',
})
export class SerializationService {
  jszip = new JSZip();
  datasetFileName = 'dataset.csv';
  constructor(
    private readonly processService: ProcessFacadeService,
    private readonly stepPropertyService: StepPropertyService,
    private readonly elementService: ElementFacadeService
  ) {}

  // export bis spezifischem Step:
  //  - alle Elemente laden, die diesen Step abgeschlossen haben
  //  - je Element alle elementProperties bis Step laden
  //  - über elementProperties iterieren:
  //    - elementPropName -> ColumnName
  //    - elementPropValue -> RowValue
  //    - if image -> file runterladen, tempfile anlegen, filename -> RowValue
  //    - if timeseries -> file laden, lesen, inhalt -> rowValue
  //    - if dataset -> csv laden, lesen, pro spalte im csv neue Column anlegen und wie timeseries speichern
  //    - if reference -> Referenziertes Bauteil laden und mit dessen elementProperties von vorne beginnen
  // csv und gespeicherte images als zip verpacken und downloaden
  //
  public export(processId: number, stepId: number | null): Observable<Blob> {
    return this.elementService
      .elementsByProcessIdTillStep$(processId, stepId)
      .pipe(
        map(elements => {
          const rows: DatasetRow[] = [];
          for (const element of elements) {
            rows.push(this.processElementProperties(element));
          }
          return this.datasetFromRows(rows);
        }),
        concatMap(dataset => {
          this.jszip.file(this.datasetFileName, this.datasetToCsv(dataset));
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
    dataset.columns.sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });
    dataset.rows.map(row => {
      return row.sort((a, b) => {
        if (a.column.name < b.column.name) return -1;
        if (a.column.name > b.column.name) return 1;
        return 0;
      });
    });
    return dataset;
  }

  private processElementProperties(element: Element): DatasetRow {
    const row: DatasetRow = [];
    for (const elementProperty of element.elementProperties ?? []) {
      row.push(...this.processElementProperty(elementProperty));
    }
    return row;
  }

  private processElementProperty(
    elementProperty: ElementProperty
  ): DatasetValue[] {
    const stepProperty = this.stepPropertyService.stepPropertyById(
      elementProperty.stepPropertyId ?? 0
    );
    const colName: string = stepProperty.name?.toLowerCase() ?? '';
    const propValue: string = elementProperty.value ?? '';
    const type: string = stepProperty.type ?? '';
    const dataValues: DatasetValue[] = [];
    switch (stepProperty.type) {
      case ValueType.Dataset:
        dataValues.push(this.processDataset(colName, type, propValue));
        break;
      case ValueType.Image:
        dataValues.push(this.processImage(colName, type, propValue));
        break;
      case ValueType.Timeseries:
        dataValues.push(this.processTimeseries(colName, type, propValue));
        break;
      case ValueType.File:
        dataValues.push(this.processFile(colName, type, propValue));
        break;
      default:
        if (this.processService.isReference(type)) {
          dataValues.push(...this.processReference(propValue));
          break;
        }
        dataValues.push({
          column: { name: colName, type },
          value: propValue ?? '',
        });
    }
    return dataValues;
  }

  private processImage(
    columnName: string,
    columnType: string,
    propertyValue: string
  ): DatasetValue {
    return {
      column: { name: columnName, type: columnType },
      value: propertyValue ?? '',
    };
  }

  private processFile(
    columnName: string,
    columnType: string,
    propertyValue: string
  ): DatasetValue {
    return {
      column: { name: columnName, type: columnType },
      value: propertyValue ?? '',
    };
  }

  private processDataset(
    columnName: string,
    columnType: string,
    propertyValue: string
  ): DatasetValue {
    return {
      column: { name: columnName, type: columnType },
      value: propertyValue ?? '',
    };
  }

  private processTimeseries(
    columnName: string,
    columnType: string,
    propertyValue: string
  ): DatasetValue {
    return {
      column: { name: columnName, type: columnType },
      value: propertyValue ?? '',
    };
  }

  private processReference(propertyValue: string): DatasetValue[] {
    const element = this.elementService.elementById(Number(propertyValue));
    if (!element) {
      return [];
    }
    return this.processElementProperties(element);
  }
}

type DatasetColumn = { name: string; type: string };
type DatasetValue = { column: DatasetColumn; value: string };
type DatasetRow = DatasetValue[];
type Dataset = { columns: DatasetColumn[]; rows: DatasetRow[] };
