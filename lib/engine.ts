import { initialDocuments, initialChallenges, defaultSettings, freshState, fragments, timeline } from './story';
import { prepareArchiveState } from './archive-access';
import { db as postgresDb } from './postgres';
export const db = postgresDb;
export function parseJson(value: any) { return typeof value === 'string' ? JSON.parse(value) : value; }
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
    fail('STATION NOT COMMISSIONED. Ask event control to initialise the archive.', 503); const value = parseJson(row.value); if (value.status === 'SCHEDULED' && Date.now() >= value.startedAt)
    value.status = 'RUNNING'; return { ...row, value }; }
export function remaining(c: any) { return Math.max(0, c.status === 'RUNNING' ? Math.ceil((c.endsAt - Date.now()) / 1000) : c.remaining); }
export function running(c: any) { if (c.status !== 'RUNNING' || remaining(c) <= 0)
    fail('TRANSMISSION WINDOW CLOSED. Progress is preserved; new changes are paused.', 409); }
export async function hydrateArchiveState(state: any, teamId: string) {
    const next = prepareArchiveState(parseJson(state));
    delete next.unlocks;
    delete next.archiveApprovals;
    next.unlocks = {};
    next.archiveApprovals = {};
    const rows = await all('SELECT document_id,approved_at,unlocked_at FROM file_unlocks WHERE team_id=?', teamId);
    for (const row of rows) {
        if (row.approved_at) next.archiveApprovals[row.document_id] = row.approved_at;
        if (row.unlocked_at) next.unlocks[row.document_id] = row.unlocked_at;
    }
    return next;
}
export async function team(id: string) { const t = await one('SELECT * FROM teams WHERE id=?', id); if (!t)
    fail('Team not found.', 404); t.state = await hydrateArchiveState(t.state, id); return t; }
export function logStatement(actor: string, teamId: string | null, action: string, detail = '') { return stmt('INSERT INTO activity(team_id,actor,action,detail) VALUES(?,?,?,?)', teamId, actor, action, detail); }
export async function saveTeam(t: any, actor: string, action: string, detail = '', extra: any[] = []) {
    const stored = { ...t.state };
    delete stored.unlocks;
    delete stored.archiveApprovals;
    await db().transaction(async tx => {
        const update = await tx.run(stmt('UPDATE teams SET state=?::jsonb,name=?,revision=revision+1,updated_at=now() WHERE id=? AND revision=?', JSON.stringify(stored), t.name, t.id, t.revision));
        if (!update.meta.changes) fail('State changed at another terminal. Try again.', 409);
        for (const operation of extra) {
            const result = await tx.run(operation);
            if (/file_unlocks/i.test(operation.sql) && !result.meta.changes) fail('File approval or station state changed. Retry.', 409);
        }
        await tx.run(logStatement(actor, t.id, action, detail));
    });
    t.revision += 1;
    t.updated_at = Date.now();
}
export function publicTeam(t: any) { const s = t.state; return { id: t.id, code: t.code, name: t.name, updatedAt: t.updated_at, state: s, revision: t.revision }; }
export function progress(s: any) { return Math.round((Object.values(s.challenges).filter((x: any) => x.status === 'COMPLETED').length + Object.keys(s.unlocks).length + (s.broadcast ? 2 : 0) + (s.truth ? 2 : 0)) / 20 * 100); }
export async function leaderboardRows() {
    const rows = await all('SELECT * FROM leaderboard_v ORDER BY rank');
    return rows.map(row => ({
        ...row,
        finishedAt: 0,
        unlock_times: Object.fromEntries(Object.entries(row.unlock_times || {}).map(([id, value]) => [id, value ? new Date(String(value)).getTime() : null])),
    }));
}
export async function commission() { if (await one('SELECT id FROM settings WHERE id=?', 'event'))
    return null; const statements = [stmt('INSERT INTO settings(id,value) VALUES(?,?::jsonb)', 'event', JSON.stringify(defaultSettings)), ...initialDocuments.map(d => { const { passkey, ...data } = d; return stmt('INSERT INTO documents(id,data,passkey) VALUES(?,?::jsonb,?)', d.id, JSON.stringify(data), passkey); }), ...initialChallenges.map(c => stmt('INSERT INTO challenges(id,data) VALUES(?,?::jsonb)', c.id, JSON.stringify(c))), logStatement('admin', null, 'COMMISSION', '8 documents and 8 stations seeded; no teams registered')]; await db().batch(statements); return []; }
