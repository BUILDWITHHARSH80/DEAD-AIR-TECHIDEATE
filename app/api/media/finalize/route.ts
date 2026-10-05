import * as E from '@/lib/engine';
import { mediaStorage } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const types: Record<string, string> = { mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };
const err = (e: any) => Response.json({ error: e.status ? e.message : 'MEDIA ARCHIVE INTERRUPTED. Try again.' }, { status: e.status || 503, headers: { 'Cache-Control': 'no-store' } });
function checkOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return;
  let host = '';
  try { host = new URL(origin).host.toLowerCase(); } catch { E.fail('Origin rejected.', 403); }
  const expected = (req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host).split(',')[0].trim().toLowerCase();
  if (host !== expected && host !== process.env.VERCEL_URL?.toLowerCase()) E.fail('Origin rejected.', 403);
}

function hasSignature(mime: string, bytes: Uint8Array) {
  const ascii = (start: number, length: number) => String.fromCharCode(...bytes.slice(start, start + length));
  if (mime === 'audio/mpeg') return ascii(0, 3) === 'ID3' || bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
  if (mime === 'audio/wav') return ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WAVE';
  if (mime === 'audio/mp4' || mime === 'video/mp4' || mime === 'video/quicktime') return ascii(4, 4) === 'ftyp';
  if (mime === 'video/webm') return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  return false;
}

async function readHeader(url: string) {
  const response = await fetch(url, { headers: { Range: 'bytes=0-31' }, cache: 'no-store' });
  if (!response.ok || !response.body) E.fail('Uploaded media could not be verified.', 422);
  const reader = response.body.getReader();
  let bytes = new Uint8Array();
  try {
    while (bytes.length < 32) {
      const part = await reader.read();
      if (part.done) break;
      const next = new Uint8Array(bytes.length + part.value.length);
      next.set(bytes);
      next.set(part.value, bytes.length);
      bytes = next;
    }
  } finally { await reader.cancel().catch(() => undefined); }
  return bytes;
}

export async function POST(req: Request) {
  let intent: any;
  let teamId = '';
  try {
    checkOrigin(req);
    const session = await E.requireSession(req);
    if (session.role !== 'team') E.fail('Investigator session required.', 403);
    teamId = session.team_id;
    const body: any = await E.readJson(req);
    const id = String(body.id || '');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) E.fail('Invalid upload reference.');
    const existing = await E.one('SELECT id FROM media WHERE id=? AND team_id=?', id, teamId);
    if (existing) return Response.json({ id, status: 'ARCHIVED' }, { headers: { 'Cache-Control': 'no-store' } });
    intent = await E.one('SELECT * FROM media_upload_intents WHERE id=? AND team_id=? AND expires>?', id, teamId, Date.now());
    if (!intent) E.fail('Upload request expired. Select the file again.', 410);
    const settings = (await E.settings()).value;
    E.running(settings);
    if (Number(intent.size) > settings.maxUploadMB * 1024 * 1024) E.fail('File exceeds the configured upload limit.', 413);
    const team = await E.team(teamId);
    if (team.state.submittedAt) E.fail('Media is locked after final submission.', 409);

    const { data: info, error: infoError } = await mediaStorage().info(intent.storage_path);
    if (infoError || !info?.metadata) E.fail('Uploaded media is missing.', 404);
    if (Number(info.metadata.size) !== Number(intent.size) || Number(info.metadata.size) > settings.maxUploadMB * 1024 * 1024) E.fail('Uploaded file size did not match the approved request.', 413);
    const { data: signed, error: signError } = await mediaStorage().createSignedUrl(intent.storage_path, 60);
    if (signError || !signed?.signedUrl) E.fail('Uploaded media could not be verified.', 422);
    const header = await readHeader(signed.signedUrl);
    if (!hasSignature(intent.mime, header)) E.fail('File signature does not match a supported audio or video format.', 422);
    if (!Object.values(types).includes(intent.mime)) E.fail('Unsupported media type.');

    await E.db().transaction(async tx => {
      const currentIntent = await tx.one('SELECT id FROM media_upload_intents WHERE id=? AND team_id=? AND expires>? FOR UPDATE', id, teamId, Date.now());
      if (!currentIntent) E.fail('Upload request expired. Select the file again.', 410);
      const currentTeam = await tx.one('SELECT state FROM teams WHERE id=? FOR UPDATE', teamId);
      if (!currentTeam) E.fail('Team not found.', 404);
      if (E.parseJson(currentTeam.state).submittedAt) E.fail('Media is locked after final submission.', 409);
      await tx.run(E.stmt('INSERT INTO media(id,team_id,name,mime,size,status,storage_path) VALUES(?,?,?,?,?,?,?)', id, teamId, intent.name, intent.mime, intent.size, 'ARCHIVED', intent.storage_path));
      await tx.run(E.logStatement(team.code, teamId, 'MEDIA UPLOADED', intent.name));
      await tx.run(E.stmt('DELETE FROM media_upload_intents WHERE id=?', id));
    }, 'media');

    intent = undefined;
    return Response.json({ id, status: 'ARCHIVED' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    if (intent) {
      const stored = await E.one('SELECT id FROM media WHERE id=? AND team_id=?', intent.id, teamId).catch(() => undefined);
      if (stored) return Response.json({ id: intent.id, status: 'ARCHIVED' }, { headers: { 'Cache-Control': 'no-store' } });
      await mediaStorage().remove([intent.storage_path]).catch(() => undefined);
      await E.stmt('DELETE FROM media_upload_intents WHERE id=?', intent.id).run().catch(() => undefined);
    }
    return err(e);
  }
}
