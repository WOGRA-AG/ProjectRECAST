import { Component, Input } from '@angular/core';
import { Breadcrumb } from 'src/app/design/components/molecules/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.scss'],
})
export class PageHeaderComponent {
  @Input() breadcrumbs: Breadcrumb[] = [];
}
