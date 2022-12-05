import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { UserModule} from './user/user.module';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PageNotFoundComponent } from './templates/page-not-found/page-not-found.component';
import {SupabaseService} from './services/supabase.service';
import { DesignModule } from './design/design.module';
import { OverviewComponent } from './templates/overview/overview.component';
import {SharedModule} from './shared/shared.module';
import { ProcessOverviewComponent } from './templates/process-overview/process-overview.component';
import { UploadNewProcessComponent } from './templates/upload-new-process/upload-new-process.component';

@NgModule({
  declarations: [
    AppComponent,
    PageNotFoundComponent,
    OverviewComponent,
    ProcessOverviewComponent,
    UploadNewProcessComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    UserModule,
    DesignModule,
    SharedModule,
  ],
  providers: [
    SupabaseService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
