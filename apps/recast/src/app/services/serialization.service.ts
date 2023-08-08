import { Injectable } from '@angular/core';
import { ProcessFacadeService } from './process-facade.service';
import { ElementFacadeService } from './element-facade.service';
import { map, Observable } from 'rxjs';
import {
  Element,
  ElementProperty,
  ValueType,
} from '../../../build/openapi/recast';
import { StepPropertyService } from './step-property.service';

@Injectable({
  providedIn: 'root',
})
export class SerializationService {
  constructor(
    private readonly processService: ProcessFacadeService,
    private readonly stepPropertyService: StepPropertyService,
    private readonly elementService: ElementFacadeService
  ) {}

  // train-dataset aus bundle bis spezifischem Step:
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
  // test-dataset das selbe aber mit step-1 beginnen
  public export(processId: number, stepId: number | null): Observable<string> {
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
        map(dataset => {
          return this.datasetToCsv(dataset);
        })
      );
  }

  private datasetToCsv(dataset: Dataset, sep = ','): string {
    const header: string = dataset.columns.map(col => col.name).join(sep);
    const rows: string[] = dataset.rows.map(row =>
      row.map(r => r.value).join(sep)
    );
    return [header, ...rows].join('\n');
  }

  private datasetFromRows(rows: DatasetRow[]): Dataset {
    return rows.reduce(
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
  }

  private processElementProperties(element: Element): DatasetRow {
    const records: DatasetRow = [];
    for (const elementProperty of element.elementProperties ?? []) {
      records.push(this.processElementProperty(elementProperty));
    }
    return records;
  }

  private processElementProperty(
    elementProperty: ElementProperty
  ): DatasetValue {
    const stepProperty = this.stepPropertyService.stepPropertyById(
      elementProperty.stepPropertyId ?? 0
    );
    const colName: string = stepProperty.name ?? '';
    const propValue: string = elementProperty.value ?? '';
    const type: string = stepProperty.type ?? '';
    let dataValue: DatasetValue;
    switch (stepProperty.type) {
      case ValueType.Dataset:
        dataValue = this.processDataset(colName, type, propValue);
        break;
      case ValueType.Image:
        dataValue = this.processImage(colName, type, propValue);
        break;
      case ValueType.Timeseries:
        dataValue = this.processTimeseries(colName, type, propValue);
        break;
      case ValueType.File:
        dataValue = this.processFile(colName, type, propValue);
        break;
      default:
        if (this.processService.isReference(stepProperty.type ?? '')) {
          dataValue = this.processReference(colName, type, propValue);
        }
        dataValue = { column: { name: colName, type }, value: propValue ?? '' };
    }
    return dataValue;
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

  private processReference(
    columnName: string,
    columnType: string,
    propertyValue: string
  ): DatasetValue {
    return {
      column: { name: columnName, type: columnType },
      value: propertyValue ?? '',
    };
  }
}

type DatasetColumn = { name: string; type: string };
type DatasetValue = { column: DatasetColumn; value: string };
type DatasetRow = DatasetValue[];
type Dataset = { columns: DatasetColumn[]; rows: DatasetRow[] };
