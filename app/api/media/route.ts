import * as E from '@/lib/engine';
import { mediaStorage } from '@/lib/supabase-admin';
export const dynamic = 'force-dynamic';
const err = (e: any) => Response.json({ error: e.status ? e.message : 'MEDIA ARCHIVE INTERRUPTED. Try again.' }, { status: e.status || 503, headers: { 'Cache-Control': 'no-store' } });
function checkOrigin(req: Request) {
    const origin = req.headers.get('origin');
    if (!origin) return;
    let host = '';
    try { host = new URL(origin).host.toLowerCase(); } catch { E.fail('Origin rejected.', 403); }
    const expected = (req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host).split(',')[0].trim().toLowerCase();
    if (host !== expected && host !== process.env.VERCEL_URL?.toLowerCase()) E.fail('Origin rejected.', 403);
}

export async function GET(req: Request) { try {
    const session = await E.requireSession(req);
    const media = await E.one('SELECT * FROM media WHERE id=?', new URL(req.url).searchParams.get('id'));
    if (!media || session.role !== 'admin' && media.team_id !== session.team_id) E.fail('Archive not found.', 404);
    const download = new URL(req.url).searchParams.has('download') ? media.name : undefined;
    const { data, error } = await mediaStorage().createSignedUrl(media.storage_path, 60, { download });
    if (error || !data?.signedUrl) E.fail('Media unavailable.', 404);
    return new Response(null, { status: 302, headers: { Location: data.signedUrl, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
} catch (e) { return err(e); } }

export async function POST(req: Request) { try {
    checkOrigin(req);
    const session = await E.requireSession(req);
    if (session.role !== 'team') E.fail('Investigator session required.', 403);
    const settings = (await E.settings()).value;
    E.running(settings);
    await E.rate('upload:' + session.team_id, 8);
    const body: any = await E.readJson(req);
    const name = String(body.name || '').trim();
    const size = Number(body.size);
    const ext = name.split('.').pop()?.toLowerCase();
    const types: Record<string, string> = { mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };
    if (!name || name.length > 180 || !Number.isSafeInteger(size) || size < 1 || size > settings.maxUploadMB * 1024 * 1024) E.fail('Choose a media file within the configured upload limit.');
    if (!ext || !types[ext]) E.fail('Use MP3, WAV, M4A, MP4, WEBM or MOV.');
    const expired = await E.all('SELECT storage_path FROM media_upload_intents WHERE team_id=? AND expires<?', session.team_id, Date.now());
    const expiredPaths = expired.map((item: any) => item.storage_path);
    if (expiredPaths.length) {
        const { error } = await mediaStorage().remove(expiredPaths);
        if (error) throw error;
    }
    const intent = await E.reserveMediaUpload(session.team_id, name, types[ext], size);
    const { data, error } = await mediaStorage().createSignedUploadUrl(intent.path, { upsert: false });
    if (error || !data) {
        await E.stmt('DELETE FROM media_upload_intents WHERE id=?', intent.id).run();
        throw error || new Error('Could not authorize the media upload.');
    }
    return Response.json({ id: intent.id, path: data.path, token: data.token }, { headers: { 'Cache-Control': 'no-store' } });
} catch (e) { return err(e); } }

export async function DELETE(req: Request) { try {
    checkOrigin(req);
    const session = await E.requireSession(req);
    if (session.role !== 'team') E.fail('Investigator session required.', 403);
    const settings = (await E.settings()).value;
    E.running(settings);
    const media = await E.one('SELECT * FROM media WHERE id=?', new URL(req.url).searchParams.get('id'));
    if (!media || media.team_id !== session.team_id) E.fail('Archive not found.', 404);
    const team = await E.team(session.team_id);
    if (team.state.submittedAt) E.fail('Submitted media is locked.', 409);
    const { error } = await mediaStorage().remove([media.storage_path]);
    if (error) throw error;
    await E.db().batch([E.stmt('DELETE FROM media WHERE id=?', media.id), E.logStatement(team.code, team.id, 'MEDIA DELETED', media.name)]);
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
} catch (e) { return err(e); } }
