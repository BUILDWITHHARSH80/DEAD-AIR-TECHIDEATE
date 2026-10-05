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
    const s = await E.requireSession(req);
    const m = await E.one('SELECT * FROM media WHERE id=?', new URL(req.url).searchParams.get('id'));
    if (!m || s.role !== 'admin' && m.team_id !== s.team_id) E.fail('Archive not found.', 404);
    const { data, error } = await mediaStorage().download(m.storage_path);
    if (error || !data) E.fail('Media unavailable.', 404);
    return new Response(data, { headers: { 'Content-Type': m.mime, 'Content-Length': String(m.size), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': `${new URL(req.url).searchParams.has('download') ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(m.name)}` } });
} catch (e) { return err(e); } }

export async function POST(req: Request) { try {
    checkOrigin(req);
    const s = await E.requireSession(req);
    if (s.role !== 'team') E.fail('Investigator session required.', 403);
    const c = (await E.settings()).value;
    E.running(c);
    await E.rate('upload:' + s.team_id, 8);
    const t = await E.team(s.team_id);
    if (t.state.submittedAt) E.fail('Media is locked after final submission. Ask a marshal to review it.', 409);
    const max = c.maxUploadMB * 1024 * 1024;
    if (Number(req.headers.get('content-length') || 0) > max + 8192) E.fail('File exceeds the configured upload limit.', 413);
    const count = await E.one('SELECT count(*) AS n FROM media WHERE team_id=?', s.team_id);
    if (Number(count.n) >= 12) E.fail('Archive holds at most 12 fragments per team. Remove one before uploading.');
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File) || !file.size || file.size > max) E.fail('Choose a media file within the upload limit.');
    const ext = file.name.split('.').pop()?.toLowerCase();
    const types: Record<string, string> = { mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };
    if (!ext || !types[ext]) E.fail('Use MP3, WAV, M4A, MP4, WEBM or MOV.');
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const magic = head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33 || head[0] === 0xff && (head[1] & 0xe0) === 0xe0 || new TextDecoder().decode(head).startsWith('RIFF') || new TextDecoder().decode(head.slice(4, 8)) === 'ftyp' || new TextDecoder().decode(head).startsWith('WEBM');
    if (!magic) E.fail('File signature does not match supported audio or video media.');
    const id = E.uuid();
    const path = `${s.team_id}/${id}`;
    const { error: uploadError } = await mediaStorage().upload(path, file, { contentType: types[ext], upsert: false });
    if (uploadError) throw uploadError;
    try {
        await E.db().batch([E.stmt('INSERT INTO media(id,team_id,name,mime,size,status,storage_path) VALUES(?,?,?,?,?,?,?)', id, s.team_id, file.name.slice(0, 180), types[ext], file.size, 'ARCHIVED', path), E.logStatement(t.code, t.id, 'MEDIA UPLOADED', file.name.slice(0, 180))]);
    } catch (e) {
        await mediaStorage().remove([path]);
        throw e;
    }
    return Response.json({ id, status: 'ARCHIVED' }, { headers: { 'Cache-Control': 'no-store' } });
} catch (e) { return err(e); } }

export async function DELETE(req: Request) { try {
    checkOrigin(req);
    const s = await E.requireSession(req);
    if (s.role !== 'team') E.fail('Investigator session required.', 403);
    const c = (await E.settings()).value;
    E.running(c);
    const m = await E.one('SELECT * FROM media WHERE id=?', new URL(req.url).searchParams.get('id'));
    if (!m || m.team_id !== s.team_id) E.fail('Archive not found.', 404);
    const t = await E.team(s.team_id);
    if (t.state.submittedAt) E.fail('Submitted media is locked.', 409);
    const { error } = await mediaStorage().remove([m.storage_path]);
    if (error) throw error;
    await E.db().batch([E.stmt('DELETE FROM media WHERE id=?', m.id), E.logStatement(t.code, t.id, 'MEDIA DELETED', m.name)]);
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
} catch (e) { return err(e); } }
