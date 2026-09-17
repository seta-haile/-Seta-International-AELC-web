import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { DrizzleDb } from './db.types.js';
import * as schema from './schema/index.js';

class RollbackSignal extends Error {}

/**
 * Runs `run` inside a real Postgres transaction against DATABASE_URL and
 * always rolls it back afterwards, so DB-backed specs can exercise the real
 * schema/constraints/upsert logic without leaving data behind in the shared
 * dev database.
 *
 * `tx` is cast to `DrizzleDb` because `PostgresJsTransaction` implements the
 * same query-builder surface (select/insert/update/delete/transaction, and
 * nested `transaction()` calls become Postgres SAVEPOINTs) but is not the
 * literal `PostgresJsDatabase` type that `DrizzleDb` aliases.
 */
export async function withRollback(
  run: (db: DrizzleDb) => Promise<void>,
): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for DB-backed tests');
  }

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    await db.transaction(async (tx) => {
      await run(tx as unknown as DrizzleDb);
      throw new RollbackSignal();
    });
  } catch (error) {
    if (!(error instanceof RollbackSignal)) {
      throw error;
    }
  } finally {
    await client.end();
  }
}
