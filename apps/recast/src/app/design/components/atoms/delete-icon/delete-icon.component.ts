import { Component, Input } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
    selector: 'app-delete-icon',
    templateUrl: './delete-icon.component.html'
  })
  export class DeleteIconComponent {
  @Input() size = '';
  @Input() color = 'primary';

  constructor(
    private matIconRegistry: MatIconRegistry,
    private sanitizer: DomSanitizer
  ) {
    this.matIconRegistry.addSvgIcon(
    'rcst_delete',
    sanitizer.bypassSecurityTrustResourceUrl('assets/icons/delete.svg')
    );
  }
}

