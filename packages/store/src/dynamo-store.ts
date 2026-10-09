/**
 * DynamoDB ItemStore. One table, PK + SK. Transactions use TransactWriteItems.
 */

import { DynamoDBClient, TransactionCanceledException } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
  type TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { ConditionFailedError, type Condition, type Item, type ItemStore, type Key, type QueryOptions, type Write } from "./item-store.js";

type TransactItem = NonNullable<TransactWriteCommandInput["TransactItems"]>[number];

export class DynamoItemStore implements ItemStore {
  private readonly doc: DynamoDBDocumentClient;

  constructor(
    private readonly tableName: string,
    client?: DynamoDBClient,
  ) {
    this.doc = DynamoDBDocumentClient.from(client ?? new DynamoDBClient({}), {
      marshallOptions: { removeUndefinedValues: true },
    });
  }

  async get(key: Key): Promise<Item | undefined> {
    const res = await this.doc.send(new GetCommand({ TableName: this.tableName, Key: key, ConsistentRead: true }));
    return res.Item as Item | undefined;
  }

  async query(pk: string, options: QueryOptions = {}): Promise<Item[]> {
    const names: Record<string, string> = { "#pk": "PK" };
    const values: Record<string, unknown> = { ":pk": pk };
    let keyCond = "#pk = :pk";
    if (options.skPrefix) {
      names["#sk"] = "SK";
      values[":sk"] = options.skPrefix;
      keyCond += " AND begins_with(#sk, :sk)";
    }
    const filterParts = (options.filters ?? []).map((f, i) => {
      names[`#f${i}`] = f.attr;
      if (f.op === "notExists") return `attribute_not_exists(#f${i})`;
      values[`:f${i}`] = f.value;
      return `#f${i} = :f${i}`;
    });

    const items: Item[] = [];
    let start: Record<string, unknown> | undefined;
    do {
      const res = await this.doc.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: keyCond,
          FilterExpression: filterParts.length ? filterParts.join(" AND ") : undefined,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
          ExclusiveStartKey: start,
          ConsistentRead: true,
        }),
      );
      items.push(...((res.Items ?? []) as Item[]));
      start = res.LastEvaluatedKey;
    } while (start);
    return items;
  }

  async transact(writes: Write[]): Promise<void> {
    if (writes.length === 0) return;
    if (writes.length > 100) throw new Error("DynamoDB transactions are limited to 100 writes");
    try {
      await this.doc.send(
        new TransactWriteCommand({ TransactItems: writes.map((w) => this.toTransactItem(w)) }),
      );
    } catch (err) {
      if (err instanceof TransactionCanceledException || (err as Error).name === "TransactionCanceledException") {
        const reasons = (err as TransactionCanceledException).CancellationReasons ?? [];
        const failed = reasons.flatMap((r, i) => (r.Code === "ConditionalCheckFailed" ? [i] : []));
        if (failed.length) throw new ConditionFailedError(failed);
      }
      throw err;
    }
  }

  private toTransactItem(w: Write): TransactItem {
    const names: Record<string, string> = {};
    const values: Record<string, unknown> = {};
    let n = 0;
    const name = (attr: string) => {
      const k = `#n${n++}`;
      names[k] = attr;
      return k;
    };
    const value = (v: unknown) => {
      const k = `:v${n++}`;
      values[k] = v;
      return k;
    };
    const condition = (cs: Condition[] | undefined) =>
      cs?.length
        ? cs
            .map((c) => {
              const a = name(c.attr);
              if (c.op === "exists") return `attribute_exists(${a})`;
              if (c.op === "notExists") return `attribute_not_exists(${a})`;
              return `${a} ${c.op} ${value("value" in c ? c.value : undefined)}`;
            })
            .join(" AND ")
        : undefined;
    const exprAttrs = () => ({
      ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
      ExpressionAttributeValues: Object.keys(values).length ? values : undefined,
    });

    if (w.kind === "put") {
      const ConditionExpression = condition(w.conditions);
      return { Put: { TableName: this.tableName, Item: w.item, ConditionExpression, ...exprAttrs() } };
    }
    if (w.kind === "delete") {
      const ConditionExpression = condition(w.conditions);
      return { Delete: { TableName: this.tableName, Key: w.key, ConditionExpression, ...exprAttrs() } };
    }
    const clauses: string[] = [];
    const sets = Object.entries(w.set ?? {}).map(([k, v]) => `${name(k)} = ${value(v)}`);
    if (sets.length) clauses.push(`SET ${sets.join(", ")}`);
    const adds = Object.entries(w.add ?? {}).map(([k, v]) => `${name(k)} ${value(v)}`);
    if (adds.length) clauses.push(`ADD ${adds.join(", ")}`);
    const removes = (w.remove ?? []).map((k) => name(k));
    if (removes.length) clauses.push(`REMOVE ${removes.join(", ")}`);
    const ConditionExpression = condition(w.conditions);
    return {
      Update: {
        TableName: this.tableName,
        Key: { PK: w.key.PK, SK: w.key.SK },
        UpdateExpression: clauses.join(" "),
        ConditionExpression,
        ...exprAttrs(),
      },
    };
  }
}
