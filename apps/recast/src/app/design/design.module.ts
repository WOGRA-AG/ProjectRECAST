import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from './material/material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InputFieldComponent } from './components/molecules/input-field/input-field.component';
import { LogoutButtonComponent } from './components/molecules/logout-button/logout-button.component';
import { SubmitButtonComponent } from './components/molecules/submit-button/submit-button.component';
import { TabGroupComponent } from './components/molecules/tab-group/tab-group.component';
import { PageHeaderComponent } from './components/organisms/page-header/page-header.component';
import { CreateButtonComponent } from './components/molecules/create-button/create-button.component';
import { TableComponent } from './components/organisms/table/table.component';
import { IconComponent } from './components/atoms/icon/icon.component';
import { HttpClientModule } from '@angular/common/http';
import { SearchFieldComponent } from './components/molecules/search-field/search-field.component';
import { IconButtonComponent } from './components/molecules/icon-button/icon-button.component';
import { SingleFileUploadComponent } from './components/organisms/single-file-upload/single-file-upload.component';
import { DragAndDropDirective } from './directives/drag-and-drop.directive';
import { DragAndDropFileInputComponent } from './components/molecules/drag-and-drop-file-input/drag-and-drop-file-input.component';
import { BreadcrumbComponent } from './components/molecules/breadcrumb/breadcrumb.component';
import { AppRoutingModule } from '../app-routing.module';
import { ButtonFilledComponent } from './components/molecules/button-filled/button-filled.component';
import { ButtonUnfilledComponent } from './components/molecules/button-unfilled/button-unfilled.component';
import { StepperComponent } from './components/molecules/stepper/stepper.component';
import { ConfirmDialogComponent } from './components/organisms/confirm-dialog/confirm-dialog.component';
import { SelectFieldComponent } from './components/molecules/select-field/select-field.component';
import { FileInputFieldComponent } from './components/molecules/file-input-field/file-input-field.component';
import { DateInputFieldComponent } from './components/molecules/date-input-field/date-input-field.component';
import { ColorInputFieldComponent } from './components/molecules/color-input-field/color-input-field.component';
import { AutocompleteInputFieldComponent } from './components/molecules/autocomplete-input-field/autocomplete-input-field.component';
import { HandwritingRecognitionComponent } from './components/molecules/handwriting-recognition/handwriting-recognition.component';
import { DagComponent } from './components/organisms/dag/dag.component';
import { NgxGraphModule } from '@swimlane/ngx-graph';

const COMPONENTS = [
  ButtonFilledComponent,
  ButtonUnfilledComponent,
  InputFieldComponent,
  LogoutButtonComponent,
  SubmitButtonComponent,
  TabGroupComponent,
  PageHeaderComponent,
  CreateButtonComponent,
  TableComponent,
  IconComponent,
  SearchFieldComponent,
  IconButtonComponent,
  SingleFileUploadComponent,
  DragAndDropDirective,
  DragAndDropFileInputComponent,
  BreadcrumbComponent,
  StepperComponent,
  ConfirmDialogComponent,
  SelectFieldComponent,
  FileInputFieldComponent,
  DateInputFieldComponent,
  ColorInputFieldComponent,
];

@NgModule({
  declarations: [
    ...COMPONENTS,
    AutocompleteInputFieldComponent,
    HandwritingRecognitionComponent,
    DagComponent,
  ],
  exports: [
    ...COMPONENTS,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    AutocompleteInputFieldComponent,
    HandwritingRecognitionComponent,
    DagComponent,
  ],
  imports: [
    CommonModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    AppRoutingModule,
    NgxGraphModule,
  ],
})
export class DesignModule {}
