import { AfterViewInit, Component, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-table',
    templateUrl: './table.component.html',
    styleUrls: ['./table.component.scss']
  })

export class TableComponent implements OnChanges, AfterViewInit {
  @ViewChild(MatSort) sort: MatSort | null = null;

  @Input() columns: string[] = [];
  @Input() data: Observable<any> = new Observable<any>();

  @Output() deleteClicked: EventEmitter<number> = new EventEmitter<number>();
  @Output() editClicked: EventEmitter<number> = new EventEmitter<number>();

  dataSource: MatTableDataSource<any> = new MatTableDataSource<any>();

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
