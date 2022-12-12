import { Component, Input } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { IconSize, ThemePalette } from '../../../types';

@Component({
  selector: 'app-icon',
  templateUrl: './icon.component.html',
})
export class IconComponent {
  @Input() svgIcon = '';
  @Input() size: IconSize = 'medium';
  @Input() color: ThemePalette = 'primary';

  constructor(
    private matIconRegistry: MatIconRegistry,
    private sanitizer: DomSanitizer
  ) {
    this.matIconRegistry.addSvgIcon(
      'rcst_delete',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/delete.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'rcst_edit',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/edit.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'rcst_scan',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/scan.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'rcst_arrow',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/arrow.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'rcst_chart',
      sanitizer.bypassSecurityTrustResourceUrl('assets/icons/chart.svg')
    );
  }
}
