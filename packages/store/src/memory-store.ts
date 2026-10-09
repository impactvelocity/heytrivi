/**
 * In-memory ItemStore for local runs and tests. Same semantics as DynamoDB:
 * conditions are checked against the state before the transaction, and either
 * every write applies or none does.
 */

import { ConditionFailedError, type Condition, type Filter, type Item, type ItemStore, type Key, type QueryOptions, type Write } from "./item-store.js";

export class MemoryItemStore implements ItemStore {
  private readonly tables = new Map<string, Map<string, Item>>();

  async get(key: Key): Promise<Item | undefined> {
    const item = this.tables.get(key.PK)?.get(key.SK);
    return item ? structuredClone(item) : undefined;
  }

  async query(pk: string, options: QueryOptions = {}): Promise<Item[]> {
    const part = this.tables.get(pk);
    if (!part) return [];
    return [...part.values()]
      .filter((i) => !options.skPrefix || i.SK.startsWith(options.skPrefix))
      .filter((i) => (options.filters ?? []).every((f) => matchesFilter(i, f)))
      .sort((a, b) => (a.SK < b.SK ? -1 : a.SK > b.SK ? 1 : 0))
      .map((i) => structuredClone(i));
  }

  async transact(writes: Write[]): Promise<void> {
    const failed: number[] = [];
    writes.forEach((w, idx) => {
      const key = w.kind === "put" ? w.item : w.key;
      const current = this.tables.get(key.PK)?.get(key.SK);
      if (!(w.conditions ?? []).every((c) => meets(current, c))) failed.push(idx);
    });
    if (failed.length) throw new ConditionFailedError(failed);

    for (const w of writes) {
      if (w.kind === "put") {
        this.part(w.item.PK).set(w.item.SK, structuredClone(w.item));
      } else if (w.kind === "delete") {
        this.tables.get(w.key.PK)?.delete(w.key.SK);
      } else {
        const part = this.part(w.key.PK);
        const item = (part.get(w.key.SK) ?? { PK: w.key.PK, SK: w.key.SK }) as Item;
        for (const [k, v] of Object.entries(w.set ?? {})) item[k] = structuredClone(v);
        for (const [k, v] of Object.entries(w.add ?? {})) item[k] = ((item[k] as number | undefined) ?? 0) + v;
        for (const k of w.remove ?? []) delete item[k];
        part.set(w.key.SK, item);
      }
    }
  }

  private part(pk: string): Map<string, Item> {
    let p = this.tables.get(pk);
    if (!p) this.tables.set(pk, (p = new Map()));
    return p;
  }
}

function meets(item: Item | undefined, c: Condition): boolean {
  const v = item?.[c.attr];
  switch (c.op) {
    case "exists":
      return v !== undefined;
    case "notExists":
      return v === undefined;
    case "=":
      return v === c.value;
    case ">=":
      return typeof v === "number" && v >= (c.value as number);
  }
}

function matchesFilter(item: Item, f: Filter): boolean {
  return f.op === "notExists" ? item[f.attr] === undefined : item[f.attr] === f.value;
}
