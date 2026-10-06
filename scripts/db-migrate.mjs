import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import postgres from 'postgres';

loadEnvConfig(process.cwd());
const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) throw new Error('SUPABASE_DB_URL is required to run migrations.');

const directory = path.join(process.cwd(), 'supabase', 'migrations');
const files = (await readdir(directory)).filter(file => file.endsWith('.sql')).sort();
if (!files.length) throw new Error('No SQL migrations were found.');

const sql = postgres(connectionString, { prepare: false, max: 1, connect_timeout: 10 });
try {
  for (const file of files) {
    const source = await readFile(path.join(directory, file), 'utf8');
    await sql.unsafe(source);
    process.stdout.write(`Applied ${file}\n`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
