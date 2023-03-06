import {
  from,
  mergeMap,
  Observable,
  reduce,
  groupBy as rxGroup,
  map,
} from 'rxjs';
import { Document, parseAllDocuments } from 'yaml';
import { Process, StepProperty } from '../../../../build/openapi/recast';

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

export const yamlToProcess$ = (file: File): Observable<Process[]> =>
  from(file.text()).pipe(
    map(text => {
      const documents: Document[] = parseAllDocuments(text);
      if (!documents.length) {
        throw Error($localize`:@@err.file.empty:No valid Yaml found in File`);
      }
      return documents.map(doc => doc.toJSON() as Process);
    })
  );

export const elementComparator = <T>(a: T, b: T): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

export const isReference = (stepProp: StepProperty): boolean =>
  !(
    stepProp?.type === 'text' ||
    stepProp.type === 'number' ||
    stepProp.type === 'file'
  );
