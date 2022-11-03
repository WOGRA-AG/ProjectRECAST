import { Component, OnInit } from '@angular/core';
import { SupabaseService} from './services/supabase.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'recast';

  session = this.supabase.session

  constructor(private readonly supabase: SupabaseService) {
  }

  ngOnInit() {
    this.supabase.authChanges((_, session) => (this.session = session));
  }
}
