import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ViewStateModel, INIT_STATE } from '../model/view-state-model';

@Injectable({
  providedIn: 'root',
})
export class ViewStateService {
  private readonly _state: BehaviorSubject<ViewStateModel> =
    new BehaviorSubject<ViewStateModel>(INIT_STATE);

  constructor() {
    this.loadState();
  }

  public updateOverviewIndex(index: number): void {
    const currentState = this._state.getValue();
    const newState = { ...currentState, overview: { index } };
    this.updateState(newState);
  }

  public state$(): Observable<ViewStateModel> {
    return this._state.asObservable();
  }

  private updateState(newState: ViewStateModel): void {
    const jsonState = JSON.stringify(newState);
    sessionStorage.setItem('state', jsonState);
    this._state.next(newState);
  }

  private loadState(): void {
    const stateString: string | null = sessionStorage.getItem('state');
    if (!stateString) {
      return;
    }
    try {
      const state: ViewStateModel = JSON.parse(stateString);
      this._state.next(state);
    } catch (e) {
      console.error('Failed to parse state from session storage:', e);
    }
  }
}
