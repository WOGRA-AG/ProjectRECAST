export interface ApplicationStateModel {
  overview: {
    index: number;
  };
}

export const INIT_STATE: ApplicationStateModel = { overview: { index: 0 } };
