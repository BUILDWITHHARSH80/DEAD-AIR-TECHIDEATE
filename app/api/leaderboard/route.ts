import * as E from '@/lib/engine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const session = await E.requireSession(req);
    const { value: settings } = await E.settings();
    if (session.role !== 'admin' && !settings.leaderboard) E.fail('LIVE RANKINGS ARE CURRENTLY HIDDEN.', 403);
    return Response.json({
      now: Date.now(),
      eventStart: Number(settings.startedAt || 0),
      status: settings.status === 'RUNNING' && E.remaining(settings) === 0 ? 'ENDED' : settings.status,
      rows: await E.leaderboardRows(),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    return Response.json({ error: error.status ? error.message : 'LEADERBOARD CONNECTION INTERRUPTED.' }, {
      status: error.status || 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
