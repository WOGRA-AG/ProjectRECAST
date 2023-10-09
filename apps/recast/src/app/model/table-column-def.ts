import { TableColumn } from '@wogra/wogra-ui-kit';
import { BundleService, ProcessFacadeService } from '../services';

export interface TableColumnDef {
  getColumns(): TableColumn[];
}

export class ProcessColumnDef implements TableColumnDef {
  private _columns: TableColumn[] = [
    {
      key: 'id',
      label: $localize`:@@label.id:ID`,
      type: 'text',
      required: true,
      editable: false,
    },
    {
      key: 'name',
      label: $localize`:@@label.title:Title`,
      type: 'text',
      required: true,
      editable: true,
    },
    {
      key: 'bundleId',
      label: $localize`:@@label.bundle:Bundle`,
      type: 'text',
      editable: false,
      transform: (value: number): string => {
        return this.bundleService.bundleById(value)?.name ?? '';
      },
    },
    { key: 'isEdit', label: '', type: 'isEdit' },
    { key: 'isDelete', label: '', type: 'isDelete' },
  ];

  constructor(private readonly bundleService: BundleService) {}

  public getColumns(): TableColumn[] {
    return this._columns;
  }
}

export class ElementColumnDef implements TableColumnDef {
  private _columns: TableColumn[] = [
    {
      key: 'id',
      label: $localize`:@@label.id:ID`,
      type: 'text',
      required: true,
      editable: false,
    },
    {
      key: 'name',
      label: $localize`:@@label.title:Title`,
      type: 'text',
      required: true,
      editable: true,
    },
    {
      key: 'processId',
      label: $localize`:@@label.process:Process`,
      type: 'text',
      editable: false,
      transform: (value: number): string => {
        return this.processService.processById(value)?.name ?? '';
      },
    },
    { key: 'isEdit', label: '', type: 'isEdit' },
    { key: 'isDelete', label: '', type: 'isDelete' },
  ];

  constructor(private readonly processService: ProcessFacadeService) {}

  public getColumns(): TableColumn[] {
    return this._columns;
  }
}

export class BundleColumnDef implements TableColumnDef {
  private _columns: TableColumn[] = [
    {
      key: 'id',
      label: $localize`:@@label.id:ID`,
      type: 'text',
      required: true,
      editable: false,
    },
    {
      key: 'name',
      label: $localize`:@@label.title:Title`,
      type: 'text',
      required: true,
      editable: true,
    },
    { key: 'isEdit', label: '', type: 'isEdit' },
    { key: 'isDelete', label: '', type: 'isDelete' },
  ];

  public getColumns(): TableColumn[] {
    return this._columns;
  }
}
