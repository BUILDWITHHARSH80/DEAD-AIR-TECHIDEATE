import * as E from '@/lib/engine';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) { try {
    const s = await E.requireSession(req);
    const encoder = new TextEncoder();
    let timer: ReturnType<typeof setTimeout>;
    let closed = false;
    let last = '';
    const started = Date.now();
    const stream = new ReadableStream({ start(controller) { const poll = async () => { if (closed)
            return; try {
            if (Date.now() - started > 60000) {
                closed = true;
                controller.close();
                return;
            }
            const c = await E.one('SELECT revision FROM settings WHERE id=?', 'event');
            const a = await E.one(s.role === 'admin' ? 'SELECT MAX(created_at) AS version FROM activity' : 'SELECT MAX(created_at) AS version FROM activity WHERE team_id=? OR team_id IS NULL', ...(s.role === 'admin' ? [] : [s.team_id]));
            const version = String(c?.revision) + ':' + String(a?.version);
            if (version !== last) {
                controller.enqueue(encoder.encode('event: change\ndata: ' + JSON.stringify({ version }) + '\n\n'));
                last = version;
            }
            else
                controller.enqueue(encoder.encode(': heartbeat\n\n'));
            timer = setTimeout(poll, 2000);
        }
        catch {
            if (!closed) {
                closed = true;
                controller.close();
            }
        } }; void poll(); req.signal.addEventListener('abort', () => { closed = true; clearTimeout(timer); try {
            controller.close();
        }
        catch { } }); }, cancel() { closed = true; clearTimeout(timer); } });
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-store', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' } });
}
catch (e: any) {
    return Response.json({ error: e.message }, { status: e.status || 503 });
} }