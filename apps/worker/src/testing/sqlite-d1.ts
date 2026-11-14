import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import type { SQLInputValue } from 'node:sqlite';

import type { SqlDatabase, SqlStatement } from '../pro';

/** Tests only: the D1 slice in `SqlDatabase`, backed by in-memory SQLite with the real schema. */

function toSqlValue(value: unknown): SQLInputValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'bigint'
  ) {
    return value;
  }
  throw new Error(`Unsupported SQL value: ${String(value)}`);
}

function statement(db: DatabaseSync, query: string, values: SQLInputValue[]): SqlStatement {
  return {
    bind: (...next) => statement(db, query, next.map(toSqlValue)),
    // Each call resolves on a later microtask, as D1's network calls do, so
    // concurrent requests interleave between statements.
    run: async () => {
      await Promise.resolve();
      const result = db.prepare(query).run(...values);
      return { meta: { changes: Number(result.changes) } };
    },
    first: async () => {
      await Promise.resolve();
      const row = db.prepare(query).get(...values);
      return row === undefined ? null : { ...row };
    },
  };
}

export interface TestDatabase extends SqlDatabase {
  exec(sql: string): void;
  query(sql: string): Record<string, unknown>[];
}

export function createTestDatabase(): TestDatabase {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../../schema.sql', import.meta.url), 'utf8'));
  return {
    prepare: (query) => statement(db, query, []),
    exec: (sql) => db.exec(sql),
    query: (sql) =>
      db
        .prepare(sql)
        .all()
        .map((row) => ({ ...row })),
  };
}
