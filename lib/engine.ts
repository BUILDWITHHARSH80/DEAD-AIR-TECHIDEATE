import { env } from 'cloudflare:workers';
import { initialDocuments, initialChallenges, defaultSettings, freshState, fragments, timeline } from './story';
import { prepareArchiveState } from './archive-access';
export const db = () => { if (!env.DB)
    throw new Error('Archive database unavailable.'); return env.DB; };
export const bucket = () => { if (!env.BUCKET)
    throw new Error('Media archive unavailable.'); return env.BUCKET; };
export const stmt = (sql: string, ...args: any[]) => db().prepare(sql).bind(...args);
export const one = (sql: string, ...args: any[]) => stmt(sql, ...args).first<any>();
export const all = async (sql: string, ...args: any[]) => (await stmt(sql, ...args).all<any>()).results;
export const uuid = () => crypto.randomUUID();
export async function readJson(req: Request) {
    if (!req.body) fail('Request body required.');
    const reader = req.body.getReader();
    let size = 0;
    let text = '';
    const decoder = new TextDecoder();
    while (true) {
        const {value, done} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 100000) { await reader.cancel(); fail('Request too large.', 413); }
        text += decoder.decode(value, {stream:true});
    }
    try { const value = JSON.parse(text + decoder.decode()); if(!value || typeof value !== 'object' || Array.isArray(value)) fail('Invalid request.'); return value; }
    catch { fail('Invalid request JSON.'); }
}
export function fail(message: string, status = 400): never { throw Object.assign(new Error(message), { status }); }
;
export async function hash(value: string, salt = uuid()) { const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(value), 'PBKDF2', false, ['deriveBits']); const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256); return salt + ':' + Array.from(new Uint8Array(bits)).map(v => v.toString(16).padStart(2, '0')).join(''); }
export async function verify(value: string, stored: string) { const result = await hash(value, stored.split(':')[0]); let diff = result.length ^ stored.length; for (let i = 0; i < result.length; i++)
    diff |= result.charCodeAt(i) ^ stored.charCodeAt(i); return diff === 0; }
export async function digest(s: string) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map(v => v.toString(16).padStart(2, '0')).join(''); }
export async function rate(key: string, max = 15) { const id = await digest(key + ':' + Math.floor(Date.now() / 60000)); await stmt('INSERT INTO limits(id,count,expires) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1', id, Date.now() + 120000).run(); const v = await one('SELECT count FROM limits WHERE id=?', id); if (v.count > max)
    fail('SIGNAL THROTTLED. Wait one minute and try again.', 429); }
export async function session(req: Request) { const token = req.headers.get('cookie')?.match(/(?:^|; )meridian=([^;]+)/)?.[1]; if (!token)
    return null; return one('SELECT role,team_id FROM sessions WHERE id=? AND expires>?', await digest(token), Date.now()); }
export async function requireSession(req: Request, admin = false) { const s = await session(req); if (!s)
    fail('Investigator session expired. Sign in again.', 401); if (admin && s.role !== 'admin')
    fail('CONTROL ROOM ACCESS DENIED.', 403); return s; }
export async function settings() { const row = await one('SELECT * FROM settings WHERE id=?', 'event'); if (!row)
    fail('STATION NOT COMMISSIONED. Ask event control to initialise the archive.', 503); const value = JSON.parse(row.value); if (value.status === 'SCHEDULED' && Date.now() >= value.startedAt)
    value.status = 'RUNNING'; return { ...row, value }; }
export function remaining(c: any) { return Math.max(0, c.status === 'RUNNING' ? Math.ceil((c.endsAt - Date.now()) / 1000) : c.remaining); }
export function running(c: any) { if (c.status !== 'RUNNING' || remaining(c) <= 0)
    fail('TRANSMISSION WINDOW CLOSED. Progress is preserved; new changes are paused.', 409); }
