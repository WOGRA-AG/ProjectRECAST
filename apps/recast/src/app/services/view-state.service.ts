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
    const newState = this._state.getValue();
    newState.overview.index = index;
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
    const state: ViewStateModel = JSON.parse(stateString);
    this._state.next(state);
  }
}
