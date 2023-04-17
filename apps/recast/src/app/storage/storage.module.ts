import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShepardAdapter } from '../services/adapter/shepard-adapter.service';
import { SupabaseS3Adapter } from '../services/adapter/supabase-s3-adapter.service';
import { SupabasePostgresAdapter } from '../services/adapter/supabase-postgres-adapter.service';

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
      useClass: SupabaseS3Adapter,
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
