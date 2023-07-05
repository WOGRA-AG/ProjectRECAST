import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  ApplicationStateModel,
  INIT_STATE,
} from '../model/application-state-model';

@Injectable({
  providedIn: 'root',
})
export class ApplicationStateService {
  private readonly _state: BehaviorSubject<ApplicationStateModel> =
    new BehaviorSubject<ApplicationStateModel>(INIT_STATE);

  constructor() {
    this.loadState();
  }

  public updateOverviewIndex(index: number): void {
    const newState = this._state.getValue();
    newState.overview.index = index;
    this.updateState(newState);
  }

  public state$(): Observable<ApplicationStateModel> {
    return this._state.asObservable();
  }

  private updateState(newState: ApplicationStateModel): void {
    const jsonState = JSON.stringify(newState);
    sessionStorage.setItem('state', jsonState);
    this._state.next(newState);
  }

  private loadState(): void {
    const stateString: string | null = sessionStorage.getItem('state');
    if (!stateString) {
      return;
    }
    const state: ApplicationStateModel = JSON.parse(stateString);
    this._state.next(state);
  }
}
