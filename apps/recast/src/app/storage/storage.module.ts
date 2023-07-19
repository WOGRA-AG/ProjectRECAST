import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShepardAdapter } from './services/adapter/shepard-adapter.service';
import { SupabaseAdapter } from './services/adapter/supabase-adapter.service';

@NgModule({
  declarations: [],
  imports: [CommonModule],
  providers: [
    {
      provide: 'StorageAdapterInterface',
      useClass: ShepardAdapter,
      multi: true,
    },
    {
      provide: 'StorageAdapterInterface',
      useClass: SupabaseAdapter,
      multi: true,
    },
  ],
})
export class StorageModule {}
