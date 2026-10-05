import 'server-only';
import postgres from 'postgres';

type BoundStatement = { sql: string; args: unknown[] };
type RunResult = { meta: { changes: number }; rows: Record<string, unknown>[] };

const tableNames = 'teams|sessions|settings|documents|challenges|media|activity|limits|file_unlocks|leaderboard_v';

function qualify(sql: string) {
  return sql.replace(new RegExp(`\\b(FROM|JOIN|INTO|UPDATE|TABLE)\\s+(${tableNames})\\b`, 'gi'), (_all, op, table) => `${op} meridian.${table}`);
}

function placeholders(query: string) {
  let index = 0;
  let quote = '';
  let result = '';
  for (let i = 0; i < query.length; i++) {
    const char = query[i];
    if (quote) {
      result += char;
      if (char === quote && query[i + 1] === quote) result += query[++i];
      else if (char === quote) quote = '';
    } else if (char === "'" || char === '"') {
      quote = char;
      result += char;
    } else if (char === '?') {
      result += `$${++index}`;
    } else result += char;
  }
  return qualify(result);
}

function normalizeRow(row: Record<string, any>) {
  for (const key of ['created_at', 'updated_at', 'approved_at', 'unlocked_at', 'first_unlock_at', 'last_unlock_at']) {
    if (row[key] instanceof Date) row[key] = row[key].getTime();
  }
  return row;
}

function mutations(sql: string) {
  return /^\s*(INSERT|UPDATE|DELETE|WITH\b[\s\S]*?\b(INSERT|UPDATE|DELETE))\b/i.test(sql);
}

async function runQuery(client: any, statement: BoundStatement): Promise<RunResult> {
  const sql = placeholders(statement.sql);
  const isMutation = mutations(sql);
  const query = isMutation && !/\bRETURNING\b/i.test(sql) ? `${sql} RETURNING 1 AS changed` : sql;
  const rows = await client.unsafe(query, statement.args as any[]);
  return { meta: { changes: isMutation ? rows.length : 0 }, rows: Array.from(rows, row => normalizeRow(row as any)) };
}

function createDb(client: any) {
  const execute = (sql: string, args: unknown[]) => runQuery(client, { sql, args });
  return {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        sql,
        args,
        first: async <T>() => (await execute(sql, args)).rows[0] as T | undefined,
        all: async <T>() => ({ results: (await execute(sql, args)).rows as T[] }),
        run: () => execute(sql, args),
      }),
    }),
    batch: async (statements: BoundStatement[]) => client.begin(async (tx: any) => {
      const results: RunResult[] = [];
      for (const statement of statements) results.push(await runQuery(tx, statement));
      return results;
    }),
    transaction: async <T>(callback: (tx: { run: (statement: BoundStatement) => Promise<RunResult> }) => Promise<T>) =>
      client.begin((tx: any) => callback({ run: statement => runQuery(tx, statement) })),
  };
}

const globalDb = globalThis as typeof globalThis & { __meridianPostgres?: ReturnType<typeof postgres>; __meridianDb?: ReturnType<typeof createDb> };

export function db() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error('SUPABASE_DB_URL is not configured.');
  if (!globalDb.__meridianPostgres) {
    globalDb.__meridianPostgres = postgres(url, { prepare: false, max: 3, idle_timeout: 20, connect_timeout: 10 });
    globalDb.__meridianDb = createDb(globalDb.__meridianPostgres);
  }
  return globalDb.__meridianDb!;
}

export type { BoundStatement };
