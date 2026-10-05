import 'server-only';
import { createClient } from '@supabase/supabase-js';

let client: ReturnType<typeof createClient> | undefined;

export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server credentials are not configured.');
  client ??= createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
  return client;
}

export const mediaStorage = () => supabaseAdmin().storage.from('media');