export function normalizeTeamCode(value: unknown) { let code = String(value ?? '').trim().toUpperCase().replace(/\s+/g, ' '); const numbered = code.match(/^TEAM\s*0?(\d+)$/); if (numbered) code = 'TEAM ' + String(Number(numbered[1])).padStart(2, '0'); return code; }
export async function addTeams(input: unknown) {
    if (!Array.isArray(input) || input.length < 1 || input.length > 100) fail('Register between 1 and 100 teams at a time.');
    const existing = await all('SELECT code,name FROM teams');
    const codes = new Set(existing.map((t: any) => normalizeTeamCode(t.code)));
    const names = new Set(existing.map((t: any) => String(t.name).trim().toLocaleLowerCase('en-US')));
    const prepared: any[] = [];
    for (let i = 0; i < input.length; i++) {
        const row: any = input[i]; const label = `Team ${i + 1}`;
        if (!row || typeof row !== 'object' || Array.isArray(row)) fail(`${label}: invalid row.`);
        const name = String(row.name ?? '').trim();
        if (!name || name.length > 80) fail(`${label}: name is required and must be at most 80 characters.`);
        if (names.has(name.toLocaleLowerCase('en-US'))) fail(`${label}: team name already exists (names must be unique, ignoring case).`);
        const explicit = row.code !== undefined && String(row.code).trim() !== '';
        let code = explicit ? normalizeTeamCode(row.code) : '';
        if (explicit && (!/^[A-Z0-9][A-Z0-9 _-]{1,31}$/.test(code) || !/[A-Z0-9]$/.test(code))) fail(`${label}: ID must be 2–32 characters using letters, numbers, spaces, hyphens or underscores.`);
        if (!explicit) { do { code = 'TEAM-' + uuid().replaceAll('-', '').slice(0, 12).toUpperCase(); } while (codes.has(code)); }
        if (codes.has(code)) fail(`${label}: team ID already exists.`);
        const supplied = row.accessCode !== undefined && String(row.accessCode).trim() !== '';
        const access = supplied ? String(row.accessCode).trim() : uuid().replaceAll('-', '').slice(0, 16);
        if (access.length < 8 || access.length > 64) fail(`${label}: access code must be 8–64 characters.`);
        codes.add(code); names.add(name.toLocaleLowerCase('en-US'));
        prepared.push({ id: uuid(), code, name, access, password: await hash(access) });
    }
    const statements = prepared.flatMap(t => [stmt('INSERT INTO teams(id,code,name,password,state) VALUES(?,?,?,?,?::jsonb)', t.id, t.code, t.name, t.password, JSON.stringify(freshState())), logStatement('admin', t.id, 'TEAM REGISTERED', t.code)]);
    await db().batch(statements);
    return prepared.map(({ id, code, name, access }) => ({ id, code, name, access }));
}
export async function snapshot(s: any, teamId?: string) {
    const conf = (await settings()).value;
    const docs = (await all('SELECT * FROM documents')).map(d => ({ ...parseJson(d.data), passkey: d.passkey }));
    const challenges = (await all('SELECT * FROM challenges')).map(c => parseJson(c.data));
    const admin = s.role === 'admin';
    const chosen = !admin || teamId ? await team(admin ? teamId! : s.team_id) : null;
    const st = chosen?.state;
    const list = admin ? await all('SELECT id,code,name,state,updated_at,revision FROM teams') : [];
    const teams = await Promise.all(list.map(async t => { t.state = await hydrateArchiveState(t.state, t.id); return t; }));
    const ranks = admin || conf.leaderboard ? await leaderboardRows() : [];
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
    return parseJson(source.data).echo;
}
export function scoreTheory(answers: string[], weights: number[]) { const tests = [/adrian\s+vale/i, /(intentional|deliberat|manual|cut|interrupt)/i, /(embed|hidden|repeat).*(signal|carrier|transmission)|(signal|carrier).*(embed|hidden|repeat)/i, /(contain|isolat).*(bus|station|broadcast|distribution|shut)|(echo).*(contain|isolat)/i, /room\s*(zero|0)/i, /(spread|propagat|relay|reproduc)/i, /(contain|isolat).*(blackout|silenc|shutdown|shut|bus)|(blackout|silenc|shutdown).*(contain|isolat)/i]; return answers.reduce((sum, a, i) => sum + (tests[i].test(a) ? weights[i] : 0), 0); }
