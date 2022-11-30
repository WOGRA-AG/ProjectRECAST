import { AfterViewInit, Component, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-table',
    templateUrl: './table.component.html',
    styleUrls: ['./table.component.scss']
  })

export class TableComponent implements OnInit, OnChanges, AfterViewInit {
  @ViewChild(MatSort) sort: MatSort | null = null;

  @Input() iconColumns: string[] = [];
  @Input() dataColumns: TableColumn[] = [];
  @Input() data: Observable<any> = new Observable<any>();

  @Output() deleteClicked: EventEmitter<number> = new EventEmitter<number>();
  @Output() editClicked: EventEmitter<number> = new EventEmitter<number>();

  dataSource: MatTableDataSource<any> = new MatTableDataSource<any>();
  columns: string[] = [];

  ngOnInit(): void {
    this.columns = this.dataColumns.map(column => column.key).concat(this.iconColumns);
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
}

export interface TableColumn {
  key: string;
  title: string;
}
