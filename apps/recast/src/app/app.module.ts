import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { UserModule } from './user/user.module';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PageNotFoundComponent } from './templates/page-not-found/page-not-found.component';
import { SupabaseService } from './services';
import { DesignModule } from './design/design.module';
import { OverviewComponent } from './templates/overview/overview.component';
import { ProcessOverviewComponent } from './templates/process-overview/process-overview.component';
import { SharedModule } from './shared/shared.module';
import { UploadNewProcessComponent } from './templates/upload-new-process/upload-new-process.component';
import { i18nModule } from './i18n/i18n.module';
import { CreateElementComponent } from './templates/create-element/create-element.component';
import { ElementDetailComponent } from './templates/element-detail/element-detail.component';
import { StorageModule } from './storage/storage.module';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { ErrorInterceptor } from './interceptors/error.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    PageNotFoundComponent,
    OverviewComponent,
    ProcessOverviewComponent,
    UploadNewProcessComponent,
    CreateElementComponent,
    ElementDetailComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    UserModule,
    DesignModule,
    SharedModule,
    StorageModule,
  ],
  providers: [
    SupabaseService,
    i18nModule.setLocale(),
    i18nModule.setLocaleId(),
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
