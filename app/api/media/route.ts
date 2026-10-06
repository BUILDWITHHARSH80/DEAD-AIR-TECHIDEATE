import * as E from '@/lib/engine';
export const dynamic = 'force-dynamic';
const err = (e: any) => Response.json({ error: e.status ? e.message : 'MEDIA ARCHIVE INTERRUPTED. Try again.' }, { status: e.status || 503 });
export async function GET(req: Request) { try {
    const s = await E.requireSession(req);
    const m = await E.one('SELECT * FROM media WHERE id=?', new URL(req.url).searchParams.get('id'));
    if (!m || s.role !== 'admin' && m.team_id !== s.team_id)
        E.fail('Archive not found.', 404);
    const object = await E.bucket().get(m.id);
    if (!object)
        E.fail('Media unavailable.', 404);
    return new Response(object.body, { headers: { 'Content-Type': m.mime, 'Content-Length': String(m.size), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': `${new URL(req.url).searchParams.has('download') ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(m.name)}` } });
}
catch (e) {
    return err(e);
} }
export async function POST(req: Request) { try {
    if (req.headers.get('origin') && req.headers.get('origin') !== new URL(req.url).origin)
        E.fail('Origin rejected.', 403);
    const s = await E.requireSession(req);
    if (s.role !== 'team')
        E.fail('Investigator session required.', 403);
    const c = (await E.settings()).value;
    E.running(c);
    await E.rate('upload:' + s.team_id, 8);
    const t = await E.team(s.team_id);
    if (t.state.submittedAt)
        E.fail('Media is locked after final submission. Ask a marshal to review it.', 409);
    const max = c.maxUploadMB * 1024 * 1024;
    if (Number(req.headers.get('content-length') || 0) > max + 8192)
        E.fail('File exceeds the configured upload limit.', 413);
    const count = await E.one('SELECT count(*) AS n FROM media WHERE team_id=?', s.team_id);
    if (count.n >= 12)
        E.fail('Archive holds at most 12 fragments per team. Remove one before uploading.');
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File) || !file.size || file.size > max)
        E.fail('Choose a media file within the upload limit.');
    const ext = file.name.split('.').pop()?.toLowerCase();
    const types: any = { mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };
    if (!ext || !types[ext])
        E.fail('Use MP3, WAV, M4A, MP4, WEBM or MOV.');
    const bytes = new Uint8Array(await file.slice(0, 24).arrayBuffer());
    const ascii = new TextDecoder().decode(bytes);
    const valid = ext === 'wav' ? ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WAVE' : ext === 'mp3' ? ascii.startsWith('ID3') || (bytes[0] === 255 && (bytes[1] & 224) === 224) : ext === 'webm' ? bytes[0] === 26 && bytes[1] === 69 && bytes[2] === 223 && bytes[3] === 163 : ascii.slice(4, 8) === 'ftyp' || (ext === 'mov' && ['moov', 'mdat', 'wide'].includes(ascii.slice(4, 8)));
    if (!valid)
        E.fail('TRANSMISSION FRAGMENT CORRUPTED. The file does not match its format.');
    const id = E.uuid();
    await E.bucket().put(id, file.stream(), { httpMetadata: { contentType: types[ext] } });
    try {
        E.running((await E.settings()).value);
        const latestTeam = await E.team(s.team_id);
        if (latestTeam.state.submittedAt) E.fail('Media is locked after final submission.', 409);
        await E.db().batch([E.stmt('INSERT INTO media(id,team_id,name,mime,size,status,created_at) VALUES(?,?,?,?,?,?,?)', id, s.team_id, file.name.slice(0, 180), types[ext], file.size, 'ARCHIVED', Date.now()), E.logStatement(t.code, t.id, 'MEDIA UPLOADED', file.name.slice(0, 180))]);
    }
    catch (e) {
        await E.bucket().delete(id);
        throw e;
    }
    return Response.json({ id, status: 'ARCHIVED' });
}
catch (e) {
    return err(e);
} }
export async function DELETE(req: Request) { try {
    if (req.headers.get('origin') && req.headers.get('origin') !== new URL(req.url).origin)
        E.fail('Origin rejected.', 403);
    const s = await E.requireSession(req);
    const c = (await E.settings()).value;
    E.running(c);
    const m = await E.one('SELECT * FROM media WHERE id=?', new URL(req.url).searchParams.get('id'));
    if (!m || m.team_id !== s.team_id)
        E.fail('Archive not found.', 404);
    const t = await E.team(s.team_id);
    if (t.state.submittedAt)
        E.fail('Submitted media is locked.', 409);
    await E.bucket().delete(m.id);
    await E.db().batch([E.stmt('DELETE FROM media WHERE id=?', m.id), E.logStatement(t.code, t.id, 'MEDIA DELETED', m.name)]);
    return Response.json({ ok: true });
}
catch (e) {
    return err(e);
} }