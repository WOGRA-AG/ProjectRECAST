import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from './material/material.module';
import { DemoComponent } from './demo/demo.component';
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
import { SingleFileInputComponent } from './components/molecules/single-file-input/single-file-input.component';
import { BreadcrumbComponent } from './components/molecules/breadcrumb/breadcrumb.component';
import { AppRoutingModule } from '../app-routing.module';
import { ButtonFilledComponent } from './components/molecules/button-filled/button-filled.component';
import { ButtonUnfilledComponent } from './components/molecules/button-unfilled/button-unfilled.component';

const COMPONENTS = [
  DemoComponent,
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
  SingleFileInputComponent,
  BreadcrumbComponent,
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
    AppRoutingModule
  ]
})
export class DesignModule { }
