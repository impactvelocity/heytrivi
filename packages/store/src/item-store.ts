/**
 * The store interface: a small single-table item store with conditional,
 * all-or-nothing transactions. Two implementations: in-memory (local runs and
 * tests) and DynamoDB. The game logic in repo.ts is written once against this.
 *
 * Every item carries a `type` attribute, because DynamoDB filter expressions
 * cannot reference the key attributes.
 */

export interface Key {
  PK: string;
  SK: string;
}

export type Item = Key & { type: string } & Record<string, unknown>;

export type Condition =
  | { attr: string; op: "exists" | "notExists" }
  | { attr: string; op: "=" | ">="; value: unknown };

export type Write =
  | { kind: "put"; item: Item; conditions?: Condition[] }
  | {
      kind: "update";
      key: Key;
      set?: Record<string, unknown>;
      add?: Record<string, number>;
      remove?: string[];
      conditions?: Condition[];
    }
  | { kind: "delete"; key: Key; conditions?: Condition[] };

export type Filter = { attr: string; op: "=" ; value: unknown } | { attr: string; op: "notExists" };

export interface QueryOptions {
  skPrefix?: string;
  /** All filters must match. */
  filters?: Filter[];
}

export interface ItemStore {
  get(key: Key): Promise<Item | undefined>;
  query(pk: string, options?: QueryOptions): Promise<Item[]>;
  /** Apply every write or none. Throws ConditionFailedError if any condition fails. */
  transact(writes: Write[]): Promise<void>;
}

export class ConditionFailedError extends Error {
  constructor(public readonly failedIndexes: number[]) {
    super(`Condition failed on write ${failedIndexes.join(", ")}`);
    this.name = "ConditionFailedError";
  }
}
