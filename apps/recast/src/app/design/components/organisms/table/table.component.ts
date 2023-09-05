import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, Subject, Subscription, takeUntil } from 'rxjs';
import { SelectionModel } from '@angular/cdk/collections';
import { elementComparator } from '../../../../shared/util/common-utils';
import { MatPaginator } from '@angular/material/paginator';

@Component({
  selector: 'app-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
})
export class TableComponent<T> implements OnChanges, AfterViewInit, OnDestroy {
  @ViewChild(MatSort) sort: MatSort | null = null;
  @ViewChild(MatPaginator) paginator: MatPaginator | null = null;

  @Input() columnsSchema: TableColumn[] = [];
  @Input() data: Observable<T[]> = new Observable<T[]>();
  @Input() noDataText = '';
  @Input() selectable = false;
  @Input() multipleSelect = true;
  @Input() selection: T[] = [];
  @Input() compareWith: (o1: T, o2: T) => boolean = elementComparator;

  @Output() deleteClicked: EventEmitter<T> = new EventEmitter<T>();
  @Output() saveClicked: EventEmitter<T> = new EventEmitter<T>();
  @Output() rowClicked: EventEmitter<T> = new EventEmitter<T>();
  @Output() selectionChange: EventEmitter<T[]> = new EventEmitter<T[]>();

  selectionModel = new SelectionModel<T>(
    true,
    this.selection,
    false,
    this.compareWith
  );
  dataSource: MatTableDataSource<T> = new MatTableDataSource<T>();
  private readonly _destroy$: Subject<void> = new Subject<void>();
  private _data: T[] = [];
  private _sub: Subscription = new Subscription();

  public ngOnChanges(changes: SimpleChanges): void {
    if (Object.prototype.hasOwnProperty.call(changes, 'selection')) {
      this.selectionModel.clear();
      this.selectionModel.select(...this.selection);
    }
    if (Object.prototype.hasOwnProperty.call(changes, 'compareWith')) {
      this.selectionModel.compareWith = this.compareWith;
    }
    if (Object.prototype.hasOwnProperty.call(changes, 'data')) {
      this._sub.unsubscribe();
      this._sub = this.data.pipe(takeUntil(this._destroy$)).subscribe(value => {
        this._data = JSON.parse(JSON.stringify(value));
        this.dataSource.data = JSON.parse(JSON.stringify(value));
      });
    }
  }

  public ngAfterViewInit(): void {
    this.sort?.sortChange.pipe(takeUntil(this._destroy$)).subscribe(() => {
      if (!this.paginator) return;
      this.paginator.pageIndex = 0;
    });
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
    this._sub.unsubscribe();
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

  public selectHandler(row: T): void {
    if (!this.multipleSelect && !this.selectionModel.isSelected(row)) {
      this.selectionModel.clear();
    }
    this.selectionModel.toggle(row);
    this.selectionChange.emit(this.selectionModel.selected);
  }

  protected displayedColumns(): string[] {
    return this.selectable
      ? ['select', ...this.columnsSchema.map(col => col.key)]
      : this.columnsSchema.map(col => col.key);
  }
}

export interface TableColumn {
  key: string;
  type: 'isEdit' | 'isDelete' | 'text' | 'number';
  label: string;
  editable?: boolean;
  required?: boolean;
  transform?: (value: any) => any;
}
