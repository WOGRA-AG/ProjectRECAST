import { Component, OnInit } from '@angular/core';
import { SupabaseService} from './services/supabase.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'recast';

  session: any;

  constructor(private readonly supabase: SupabaseService) {
    this.session = this.supabase.session;
  }

  ngOnInit() {
    this.supabase.authChanges((_, session) => (this.session = session));
  }

  public isAuthenticated(): boolean {
    return !!this.session;
  }
}
