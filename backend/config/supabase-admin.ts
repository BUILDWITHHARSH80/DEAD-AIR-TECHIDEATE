// backend/config/supabase-admin.ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { supabaseServiceRoleKey, supabaseUrl } from './environment';

let client: ReturnType<typeof createClient> | undefined;

export function supabaseAdmin() {
  const url = supabaseUrl();
  const key = supabaseServiceRoleKey();
  if (!url || !key) throw new Error('Supabase server credentials are not configured.');
  client ??= createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  return client;
}

export const mediaStorage = () => supabaseAdmin().storage.from('media');

export async function notifyChange(kind: string, revision = Date.now()) {
  let channel: ReturnType<ReturnType<typeof createClient>['channel']> | undefined;
  try {
    channel = supabaseAdmin().channel('meridian-event');
    await channel.httpSend('change', { kind, revision });
  } catch {
    // Realtime is an invalidation hint. The client recovery refresh remains authoritative.
  } finally {
    if (channel) await supabaseAdmin().removeChannel(channel).catch(() => undefined);
  }
}
