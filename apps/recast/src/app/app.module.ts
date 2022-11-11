import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { UserModule} from './user/user.module';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PageNotFoundComponent } from './templates/page-not-found/page-not-found.component';
import {MaterialModule} from './material/material.module';
import {SupabaseService} from './services/supabase.service';

const appInit = (supabaseService: SupabaseService) => () => supabaseService.session;

@NgModule({
  declarations: [
    AppComponent,
    PageNotFoundComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    UserModule,
    MaterialModule,
  ],
  providers: [
    {provide: APP_INITIALIZER, useFactory: appInit, deps: [SupabaseService], multi: true}
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
