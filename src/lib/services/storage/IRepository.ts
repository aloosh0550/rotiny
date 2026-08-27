import type { ID } from "@/lib/types";

export interface IRepository<T extends { id: ID }> {
  getAll(): Promise<T[]>;
  getById(id: ID): Promise<T | undefined>;
  create(item: T): Promise<T>;
  update(id: ID, patch: Partial<T>): Promise<T>;
  delete(id: ID): Promise<void>;
  query(predicate: (item: T) => boolean): Promise<T[]>;
}