export async function team(id: string) { const t = await one('SELECT * FROM teams WHERE id=?', id); if (!t)
    fail('Team not found.', 404); t.state = prepareArchiveState(JSON.parse(t.state)); return t; }
export function logStatement(actor: string, teamId: string | null, action: string, detail = '') { return stmt('INSERT INTO activity(id,team_id,actor,action,detail,created_at) VALUES(?,?,?,?,?,?)', uuid(), teamId, actor, action, detail, Date.now()); }
export async function saveTeam(t: any, actor: string, action: string, detail = '') { const result = await db().batch([stmt('UPDATE teams SET state=?,name=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?', JSON.stringify(t.state), t.name, Date.now(), t.id, t.revision), logStatement(actor, t.id, action, detail)]); if (!result[0].meta.changes)
    fail('State changed at another terminal. Try again.', 409); }
export function publicTeam(t: any) { const s = t.state; return { id: t.id, code: t.code, name: t.name, updatedAt: t.updated_at, state: s, revision: t.revision }; }
export function progress(s: any) { return Math.round((Object.values(s.challenges).filter((x: any) => x.status === 'COMPLETED').length + Object.keys(s.unlocks).length + (s.broadcast ? 2 : 0) + (s.truth ? 2 : 0)) / 20 * 100); }
export async function commission() { if (await one('SELECT id FROM settings WHERE id=?', 'event'))
    return null; const rows: any[] = []; const now = Date.now(); for (let i = 1; i <= 40; i++) {
    const code = 'TEAM ' + String(i).padStart(2, '0');
    const access = uuid().replaceAll('-', '').slice(0, 12);
    rows.push({ id: uuid(), code, name: code, access, password: await hash(access) });
} const statements = [stmt('INSERT INTO settings(id,value) VALUES(?,?)', 'event', JSON.stringify(defaultSettings)), ...rows.map(t => stmt('INSERT INTO teams(id,code,name,password,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?)', t.id, t.code, t.name, t.password, JSON.stringify(freshState()), now, now)), ...initialDocuments.map(d => { const { passkey, ...data } = d; return stmt('INSERT INTO documents(id,data,passkey) VALUES(?,?,?)', d.id, JSON.stringify(data), passkey); }), ...initialChallenges.map(c => stmt('INSERT INTO challenges(id,data) VALUES(?,?)', c.id, JSON.stringify(c))), logStatement('admin', null, 'COMMISSION', '40 teams, 8 documents and 8 stations seeded')]; await db().batch(statements); return rows.map(({ code, name, access }) => ({ code, name, access })); }
export async function snapshot(s: any, teamId?: string) {
    const conf = (await settings()).value;
    const docs = (await all('SELECT * FROM documents')).map(d => ({ ...JSON.parse(d.data), passkey: d.passkey }));
    const challenges = (await all('SELECT * FROM challenges')).map(c => JSON.parse(c.data));
    const admin = s.role === 'admin';
    const chosen = !admin || teamId ? await team(admin ? teamId! : s.team_id) : null;
    const st = chosen?.state;
    const list = admin || conf.leaderboard ? await all('SELECT id,code,name,state,updated_at,revision FROM teams') : [];
    const teams = list.map(t => { t.state = prepareArchiveState(JSON.parse(t.state)); return t; });
    const ranks = teams.map(t => ({ id: t.id, code: t.code, name: t.name, progress: progress(t.state), broadcast: t.state.broadcast, truth: t.state.truth, accuracy: t.state.accuracy, finishedAt: t.state.finishedAt, score: Math.max(0, t.state.accuracy + progress(t.state) - (conf.hintPenalty ? t.state.hints.reduce((a: number, h: any) => a + h.cost, 0) : 0)), objectives: Number(t.state.broadcast) + Number(t.state.truth) })).sort((a, b) => b.objectives - a.objectives || b.accuracy - a.accuracy || ((a.objectives === 2 && b.objectives === 2) ? a.finishedAt - b.finishedAt : b.progress - a.progress) || b.score - a.score || a.code.localeCompare(b.code));
    return {
        ending: st?.broadcast && st?.truth && ['01', '02', '03', '04'].every(id => st.unlocks[id]) ? 'Adrian Vale deliberately interrupted the broadcast and entered Room Zero. ECHO isolated the distribution buses. Their actions kept the Ghost Carrier from propagating beyond Meridian.' : undefined,
        admin, now: Date.now(),
        settings: { ...conf, remaining: remaining(conf), status: conf.status === 'RUNNING' && remaining(conf) === 0 ? 'ENDED' : conf.status },
        team: chosen ? { ...publicTeam(chosen), state: admin ? st : { ...st, notes: undefined, flag: undefined } } : null,
        teams: admin ? teams.map(publicTeam) : undefined,
        documents: docs.map(d => {
            const approved = !!st?.archiveApprovals[d.id];
            const decrypted = approved && !!st?.unlocks[d.id];
            const { id, title, subtitle, classification, description } = d;
            return admin || decrypted ? { ...d, passkey: admin ? d.passkey : undefined, approved, unlockedAt: st?.unlocks[d.id] } : { id, title, subtitle, classification, description, approved };
        }),
        // Passkeys are handed out physically; never send them to participant sessions.
        challenges: challenges.map(c => ({ ...c, passkey: admin ? docs.find(d => d.id === c.document)?.passkey : undefined })),
        media: await all(admin && !chosen ? 'SELECT * FROM media ORDER BY created_at DESC' : 'SELECT * FROM media WHERE team_id=? ORDER BY created_at DESC', ...(!admin || chosen ? [chosen.id] : [])),
        activity: await all(admin ? 'SELECT * FROM activity ORDER BY created_at DESC LIMIT 150' : "SELECT * FROM activity WHERE team_id=? AND action NOT IN ('NOTE','FLAG') ORDER BY created_at DESC LIMIT 60", ...(admin ? [] : [chosen.id])),
        leaderboard: ranks,
        fragments: admin || st?.unlocks['04'] ? [...fragments].sort((a, b) => ['f4', 'f2', 'f7', 'f1', 'f5', 'f3', 'f6'].indexOf(a.id) - ['f4', 'f2', 'f7', 'f1', 'f5', 'f3', 'f6'].indexOf(b.id)) : [],
        timeline: admin || st?.unlocks['04'] ? [timeline[5], timeline[2], timeline[8], timeline[0], timeline[6], timeline[3], timeline[1], timeline[7], timeline[4]] : []
    };
}
export async function echo(st: any, q: string) {
    let current = ['04', '03', '02', '01'].find(i => st.unlocks[i]);
    if (!current) return 'I do not have authorization to discuss the final broadcast. Recover Broadcast File 01.';
    if (/where|adrian|departure/i.test(q) && st.unlocks['03']) current = '03';
    else if (/carrier|signal|frequency/i.test(q) && st.unlocks['02']) current = '02';
    else if (/02:13|time|ended/i.test(q) && st.unlocks['01']) current = '01';
    const source = await one('SELECT data FROM documents WHERE id=?', current);
    return JSON.parse(source.data).echo;
}
export function scoreTheory(answers: string[], weights: number[]) { const tests = [/adrian\s+vale/i, /(intentional|deliberat|manual|cut|interrupt)/i, /(embed|hidden|repeat).*(signal|carrier|transmission)|(signal|carrier).*(embed|hidden|repeat)/i, /(contain|isolat).*(bus|station|broadcast|distribution|shut)|(echo).*(contain|isolat)/i, /room\s*(zero|0)/i, /(spread|propagat|relay|reproduc)/i, /(contain|isolat).*(blackout|silenc|shutdown|shut|bus)|(blackout|silenc|shutdown).*(contain|isolat)/i]; return answers.reduce((sum, a, i) => sum + (tests[i].test(a) ? weights[i] : 0), 0); }