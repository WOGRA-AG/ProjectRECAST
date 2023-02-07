import {
  from,
  mergeMap,
  Observable,
  reduce,
  groupBy as rxGroup,
  map,
} from 'rxjs';
import { parse } from 'yaml';
import { Process } from '../../../../build/openapi/recast';

export const groupBy = <
  T extends Include<any, string | number | symbol>,
  G extends keyof T
>(
  elements: T[],
  key: G
): Record<T[G], T[]> =>
  elements.reduce((prev, current) => {
    (prev[current[key]] = prev[current[key]] || []).push(current);
    return prev;
  }, {} as Record<T[G], T[]>);

export const groupBy$ = <
  T extends Include<any, string | number | symbol>,
  G extends keyof T
>(
  val: T[],
  key: G
): Observable<{ key: T[G]; values: T[] }> =>
  from(val).pipe(
    rxGroup(prop => prop[key]),
    mergeMap(group$ =>
      group$.pipe(
        reduce(
          (acc, cur) => {
            acc.values.push(cur);
            return acc;
          },
          { key: group$.key, values: [] as T[] }
        )
      )
    )
  );

type Include<T, K extends keyof any> = Pick<T, Extract<keyof T, K>>;

export const yamlToProcess$ = (file: File): Observable<Process> =>
  from(file.text()).pipe(
    map(text => {
      const proc: Process = parse(text);
      if (!proc.name) {
        throw Error('No valid Process File');
      }
      return proc;
    })
  );

export const elementComparator = <T>(a: T, b: T): boolean =>
  JSON.stringify(a) === JSON.stringify(b);
