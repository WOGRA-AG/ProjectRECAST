import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from './material/material.module';
import { ButtonFilledComponent } from './components/atoms/button-filled/button-filled.component';
import { ButtonUnfilledComponent } from './components/atoms/button-unfilled/button-unfilled.component';
import { IconButtonFilledComponent } from './components/molecules/icon-button-filled/icon-button-filled.component';
import { DemoComponent } from './demo/demo.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {TextInputFieldComponent} from './components/molecules/text-input-field/text-input-field.component';
import {LogoutButtonComponent} from './components/molecules/logout-button/logout-button.component';
import {SubmitButtonComponent} from './components/molecules/submit-button/submit-button.component';
import { IconButtonUnfilledComponent } from './components/molecules/icon-button-unfilled/icon-button-unfilled.component';
import { TabGroupComponent } from './components/molecules/tab-group/tab-group.component';
import { PageHeaderComponent } from './components/atoms/page-header/page-header.component';
import { CreateButtonComponent } from './components/molecules/create-button/create-button.component';
import { TableComponent } from './components/organisms/table/table.component';
import { IconComponent } from './components/atoms/icon/icon.component';
import { HttpClientModule } from '@angular/common/http';
import { SearchFieldComponent } from './components/molecules/search-field/search-field.component';
import { IconButtonComponent } from './components/molecules/icon-button/icon-button.component';
import { FileUploadComponent } from './components/organisms/file-upload/file-upload.component';
import { DragAndDropDirective } from './directives/drag-and-drop.directive';
import { SingleFileInput } from './components/molecules/single-file-input/single-file-input.component';

const COMPONENTS = [
  DemoComponent,
  ButtonFilledComponent,
  ButtonUnfilledComponent,
  IconButtonFilledComponent,
  IconButtonUnfilledComponent,
  TextInputFieldComponent,
  LogoutButtonComponent,
  SubmitButtonComponent,
  TabGroupComponent,
  PageHeaderComponent,
  CreateButtonComponent,
  TableComponent,
  IconComponent,
  SearchFieldComponent,
  IconButtonComponent,
  FileUploadComponent,
  DragAndDropDirective,
  SingleFileInput,
];

@NgModule({
  declarations: [
    ...COMPONENTS,
  ],
  exports: [
    ...COMPONENTS,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule
  ],
  imports: [
    CommonModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
  ]
})
export class DesignModule { }
