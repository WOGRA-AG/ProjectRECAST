import { AfterViewInit, Component, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss']
})

export class TableComponent<T> implements OnChanges, AfterViewInit, OnInit {
  @ViewChild(MatSort) sort: MatSort | null = null;

  @Input() columnsSchema: TableColumn[] = [];
  @Input() data: Observable<T[]> = new Observable<T[]>();

  @Output() deleteClicked: EventEmitter<T> = new EventEmitter<T>();
  @Output() saveClicked: EventEmitter<T> = new EventEmitter<T>();
  @Output() rowClicked: EventEmitter<T> = new EventEmitter<T>();

  dataSource: MatTableDataSource<T> = new MatTableDataSource<T>();
  columns: string[] = this.columnsSchema.map(col => col.key);

  ngOnInit() {
    this.columns = this.columnsSchema.map(col => col.key);
  }

  ngOnChanges(): void {
    this.data.subscribe(value => {
      this.dataSource.data = value;
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  applyFilter(filterValue: string | null) {
    this.dataSource.filter = filterValue?.trim().toLowerCase() || '';
  }

  saved(element: T): void {
    delete (element as any).isEdit;
    this.saveClicked.emit(element);
  }
}

export interface TableColumn {
  key: string;
  type: 'isEdit' | 'isDelete' | 'text' | 'number';
  label: string;
  required?: boolean;
}
