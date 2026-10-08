import 'server-only';
import * as E from '../services/game-engine';
import { freshState, fragments, timeline } from '../story/story-data';
import { revokeArchiveAccess } from '../../shared/archive-access';
import { mediaStorage } from '../config/supabase-admin';
import { adminPassword, deploymentHost } from '../config/environment';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const json = (v: any, status = 200, headers: any = {}) => Response.json(v, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
const error = (e: any) => { console.error('Meridian request failed', e.status || 500); return json({ error: e.status ? e.message : 'ARCHIVE CONNECTION INTERRUPTED. Your saved progress is preserved.' }, e.status || 503); };
function checkOrigin(req: Request) {
    const origin = req.headers.get('origin');
    if (!origin) return;
    let originHost = '';
    try { originHost = new URL(origin).host.toLowerCase(); } catch { E.fail('Origin rejected.', 403); }
    const requestHost = (req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host).split(',')[0].trim().toLowerCase();
    const vercelHost = deploymentHost();
    if (originHost !== requestHost && originHost !== vercelHost) E.fail('Origin rejected.', 403);
}
function secureRequest(req: Request) { return req.headers.get('x-forwarded-proto')?.split(',')[0].trim() === 'https' || new URL(req.url).protocol === 'https:'; }
export async function GET(req: Request) { try {
    const s = await E.requireSession(req);
    return json(await E.snapshot(s, new URL(req.url).searchParams.get('team') || undefined));
}
catch (e) {
    return error(e);
} }
export async function POST(req: Request) {
    try {
        checkOrigin(req);
        if (Number(req.headers.get('content-length') || 0) > 100000)
            E.fail('Request too large.', 413);
        const b: any = await E.readJson(req);
        const action = String(b.action || '');
        if (action === 'login') {
            const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
            await E.rate('login:' + clientIp, 240);
            await E.rate('account:' + String(b.admin ? b.username : b.code) + ':' + clientIp, 12);
            let role = 'team', teamId = null;
            const admin = b.admin === true;
            if (admin) {
                const password = adminPassword();
                if (!password)
                    E.fail('Control room credentials have not been configured.', 503);
<<<<<<< Updated upstream
                const supplied = String(b.password || '');
                if (String(b.username) !== 'control' || supplied !== password)
=======
                const supplied = await E.digest(String(b.password || ""));
                if (String(b.username) !== "control" || supplied !== await E.digest(password))
>>>>>>> Stashed changes
                    E.fail('ACCESS DENIED. Check your control room credentials.', 401);
                role = 'admin';
            }
            else {
                const canonical = E.normalizeTeamCode(b.code);
                const t = await E.one('SELECT * FROM teams WHERE code=?', canonical);
                if (!t || String(b.name || '').trim().toLowerCase() !== t.name.toLowerCase() || !await E.verify(String(b.password || ''), t.password))
                    E.fail('ACCESS DENIED. Check your team ID, name and access code.', 401);
                teamId = t.id;
            }
            const token = E.uuid() + E.uuid();
            await E.stmt('INSERT INTO sessions(id,role,team_id,expires) VALUES(?,?,?,?)', await E.digest(token), role, teamId, Date.now() + 12 * 3600000).run();
            await E.stmt('DELETE FROM limits WHERE expires<?', Date.now()).run();
            return json({ admin: role === 'admin' }, 200, { 'Set-Cookie': `meridian=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secureRequest(req) ? '; Secure' : ''}` });
        }
        const s = await E.requireSession(req);
        if (action === 'logout') {
            const token = req.headers.get('cookie')?.match(/(?:^|; )meridian=([^;]+)/)?.[1] || '';
            await E.stmt('DELETE FROM sessions WHERE id=?', await E.digest(token)).run();
            return json({ ok: true }, 200, { 'Set-Cookie': `meridian=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secureRequest(req) ? '; Secure' : ''}` });
        }
        if (action === 'commission') {
            if (s.role !== 'admin')
                E.fail('ACCESS DENIED.', 403);
            return json({ credentials: await E.commission() });
        }
        await E.rate('action:' + (s.team_id || 'admin'), 80);
        const c = await E.settings();
        if (action.startsWith('admin.')) {
            if (s.role !== 'admin')
                E.fail('CONTROL ROOM ACCESS DENIED.', 403);
            if (action === 'admin.addTeams') {
                const credentials = await E.addTeams(b.teams);
                return json({ credentials });
            }
            if (action === 'admin.event') {
                const v = c.value;
                const mode = b.mode;
                if (mode === 'schedule') {
                    const start = Number(b.start), end = Number(b.end);
                    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 86400000 || end < Date.now())
                        E.fail('Choose a future transmission window of up to 24 hours.');
                    v.startedAt = start;
                    v.endsAt = end;
                    v.duration = Math.floor((end - start) / 1000);
                    v.remaining = v.duration;
                    v.status = 'SCHEDULED';
                }
                else if (mode === 'start' || mode === 'restart') {
                    v.remaining = v.duration;
                    v.startedAt = Date.now();
                    v.endsAt = Date.now() + v.remaining * 1000;
                    v.status = 'RUNNING';
                }
                else if (mode === 'pause') {
                    v.remaining = E.remaining(v);
                    v.status = 'PAUSED';
                }
                else if (mode === 'resume') {
                    v.endsAt = Date.now() + v.remaining * 1000;
                    v.status = 'RUNNING';
                }
                else if (mode === 'extend') {
                    const seconds = Number(b.seconds);
                    if (!Number.isFinite(seconds) || seconds < 1 || seconds > 86400)
                        E.fail('Choose an extension between 1 second and 24 hours.');
                    v.remaining = E.remaining(v) + seconds;
                    if (v.status === 'RUNNING')
                        v.endsAt = Date.now() + v.remaining * 1000;
                }
                else if (mode === 'end') {
                    v.remaining = 0;
                    v.status = 'ENDED';
                }
                else
                    E.fail('Unknown timer command.');
                const result = await E.db().batch([E.stmt('UPDATE settings SET value=?::jsonb,revision=revision+1 WHERE id=? AND revision=?', JSON.stringify(v), 'event', c.revision), E.logStatement('admin', null, 'EVENT ' + mode)]);
                if (!result[0].meta.changes)
                    E.fail('Timer changed elsewhere. Retry.', 409);
                return json({ ok: true });
            }
            if (action === 'admin.settings') {
                const v = { ...c.value };
                for (const key of ['name', 'announcement'])
                    if (key in b.value)
                        v[key] = String(b.value[key]).slice(0, 1000);
                for (const key of ['leaderboard', 'hintPenalty', 'requireApproval'])
                    if (key in b.value)
                        v[key] = !!b.value[key];
                for (const [key, min, max] of [['duration', 60, 86400], ['hintCost', 0, 100], ['threshold', 1, 100], ['maxUploadMB', 1, 50], ['requiredUploads', 0, 10]] as any) {
                    if (key in b.value) {
                        const n = Number(b.value[key]);
                        if (!Number.isFinite(n) || n < min || n > max)
                            E.fail('Invalid setting: ' + key);
                        v[key] = n;
                    }
                }
                if (b.value.weights) {
                    if (b.value.weights.length !== 7 || b.value.weights.some((n: any) => !Number.isFinite(n) || n < 0) || b.value.weights.reduce((a: number, n: number) => a + n, 0) !== 100)
                        E.fail('Seven scoring weights must sum to 100.');
                    v.weights = b.value.weights;
                }
                await E.db().batch([E.stmt('UPDATE settings SET value=?::jsonb,revision=revision+1 WHERE id=?', JSON.stringify(v), 'event'), E.logStatement('admin', null, 'SETTINGS UPDATED')]);
                return json({ ok: true });
            }
            if (action === 'admin.document') {
                const row = await E.one('SELECT * FROM documents WHERE id=?', b.id);
                if (!row)
                    E.fail('File not found.', 404);
                const d = E.parseJson(row.data);
                for (const key of ['title', 'subtitle', 'description', 'content', 'classification', 'question', 'echo'])
                    if (key in b.value)
                        d[key] = String(b.value[key]).slice(0, 20000);
                const passkey = String(b.value.passkey ?? row.passkey).trim();
                if (!/^\d{4}$/.test(passkey))
                    E.fail('Passkeys must contain four digits.');
                await E.db().batch([E.stmt('UPDATE documents SET data=?::jsonb,passkey=? WHERE id=?', JSON.stringify(d), passkey, b.id), E.logStatement('admin', null, 'DOCUMENT UPDATED', b.id)]);
                return json({ ok: true });
            }
            if (action === 'admin.challenge') {
                const row = await E.one('SELECT * FROM challenges WHERE id=?', b.id);
                if (!row)
                    E.fail('Station not found.', 404);
                const v = E.parseJson(row.data);
                if (b.value.document && !await E.one('SELECT id FROM documents WHERE id=?', b.value.document))
                    E.fail('Unknown target document.');
                for (const key of ['name', 'description', 'instructions', 'document'])
                    if (key in b.value)
                        v[key] = String(b.value[key]).slice(0, 2000);
                if ('enabled' in b.value)
                    v.enabled = !!b.value.enabled;
                await E.db().batch([E.stmt('UPDATE challenges SET data=?::jsonb WHERE id=?', JSON.stringify(v), b.id), E.logStatement('admin', null, 'STATION UPDATED', b.id)]);
                return json({ ok: true });
            }
            if (action === 'admin.media') {
                const m = await E.one('SELECT * FROM media WHERE id=?', b.id);
                if (!m)
                    E.fail('Media not found.', 404);
                if (b.status === 'REMOVE') {
                    const { error } = await mediaStorage().remove([m.storage_path]);
                    if (error) throw error;
                    await E.db().batch([E.stmt('DELETE FROM media WHERE id=?', m.id), E.logStatement('admin', m.team_id, 'MEDIA REMOVED', m.name)]);
                }
                else {
                    if (!['APPROVED', 'REJECTED', 'USED', 'ARCHIVED'].includes(b.status))
                        E.fail('Invalid review status.');
                    await E.db().batch([E.stmt('UPDATE media SET status=?,note=? WHERE id=?', b.status, String(b.note || '').slice(0, 2000), m.id), E.logStatement('admin', m.team_id, 'MEDIA ' + b.status, m.name)]);
                }
                return json({ ok: true });
            }
            const t = await E.team(String(b.teamId));
            const st = t.state;
            if (action === 'admin.team') {
                const op = b.op;
                const extra: any[] = [];
                if (op === 'delete') {
                    if (b.confirm !== t.code) E.fail('Type the team ID to delete this team.');
                    const media = await E.all('SELECT storage_path FROM media WHERE team_id=?', t.id);
                    const paths = media.map((item: any) => item.storage_path).filter(Boolean);
                    if (paths.length) {
                        const { error } = await mediaStorage().remove(paths);
                        if (error) throw error;
                    }
                    await E.db().batch([E.stmt('DELETE FROM sessions WHERE team_id=?', t.id), E.stmt('DELETE FROM media WHERE team_id=?', t.id), E.stmt('DELETE FROM activity WHERE team_id=?', t.id), E.stmt('DELETE FROM teams WHERE id=?', t.id), E.logStatement('admin', null, 'TEAM DELETED', t.code)]);
                    return json({ ok: true });
                }
                if (op === 'setPassword') {
                    const access = String(b.accessCode ?? '').trim();
                    if (access.length < 8 || access.length > 64) E.fail('Access code must be 8–64 characters.');
                    await E.db().batch([E.stmt('UPDATE teams SET password=? WHERE id=?', await E.hash(access), t.id), E.stmt('DELETE FROM sessions WHERE team_id=?', t.id), E.logStatement('admin', t.id, 'ACCESS CODE SET')]);
                    return json({ ok: true });
                }
                if (op === 'challenge') {
                    const challenge = await E.one('SELECT data FROM challenges WHERE id=?', b.id);
                    if (!challenge)
                        E.fail('Unknown station.');
                    if (!['AVAILABLE', 'IN PROGRESS', 'COMPLETED', 'FAILED', 'LOCKED', 'DISABLED'].includes(b.status))
                        E.fail('Invalid station state.');
                    if (st.challenges[b.id]?.status === 'COMPLETED' && b.status === 'COMPLETED')
                        return json({ ok: true });
                    st.challenges[b.id] = { status: b.status, time: Date.now(), startedAt: st.challenges[b.id]?.startedAt || Date.now() };
                    if (b.status !== 'COMPLETED') {
                        const document = E.parseJson(challenge.data).document;
                        const stations = await E.all('SELECT data FROM challenges');
                        if (!stations.some(row => {
                            const station = E.parseJson(row.data);
                            return station.document === document && st.challenges[station.id]?.status === 'COMPLETED';
                        }) && (st.archiveApprovals[document] || st.unlocks[document])) {
                            revokeArchiveAccess(st, document);
                            extra.push(E.stmt('DELETE FROM file_unlocks WHERE team_id=? AND document_id=?', t.id, document));
                        }
                    }
                }
                else if (op === 'unlock') {
                    if (!await E.one('SELECT id FROM documents WHERE id=?', b.id))
                        E.fail('Unknown file.');
                    const stations = await E.all('SELECT data FROM challenges');
                    if (!stations.some(row => {
                        const station = E.parseJson(row.data);
                        return station.document === b.id && st.challenges[station.id]?.status === 'COMPLETED';
                    })) E.fail('Complete the associated challenge before approving passkey entry.', 409);
                    st.archiveApprovals[b.id] = Date.now();
                    extra.push(E.stmt('INSERT INTO file_unlocks(team_id,document_id,approved_at) VALUES(?,?,now()) ON CONFLICT(team_id,document_id) DO UPDATE SET approved_at=now()', t.id, b.id));
                }
                else if (op === 'lock') {
                    revokeArchiveAccess(st, b.id);
                    extra.push(E.stmt('DELETE FROM file_unlocks WHERE team_id=? AND document_id=?', t.id, b.id));
                }
                else if (op === 'hint') {
                    st.hints.push({ id: E.uuid(), level: 0, text: String(b.text || 'Review the station records.').slice(0, 2000), cost: 0, time: Date.now() });
                }
                else if (op === 'revokeHint') {
                    st.hints = st.hints.filter((h: any) => h.id !== b.id);
                }
                else if (op === 'note') {
                    st.notes.push({ text: String(b.text).slice(0, 2000), time: Date.now() });
                }
                else if (op === 'flag') {
                    st.flag = !!b.value;
                }
                else if (op === 'objective') {
                    if (!['broadcast', 'truth'].includes(b.id))
                        E.fail('Unknown objective.');
                    st[b.id] = !!b.value;
                    if (b.id === 'truth' && b.accuracy !== undefined) {
                        const accuracy = Number(b.accuracy);
                        if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100)
                            E.fail('Accuracy must be 0â€“100.');
                        st.accuracy = accuracy;
                    }
                    st.finishedAt = st.broadcast && st.truth ? (st.finishedAt || Date.now()) : 0;
                }
                else if (op === 'reset') {
                    if (b.confirm !== t.code)
                        E.fail('Type the team ID to reset.');
                    t.state = freshState();
                    extra.push(E.stmt('DELETE FROM file_unlocks WHERE team_id=?', t.id));
                }
                else if (op === 'rename') {
                    t.name = String(b.name).trim().slice(0, 80);
                    if (!t.name)
                        E.fail('Team name required.');
                }
                else if (op === 'access') {
                    const access = E.uuid().replaceAll('-', '').slice(0, 12);
                    await E.db().batch([E.stmt('UPDATE teams SET password=? WHERE id=?', await E.hash(access), t.id), E.stmt('DELETE FROM sessions WHERE team_id=?', t.id), E.logStatement('admin', t.id, 'ACCESS CODE ROTATED')]);
                    return json({ access });
                }
                else
                    E.fail('Unknown team command.');
                await E.saveTeam(t, 'admin', op === 'unlock' ? 'ARCHIVE APPROVED' : op === 'lock' ? 'ARCHIVE REVOKED' : op.toUpperCase(), String(b.id || b.text || ''), extra);
                return json({ ok: true });
            }
            E.fail('Unknown admin action.');
        }
        if (s.role !== 'team')
            E.fail('Use an investigator session for this action.', 403);
        // Opening an approved record is archive access, not a timed submission.
        if (action !== 'unlock') E.running(c.value);
        const t = await E.team(s.team_id);
        const st = t.state;
        if (action === 'unlock') {
            await E.rate('unlock:' + s.team_id, 8);
            const d = await E.one('SELECT * FROM documents WHERE id=?', b.id);
            if (!d) E.fail('File not found.', 404);
            if (!st.archiveApprovals[b.id])
                E.fail('ADMIN APPROVAL REQUIRED. Ask the marshal to approve passkey entry for this file.', 409);
            const stations = await E.all('SELECT data FROM challenges');
            if (!stations.some(row => {
                const station = E.parseJson(row.data);
                return station.document === b.id && st.challenges[station.id]?.status === 'COMPLETED';
            })) E.fail('MARSHAL VERIFICATION REQUIRED. The associated physical challenge has not been recorded for this team.', 409);
            const passkey = String(b.passkey ?? '').trim();
            if (!/^\d{4}$/.test(passkey) || passkey !== d.passkey)
                E.fail('PASSKEY REJECTED. Enter the four digits on the code given to your team by the marshal.');
            st.unlocks[b.id] ||= Date.now();
        }
        else if (action === 'echo') {
            const q = String(b.question || '').trim().slice(0, 500);
            if (!q)
                E.fail('Enter a question for ECHO.');
            st.messages.push({ id: E.uuid(), question: q, response: await E.echo(st, q), time: Date.now() });
            st.messages = st.messages.slice(-80);
        }
        else if (action === 'hint') {
            const level = Number(b.level);
            if (![1, 2, 3].includes(level))
                E.fail('Choose hint level 1, 2 or 3.');
            const knowledge = ['04', '03', '02', '01'].find(x => st.unlocks[x]) || '00';
            if (st.hints.some((h: any) => h.level === level && h.knowledge === knowledge))
                E.fail('This hint is already in your archive.');
            const clues: any = { '00': ['Visit a physical challenge station.', 'Start with the audio patch station.', 'Ask the station marshal for Broadcast File 01 access.'], '01': ['Compare programme and power records.', 'Study the fourteen seconds after the interruption.', 'Programme loss does not prove that the host left.'], '02': ['Follow the unlabelled bus.', 'Compare the internal route with the public plan.', 'Recover the facility access record.'], '03': ['Check the internal access records.', 'Look at the access attempt immediately after the broadcast.', 'The destination was not listed on the public map.'], '04': ['Separate two shutdown events.', 'Compare the manual cut and the containment timestamp.', 'Restore the warning, then explain how relaying the carrier could spread it.'] };
            st.hints.push({ id: E.uuid(), level, knowledge, text: clues[knowledge][level - 1], cost: c.value.hintPenalty ? c.value.hintCost * level : 0, time: Date.now() });
        }
        else if (action === 'members') {
            if (!Array.isArray(b.members) || b.members.length > 8)
                E.fail('Up to eight members are supported.');
            st.members = b.members.map((n: any) => String(n).trim().slice(0, 80)).filter(Boolean);
        }
        else if (action === 'draft' || action === 'submit') {
            if (!['01', '02', '03', '04'].every(id => st.unlocks[id]))
                E.fail('Recover all four main broadcast files first.');
            const v = b.value;
            if (!v || !Array.isArray(v.fragments) || !Array.isArray(v.timeline) || !Array.isArray(v.answers) || v.answers.length !== 7)
                E.fail('Incomplete reconstruction.');
            if (v.answers.some((a: any) => typeof a !== 'string' || a.length > 3000) || typeof v.explanation !== 'string' || v.explanation.length > 10000)
                E.fail('Theory exceeds archive limits.');
            const draft = { fragments: v.fragments, timeline: v.timeline, answers: v.answers, explanation: v.explanation };
            if (action === 'draft') {
                st.draft = draft;
            }
            else {
                if (st.broadcast && st.truth)
                    E.fail('Investigation is already complete.');
                if (v.answers.some((a: string) => a.trim().length < 8) || v.explanation.trim().length < 80)
                    E.fail('Answer all seven questions and include an explanation of at least 80 characters.');
                if (v.fragments.join(',') !== fragments.map(x => x.id).join(',') || v.timeline.join(',') !== timeline.map(x => x.id).join(','))
                    E.fail('RECONSTRUCTION INCOMPLETE. Review fragment order and timeline.');
                const m = await E.all('SELECT * FROM media WHERE team_id=?', t.id);
                const valid = m.filter(m => c.value.requireApproval ? ['APPROVED', 'USED'].includes(m.status) : m.status !== 'REJECTED');
                if (valid.length < c.value.requiredUploads)
                    E.fail('Required media is missing or awaiting marshal approval.');
                st.accuracy = E.scoreTheory(v.answers, c.value.weights);
                st.broadcast = true;
                st.truth = false;
                st.submittedAt = Date.now();
                st.submission = { ...draft, provisionalAccuracy: st.accuracy, review: 'PENDING' };
                st.draft = draft;
                st.messages.push({ id: E.uuid(), question: 'Final theory validation', response: `Reconstruction accepted. Provisional deduction score: ${st.accuracy}/100. A marshal will review the written evidence before confirming the truth objective.`, time: Date.now() });
            }
        }
        else
            E.fail('Unknown station action.');
        if (action !== 'unlock') E.running((await E.settings()).value);
        const extra = action === 'unlock' ? [E.stmt('UPDATE file_unlocks SET unlocked_at=coalesce(unlocked_at,now()) WHERE team_id=? AND document_id=? AND approved_at IS NOT NULL', t.id, b.id)] : [];
        await E.saveTeam(t, t.code, action.toUpperCase(), String(b.id || ''), extra);
        return json({ ok: true });
    }
    catch (e) {
        return error(e);
    }
}
