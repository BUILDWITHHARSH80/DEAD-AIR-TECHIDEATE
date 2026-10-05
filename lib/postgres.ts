import 'server-only';
import postgres from 'postgres';
import { notifyChange } from './supabase-admin';
import { commitThenNotify } from './commit-notify.mjs';

type BoundStatement = { sql: string; args: unknown[] };
type RunResult = { meta: { changes: number }; rows: Record<string, unknown>[] };

const tableNames = 'teams|sessions|settings|documents|challenges|media|media_upload_intents|activity|limits|file_unlocks|leaderboard_v';

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

function changeKind(sql: string) {
  const table = sql.match(/\b(?:INTO|UPDATE|FROM)\s+(?:meridian\.)?([a-z_]+)/i)?.[1]?.toLowerCase();
  return table === 'file_unlocks' ? 'file_unlock' : table === 'media_upload_intents' ? 'media_upload' : table || 'game_state';
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
        run: async () => {
          if (!mutations(sql)) return execute(sql, args);
          return commitThenNotify(() => execute(sql, args), async (result: RunResult) => {
            if (result.meta.changes) await notifyChange(changeKind(sql));
          });
        },
      }),
    }),
    batch: async (statements: BoundStatement[]) => {
      const mutation = statements.find(statement => mutations(statement.sql));
      return commitThenNotify(() => client.begin(async (tx: any) => {
        const values: RunResult[] = [];
        for (const statement of statements) values.push(await runQuery(tx, statement));
        return values;
      }), async () => { if (mutation) await notifyChange(changeKind(mutation.sql)); });
    },
    transaction: async <T>(callback: (tx: {
      run: (statement: BoundStatement) => Promise<RunResult>;
      one: (sql: string, ...args: unknown[]) => Promise<Record<string, any> | undefined>;
      all: (sql: string, ...args: unknown[]) => Promise<Record<string, any>[]>;
    }) => Promise<T>, kind = 'team') => {
      return commitThenNotify(() => client.begin((tx: any) => callback({
        run: statement => runQuery(tx, statement),
        one: async (query, ...args) => (await runQuery(tx, { sql: query, args })).rows[0],
        all: async (query, ...args) => (await runQuery(tx, { sql: query, args })).rows,
      })), () => notifyChange(kind));
    },
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
