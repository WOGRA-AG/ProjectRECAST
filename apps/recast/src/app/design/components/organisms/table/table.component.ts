import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

@Component({
    selector: 'app-table',
    templateUrl: './table.component.html',
    styleUrls: ['./table.component.scss']
  })
  
export class TableComponent {
  @Input() dataSource: MatTableDataSource<any> = new MatTableDataSource<any>();
    
  @ViewChild(MatSort) sort: MatSort | null = null;
  @Input() columns: string[] = [];
}
