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

export async function notifyChange(kind: string, revision = Date.now()) {
  let channel: ReturnType<ReturnType<typeof createClient>['channel']> | undefined;
  try {
    channel = supabaseAdmin().channel('meridian-event', { config: { broadcast: { ack: true, self: false } } });
    const status = await new Promise<string>(resolve => {
      const timeout = setTimeout(() => resolve('TIMED_OUT'), 2500);
      channel!.subscribe(value => {
        if (value === 'SUBSCRIBED' || value === 'CHANNEL_ERROR' || value === 'TIMED_OUT' || value === 'CLOSED') {
          clearTimeout(timeout);
          resolve(value);
        }
      });
    });
    if (status !== 'SUBSCRIBED') return;
    await channel.send({ type: 'broadcast', event: 'change', payload: { kind, revision } });
  } catch {
    // Realtime is an invalidation hint. The client recovery refresh remains authoritative.
  } finally {
    if (channel) await supabaseAdmin().removeChannel(channel).catch(() => undefined);
  }
}
