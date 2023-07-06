import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
})
export class TableComponent<T>
  implements OnChanges, AfterViewInit, OnInit, OnDestroy
{
  @ViewChild(MatSort) sort: MatSort | null = null;

  @Input() columnsSchema: TableColumn[] = [];
  @Input() data: Observable<T[]> = new Observable<T[]>();
  @Input() noDataText = '';

  @Output() deleteClicked: EventEmitter<T> = new EventEmitter<T>();
  @Output() saveClicked: EventEmitter<T> = new EventEmitter<T>();
  @Output() rowClicked: EventEmitter<T> = new EventEmitter<T>();

  dataSource: MatTableDataSource<T> = new MatTableDataSource<T>();
  columns: string[] = this.columnsSchema.map(col => col.key);
  private readonly _destroy$: Subject<void> = new Subject<void>();
  private _data: T[] = [];

  public ngOnInit(): void {
    this.columns = this.columnsSchema.map(col => col.key);
  }

  public ngOnChanges(): void {
    this.data.pipe(takeUntil(this._destroy$)).subscribe(value => {
      this._data = JSON.parse(JSON.stringify(value));
      this.dataSource.data = value;
    });
  }

  public ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  public applyFilter(filterValue: string | null): void {
    this.dataSource.filter = filterValue?.trim().toLowerCase() || '';
  }

  public saved(element: T): void {
    delete (element as any).isEdit;
    this.saveClicked.emit(element);
  }

  public cancelEdit(element: any): void {
    element.isEdit = !element.isEdit;
    this.dataSource.data = JSON.parse(JSON.stringify(this._data));
  }
}

export interface TableColumn {
  key: string;
  type: 'isEdit' | 'isDelete' | 'text' | 'number';
  label: string;
  editable?: boolean;
  required?: boolean;
}
