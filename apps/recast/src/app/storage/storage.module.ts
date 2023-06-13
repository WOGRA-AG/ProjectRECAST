import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShepardAdapter } from './services/adapter/shepard-adapter.service';
import { SupabasePostgresAdapter } from './services/adapter/supabase-postgres-adapter.service';

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
      useClass: SupabasePostgresAdapter,
      multi: true,
    },
  ],
})
export class StorageModule {}
