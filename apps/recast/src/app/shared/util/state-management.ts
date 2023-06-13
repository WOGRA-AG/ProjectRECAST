export const addObjectToState = <T>(objectToAdd: T, state: T[]): T[] =>
  state.concat(objectToAdd);

export const removeObjectFromState = <T>(index: number, state: T[]): T[] => {
  const newState = state.slice();
  if (index === -1) {
    return newState;
  }
  return newState.slice(0, index).concat(newState.slice(index + 1));
};
