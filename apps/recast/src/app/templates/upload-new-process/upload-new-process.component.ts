import { Component, OnInit } from '@angular/core';
import {yamlToProcess} from '../../shared/util/common-utils';
import {ProcessFacadeService} from '../../services/process-facade.service';

@Component({
  selector: 'app-upload-new-process',
  templateUrl: './upload-new-process.component.html',
  styleUrls: ['./upload-new-process.component.scss']
})
export class UploadNewProcessComponent implements OnInit {

  constructor(private processFacade: ProcessFacadeService) { }

  ngOnInit(): void {
  }

  uploadFile(file: File | null) {
    if (!file) return;
    yamlToProcess(file).subscribe(process => {
      this.processFacade.saveProcess(process).subscribe(error => {console.error(error)});
      console.log(process);
    });
  }
}
