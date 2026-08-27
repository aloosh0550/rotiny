import type { Dictionary } from "./dictionaries";

type Paths<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string ? `${K}` : `${K}.${Paths<T[K]>}`;
    }[keyof T & string];

export type TranslationKey = Paths<Dictionary>;

export function resolvePath(dict: Dictionary, path: string): string {
  const parts = path.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node: any = dict;
  for (const part of parts) {
    node = node?.[part];
  }
  return typeof node === "string" ? node : path;
}
