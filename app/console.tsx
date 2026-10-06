'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Radio, Lock, FileText, Activity, ChevronUp, ChevronDown, Volume2, VolumeX, ArrowRight, Check, Upload, Search } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Progress } from '@/components/ui/progress';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Toaster, toast } from 'sonner';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
type Any = any;
let browserSupabase: SupabaseClient | undefined;
function getBrowserSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    browserSupabase ??= createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
    return browserSupabase;
}
const clock = (n: number) => { const v = Math.max(0, Math.floor(n)); return [Math.floor(v / 3600), Math.floor(v / 60) % 60, v % 60].map(x => String(x).padStart(2, '0')).join(':'); };
const date = (t: number) => t ? new Date(t).toLocaleTimeString() : 'â€”';
const pct = (s: Any) => Math.round((Object.values(s.challenges).filter((x: Any) => x.status === 'COMPLETED').length + Object.keys(s.unlocks).length + (s.broadcast ? 2 : 0) + (s.truth ? 2 : 0)) / 20 * 100);
async function request(action: string, value: Any = {}) { const r = await fetch('/api/game', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...value }) }); const data: any = await r.json(); if (!r.ok)
    throw Error(data.error); return data; }
function Choice({ value, onChange, options, label }: Any) { return <Select value={String(value)} onValueChange={onChange}><SelectTrigger aria-label={label} className="choice"><SelectValue /></SelectTrigger><SelectContent>{options.map((o: Any) => <SelectItem key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>{typeof o === 'string' ? o : o.label}</SelectItem>)}</SelectContent></Select>; }
function Waveform() { return <div className="wave compact">{Array.from({ length: 65 }, (_, i) => <i key={i} style={{ height: Math.round(7 + Math.sin(i * 2.9) ** 2 * 75) + '%', animationDelay: (i * .04).toFixed(2) + 's' }}/>)}</div>; }
export default function Console() {
    const [path, setPath] = useState('');
    const [data, setData] = useState<Any>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState('');
    const [busy, setBusy] = useState(false);
    const [tab, setTab] = useState('case');
    const [now, setNow] = useState(Date.now());
    const [connected, setConnected] = useState(true);
    const [creds, setCreds] = useState<Any>(null);
    const [confirm, setConfirm] = useState<Any>(null);
    const [ambient, setAmbient] = useState(false);
    const audio = useRef<AudioContext | null>(null);
    const admin = path.startsWith('/admin');
    const login = path.endsWith('/login') || path === '/login';
    useEffect(() => { setPath(location.pathname); const t = location.pathname.split('/')[2]; if (t && t !== 'login')
        setTab(t);
    else if (location.pathname.startsWith('/admin'))
        setTab('teams'); }, []);
    const load = useCallback(async () => { if (!path) return; if (login) {
        setLoading(false);
        return;
    } try {
        const r = await fetch('/api/game' + (selected ? '?team=' + selected : ''), { cache: 'no-store' });
        const v: any = await r.json();
        if (r.status === 401) {
            location.href = admin ? '/admin/login' : '/login';
            return;
        }
        if (!r.ok)
            throw Error(v.error);
        if (admin && !v.admin) {
            location.href = '/participant/case';
            return;
        }
        let leaderboard = v.leaderboard || [];
        if (v.admin || v.settings.leaderboard) {
            const leaderboardResponse = await fetch('/api/leaderboard', { cache: 'no-store' });
            const leaderboardResult: any = leaderboardResponse.ok ? await leaderboardResponse.json() : null;
            leaderboard = leaderboardResult?.rows || v.leaderboard || [];
        }
        setData({ ...v, leaderboard });
        setError('');
    }
    catch (e: Any) {
        setConnected(false);
        setError(e.message);
    }
    finally {
        setLoading(false);
    } }, [path, login, selected, admin]);
    useEffect(() => {
        load();
        if (login || !path) return;
        let channelUp = false;
        let refreshTimer: ReturnType<typeof setTimeout> | undefined;
        let lastRefreshAt = 0;
        const client = getBrowserSupabase();
        const channel = client?.channel('meridian-event').on('broadcast', { event: 'change' }, () => {
            if (document.hidden || refreshTimer) return;
            const wait = Math.max(0, 1000 - (Date.now() - lastRefreshAt));
            refreshTimer = setTimeout(() => { refreshTimer = undefined; lastRefreshAt = Date.now(); void load(); }, wait);
        }).subscribe(status => {
            channelUp = status === 'SUBSCRIBED';
            setConnected(channelUp);
            if (channelUp && !document.hidden) void load();
        });
        if (!client) setConnected(false);
        const fallback = setInterval(() => { if (!document.hidden && !channelUp) void load(); }, 3000);
        const recovery = setInterval(() => { if (!document.hidden) void load(); }, 15000);
        const visibility = () => { if (!document.hidden) void load(); };
        document.addEventListener('visibilitychange', visibility);
        return () => {
            if (refreshTimer) clearTimeout(refreshTimer);
            clearInterval(fallback);
            clearInterval(recovery);
            document.removeEventListener('visibilitychange', visibility);
            if (channel && client) void client.removeChannel(channel);
        };
    }, [load, login, path]);
    useEffect(() => { const tick = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(tick); }, []);
    useEffect(() => () => { audio.current?.close(); }, []);
    useEffect(() => { const mc = (document as Any).modelContext; if (!mc?.registerTool || !data)
        return; const ctl = new AbortController(); Promise.resolve(mc.registerTool({ name: 'read_investigation_status', description: 'Read the same team progress and event status shown in this terminal.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: async (input: Any) => { if (!input || Object.keys(input).length)
            throw Error('No arguments accepted.'); return { event: data.settings.status, team: data.team?.code, progress: data.team ? pct(data.team.state) : undefined, objectives: data.team ? { broadcast: data.team.state.broadcast, truth: data.team.state.truth } : undefined }; } }, { signal: ctl.signal })).catch(() => { }); return () => ctl.abort(); }, [data]);
    async function act(action: string, value: Any = {}) { setBusy(true); try {
        const v = await request(action, value);
        await load();
        toast.success(action === 'submit' ? 'TRANSMISSION ARCHIVED. Theory awaiting review.' : 'SIGNAL VERIFIED. Change recorded.');
        return v;
    }
    catch (e: Any) {
        toast.error(e.message);
        throw e;
    }
    finally {
        setBusy(false);
    } }
    function fire(action: string, value: Any = {}) { void act(action, value).catch(() => { }); }
    function navigate(v: string) { setTab(v); history.replaceState(null, '', `/${admin ? 'admin' : 'participant'}/${v}`); }
    function toggleAudio() { if (ambient) {
        audio.current?.close();
        audio.current = null;
        setAmbient(false);
    }
    else {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 58;
        gain.gain.value = .015;
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        audio.current = ctx;
        setAmbient(true);
    } }
    const conf = data?.settings;
    const s = data?.team?.state;
    const seconds = conf ? Math.max(0, conf.remaining - (conf.status === 'RUNNING' ? Math.floor((now - data.now) / 1000) : 0)) : 0;
    return <main className="station console"><Toaster theme="dark" position="bottom-right" richColors/><header><a href="/" className="brand"><Radio /> RADIO MERIDIAN <span>DEAD AIR</span></a><div className="headeractions"><button className="quiet" aria-label={ambient ? 'Mute ambience' : 'Enable quiet ambience'} onClick={toggleAudio}>{ambient ? <Volume2 size={18}/> : <VolumeX size={18}/>}</button>{!login && <button className="quiet" onClick={async () => { await request('logout'); location.href = '/'; }}>SIGN OUT</button>}</div></header>{login ? <Login admin={admin}/> : loading ? <section className="center"><Waveform /><h2>ACQUIRING SIGNALâ€¦</h2></section> : !data ? <section className="center"><h2>ARCHIVE CONNECTION INTERRUPTED</h2><p>{error}</p>{admin && <><p>First time here? Commission the station to prepare the archive; add teams afterward.</p><button disabled={busy} onClick={async () => { try {
        const v = await act('commission');
        if (v.credentials?.length) if (v.credentials?.length) setCreds(v.credentials); else toast.success('STATION COMMISSIONED. No teams were created.'); else toast.success('STATION COMMISSIONED. No teams were created.');
    }
    catch { } }}>COMMISSION STATION</button></>}<button className="quiet" onClick={load}>RETRY CONNECTION</button></section> : <><div className="consolebar"><div><p className="eyebrow">{admin ? 'LIVE EVENT OPERATIONS' : data.team.code + ' / INVESTIGATOR TERMINAL'}</p><h2>{admin ? 'DEAD AIR // CONTROL ROOM' : data.team.name}</h2><span className={connected ? 'status' : 'offline'}>{connected ? 'SIGNAL CONNECTED' : 'SIGNAL UNSTABLE â€” reconnecting'} Â· {conf.status}</span></div><div className="timer"><span>TRANSMISSION WINDOW</span><strong>{clock(seconds)}</strong><small>{seconds === 0 && conf.status !== 'WAITING' ? 'WINDOW CLOSED' : conf.status === 'WAITING' ? 'WAITING FOR INVESTIGATORS' : conf.status}</small></div></div>{!connected && <p role="alert" className="notice">{error} Your last saved state is shown.</p>}{conf.announcement && <p className="notice">CONTROL MESSAGE / {conf.announcement}</p>}<Tabs value={tab} onValueChange={navigate}><TabsList className="mainnav" variant="line">{(admin ? ['teams', 'challenges', 'documents', 'broadcast', 'echo', 'activity', 'settings'] : ['case', 'files', 'challenges', 'echo', 'broadcast', 'team']).map(t => <TabsTrigger value={t} key={t}>{t.toUpperCase()}</TabsTrigger>)}</TabsList>{admin ? <><TabsContent value="teams"><RegistrationPanel data={data} act={act} busy={busy} setCreds={setCreds}/><AdminTeams data={data} selected={selected} setSelected={setSelected} fire={fire} act={act} busy={busy} confirm={setConfirm}/></TabsContent><TabsContent value="challenges"><AdminStations data={data} act={act}/></TabsContent><TabsContent value="documents"><AdminDocuments data={data} act={act}/></TabsContent><TabsContent value="broadcast"><MediaPanel data={data} act={act} load={load} admin/><Review data={data} fire={fire} setSelected={setSelected} navigate={navigate}/></TabsContent><TabsContent value="echo"><h2>ECHO OVERSIGHT</h2><p>Replies use each teamâ€™s discovered files. Hints and conversations stay isolated by team.</p>{data.teams.map((t: Any) => <details className="panel" key={t.id}><summary>{t.code} / {t.state.messages.length} queries / {t.state.hints.length} hints</summary>{t.state.messages.map((m: Any) => <p key={m.id}><b>{m.question}</b><br />{m.response}</p>)}</details>)}</TabsContent><TabsContent value="activity"><ActivityFeed items={data.activity}/></TabsContent><TabsContent value="settings"><Settings data={data} act={act} fire={fire} confirm={setConfirm}/></TabsContent></> : <><TabsContent value="case"><Case data={data} navigate={navigate}/></TabsContent><TabsContent value="files"><Files data={data} act={act} busy={busy}/></TabsContent><TabsContent value="challenges"><Challenges data={data}/></TabsContent><TabsContent value="echo"><Echo data={data} act={act} busy={busy}/></TabsContent><TabsContent value="broadcast"><Broadcast data={data} act={act} load={load} busy={busy}/></TabsContent><TabsContent value="team"><Team data={data} act={act}/></TabsContent></>}</Tabs>{(conf.leaderboard || admin) && <details className="leaderdetails"><summary>LIVE RANKINGS / {data.leaderboard.length} TEAMS</summary><Leaderboard data={data}/></details>}</>}{creds && <Dialog open onOpenChange={() => setCreds(null)}><DialogContent className="modal"><DialogTitle>TEAM ACCESS ROSTER</DialogTitle><DialogDescription>These access codes are shown once. Save them and issue each code privately to its team.</DialogDescription><button onClick={() => download('meridian-team-access.csv', 'Team ID,Team name,Access code\n' + creds.map((t: Any) => `${t.code},${t.name},${t.access}`).join('\n'))}>DOWNLOAD PRIVATE ROSTER</button><pre>{creds.map((t: Any) => `${t.code}   ${t.access}`).join('\n')}</pre></DialogContent></Dialog>}{confirm && <AlertDialog open onOpenChange={() => setConfirm(null)}><AlertDialogContent><AlertDialogTitle>{confirm.title}</AlertDialogTitle><AlertDialogDescription>{confirm.description}</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { confirm.run(); setConfirm(null); }}>Confirm</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}<footer><span>THE STATION REMEMBERS.</span><span>ECHO IS LISTENING.</span></footer></main>;
}
function Login({ admin }: Any) { const [busy, setBusy] = useState(false); const [error, setError] = useState(''); return <section className="loginlayout"><div><p className="eyebrow">{admin ? 'AUTHORISED PERSONNEL ONLY' : 'INVESTIGATOR CONNECTION'}</p><h2>{admin ? 'ENTER THE\nCONTROL ROOM' : 'THE STATION\nIS LISTENING.'}</h2><p>{admin ? 'Manage the transmission window and guide teams through the archive.' : 'Use the team credentials issued by event control. Your investigation will resume where you left it.'}</p><Waveform /><a href={admin ? '/login' : '/admin/login'}>{admin ? 'Investigator access' : 'Control room access'} â†’</a></div><form className="panel" onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setError(''); try {
    await request('login', { admin, username: f.get('username'), code: f.get('code'), name: f.get('name'), password: f.get('password') });
    location.href = admin ? '/admin/teams' : '/participant/case';
}
catch (e: Any) {
    setError(e.message);
}
finally {
    setBusy(false);
} }}><p className="eyebrow">{admin ? 'CONTROL ROOM AUTHENTICATION' : 'TEAM AUTHENTICATION'}</p>{admin ? <label>USERNAME<input name="username" autoComplete="username" required defaultValue="control"/></label> : <><label>TEAM ID<input name="code" placeholder="TEAM 01" autoComplete="username" required/></label><label>TEAM NAME<input name="name" placeholder="As registered with event control" required/></label></>}<label>{admin ? 'PASSWORD' : 'TEAM ACCESS CODE'}<input type="password" name="password" autoComplete="current-password" required/></label>{error && <p className="error" role="alert">{error}</p>}<button disabled={busy}>{busy ? 'AUTHENTICATINGâ€¦' : 'ESTABLISH CONNECTION'} <ArrowRight size={18}/></button><p className="muted">SECURE TERMINAL / SESSION-BOUND ACCESS</p></form></section>; }
function Case({ data, navigate }: Any) { const s = data.team.state; const open = data.documents.filter((d: Any) => d.content); const last = [...open].sort((a: Any, b: Any) => b.unlockedAt - a.unlockedAt)[0]; if (data.ending)
    return <section className="ending crt"><p className="eyebrow">02:13:47 / SIGNAL RECOVERED</p><h2>TRANSMISSION RESTORED.<br />CASE SOLVED.</h2><Waveform /><p>{data.ending}</p><p>The warning is recovered. The carrierâ€™s origin is still unknown.</p><small>UNKNOWN CARRIER DETECTED</small><blockquote>â€œThereâ€™s one transmission you havenâ€™t heard.â€</blockquote><p>SILENCE IS NOT THE END.</p></section>; if(data.settings.status === "ENDED") return <section className="ending crt"><p className="eyebrow">TRANSMISSION WINDOW CLOSED</p><h2>THE STATION REMAINS OFF-AIR.</h2><Waveform/><p>The signal was never fully recovered. Your evidence and submissions are preserved.</p><p>{pct(s)}% recovered Â· {Number(s.broadcast)+Number(s.truth)} of 2 objectives completed</p><button className="quiet" onClick={()=>navigate("files")}>REVIEW RECOVERED RECORDS</button></section>; return <div className="casegrid"><section><div className="casehero"><p className="eyebrow">CURRENT CASE / ADRIAN VALE</p><h2>THE STATION<br />HAS GONE SILENT.</h2><p>One missing host. Eight encrypted records. A final broadcast that was never meant to reach the outside.</p><button onClick={() => navigate('files')}>ENTER THE ARCHIVE <ArrowRight size={16}/></button></div><div className="stats"><div><span>FILES RECOVERED</span><strong>{open.length} / 8</strong></div><div><span>SIGNAL INTEGRITY</span><strong>{pct(s)}%</strong></div><div><span>OBJECTIVES</span><strong>{Number(s.broadcast) + Number(s.truth)} / 2</strong></div></div><section className="panel"><p className="eyebrow">DISCOVERED EVIDENCE</p>{open.length ? open.map((d: Any) => <div className="clue" key={d.id}><span>FILE {d.id}</span><div><h3>{d.title}</h3>{d.clues?.map((c: string) => <p key={c}>{c}</p>)}</div></div>) : <p>No evidence recovered yet. Visit a physical challenge station. The marshal will record your completion and issue a passkey.</p>}</section><ActivityFeed items={data.activity} compact/></section><aside><section className="crt"><div className="panelhead">ECHO / CORE STATUS <span>LISTENING</span></div><Waveform /><blockquote>{last ? last.echo : 'â€œI do not have authorization to discuss the final broadcast.â€'}</blockquote><button className="quiet" onClick={() => navigate('echo')}>OPEN ECHO TERMINAL â†’</button></section><section className="panel"><p className="eyebrow">CURRENT OBJECTIVE</p><h3>{open.filter((d: Any) => ['01', '02', '03', '04'].includes(d.id)).length === 4 ? 'Reconstruct the final transmission.' : 'Recover the remaining broadcast records.'}</h3><Progress value={pct(s)}/><p className="muted">{pct(s)}% INVESTIGATION PROGRESS</p><hr /><p className="eyebrow">UNRESOLVED</p><p>{last?.question || 'What happened at 02:13:47?'}</p></section><section className="panel"><p className="eyebrow">TWO OBJECTIVES. ONE CASE.</p><p>{s.broadcast ? 'âœ“' : 'â—‹'} Complete the radio broadcast</p><p>{s.truth ? 'âœ“' : 'â—‹'} Reveal the truth / secrets</p><small>Both objectives must be confirmed to be eligible to win.</small></section></aside></div>; }
function Files({ data, act, busy }: Any) {
    const [doc, setDoc] = useState<Any>(null);
    const [passkey, setPasskey] = useState('');
    const [codeError, setCodeError] = useState('');
    const current = data.documents.find((d: Any) => d.id === doc?.id);
    return <><div className="sectiontitle"><h2>ENCRYPTED ARCHIVE</h2><span>{data.documents.filter((d: Any) => d.content).length} / 8 RECOVERED</span></div>
        {['BROADCAST FILES', 'EVIDENCE ARCHIVE'].map((category, index) => <section key={category}><p className="eyebrow">{category} / {index ? 'SUPPORTING RECORDS' : 'MANDATORY DISCOVERIES'}</p><div className="filegrid">
            {data.documents.filter((d: Any) => index ? !/^0/.test(d.id) : /^0/.test(d.id)).map((d: Any) => <button className={'filecard ' + (d.content ? 'recovered' : '')} key={d.id} onClick={() => { setDoc(d); setPasskey(''); setCodeError(''); }}>
                <div className="filelabel"><span>FILE {d.id}</span>{d.content ? <Check size={18}/> : <Lock size={18}/>}</div><FileText size={35}/><h3>{d.title}</h3><p>{d.subtitle}</p><div className="redaction">{d.content ? 'ARCHIVE RECOVERED' : 'â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ  â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ'}</div><small>{d.content ? 'OPEN RECORD â†’' : d.approved ? 'APPROVED / ENTER PASSKEY â†’' : 'AWAITING ADMIN APPROVAL'}</small>
            </button>)}
        </div></section>)}
        <Dialog open={!!doc} onOpenChange={v => { if (!v) { setDoc(null); setPasskey(''); setCodeError(''); } }}><DialogContent className="modal document"><DialogTitle>FILE {current?.id} / {current?.title}</DialogTitle><DialogDescription>{current?.classification}</DialogDescription>
            {current?.content ? <><p className="eyebrow">FILE DECRYPTED / {date(current.unlockedAt)}</p><div className="documentbody">{current.content}</div><p className="notice">UNRESOLVED / {current.question}</p></> : !current?.approved ? <><p>{current?.description}</p><p className="notice" role="status">AWAITING ADMIN APPROVAL</p><p>Complete the associated challenge. Collect your code from the marshal, then ask them to approve passkey entry for this file.</p></> : <form onSubmit={async e => {
                e.preventDefault(); setCodeError('');
                try { await act('unlock', { id: current.id, passkey }); setPasskey(''); }
                catch (e: Any) { setCodeError(e.message); }
            }}><p>{current?.description}</p><p className="notice">ADMIN APPROVED / PASSKEY REQUIRED</p><label htmlFor="archive-passkey">ENTER 4-DIGIT PASSKEY</label><InputOTP id="archive-passkey" value={passkey} onChange={v => { setPasskey(v); setCodeError(''); }} disabled={busy} maxLength={4} pattern="[0-9]*" inputMode="numeric" aria-describedby={codeError ? 'archive-code-error' : 'archive-code-help'} aria-invalid={!!codeError}><InputOTPGroup>{[0, 1, 2, 3].map(i => <InputOTPSlot key={i} index={i} className="otp"/>)}</InputOTPGroup></InputOTP>
                {codeError && <p id="archive-code-error" className="error" role="alert">{codeError}</p>}<button disabled={busy || passkey.length !== 4}>{busy ? 'AUTHENTICATINGâ€¦' : 'DECRYPT FILE'}</button><p id="archive-code-help" className="muted">Use the four-digit code handed to your team for this file. Approval alone does not reveal its contents.</p>
            </form>}
        </DialogContent></Dialog>
    </>;
}
function Challenges({ data }: Any) { return <><h2>CHALLENGE STATIONS</h2><p>Move freely between stations. A marshal verifies each physical challenge; completion appears here automatically.</p><div className="challengegrid">{data.challenges.map((c: Any) => { const state = data.team.state.challenges[c.id]; const status = !c.enabled ? 'DISABLED' : state?.status || 'AVAILABLE'; const labels: Any = { 'AVAILABLE': 'SIGNAL AVAILABLE', 'IN PROGRESS': 'SIGNAL ACQUIRED', 'COMPLETED': 'COMPLETED âœ“', 'FAILED': 'ATTEMPT FAILED', 'LOCKED': 'ACCESS DENIED', 'DISABLED': 'STATION OFFLINE' }; return <section className="panel challenge" key={c.id}><div className="sectiontitle"><span className="eyebrow">STATION {c.id}</span><span className="status">{labels[status]}</span></div><h3>{c.name}</h3><p>{c.description}</p><small>{c.instructions}</small><div className="reward"><span>REWARD / FILE {c.document}</span><b>{status === 'COMPLETED' ? 'COLLECT CODE FROM MARSHAL' : 'AWAITING VERIFICATION'}</b></div>{state?.time && <small>Last update {date(state.time)}</small>}</section>; })}</div></>; }
function Echo({ data, act, busy }: Any) { const [q, setQ] = useState(''); const s = data.team.state; return <div className="casegrid"><section className="crt echo"><div className="panelhead">ECHO // CORE TERMINAL <span>LISTENINGâ€¦</span></div><Waveform /><div className="messages" aria-live="polite"><p className="echoreply">ECHO &gt; Investigator session confirmed. Ask about the evidence you have recovered.</p>{s.messages.map((m: Any) => <div key={m.id}><p className="query">YOU &gt; {m.question}</p><p className="echoreply">ECHO &gt; {m.response}</p><small>{date(m.time)}</small></div>)}</div><form className="questionform" onSubmit={async (e) => { e.preventDefault(); try {
    await act('echo', { question: q });
    setQ('');
}
catch { } }}><label htmlFor="echo-question" className="sr-only">Question for ECHO</label><input id="echo-question" value={q} onChange={e => setQ(e.target.value)} maxLength={500} placeholder="What happened at 02:13:47?" required/><button disabled={busy || !q.trim()}>TRANSMIT</button></form></section><aside><section className="panel"><p className="eyebrow">REQUEST ECHO HINT</p><p>Guidance adapts to recovered evidence. Each level may carry a score penalty.</p>{[1, 2, 3].map((level, i) => <button className="hintbutton quiet" disabled={busy} key={level} onClick={() => void act('hint', { level }).catch(() => { })}><span>LEVEL {level} / {['SUBTLE NUDGE', 'STRONGER CLUE', 'NEAR-SOLUTION'][i]}</span><b>{data.settings.hintPenalty ? data.settings.hintCost * level : 0} PTS</b></button>)}</section>{s.hints.map((h: Any) => <section className="panel" key={h.id}><p className="eyebrow">HINT {h.level || 'CONTROL'} / âˆ’{h.cost} PTS</p><p>{h.text}</p></section>)}</aside></div>; }
function Ordered({ items, ids, setIds, label }: Any) { const [drag, setDrag] = useState<string | null>(null); function move(id: string, to: number) { const copy = ids.filter((x: string) => x !== id); copy.splice(to, 0, id); setIds(copy); } return <section><p className="eyebrow">{label}</p><ol className="orderlist">{ids.map((id: string, i: number) => { const item = items.find((x: Any) => x.id === id); return <li draggable key={id} onDragStart={() => setDrag(id)} onDragOver={e => e.preventDefault()} onDrop={() => { if (drag)
    move(drag, i); setDrag(null); }}><span className="orderindex">{String(i + 1).padStart(2, '0')}</span><div>{item?.time && <small>{item.time}</small>}<p>{item?.text}</p></div><div className="ordercontrols"><button className="quiet" disabled={i === 0} aria-label={'Move item ' + (i + 1) + ' up'} onClick={() => move(id, i - 1)}><ChevronUp size={16}/></button><button className="quiet" disabled={i === ids.length - 1} aria-label={'Move item ' + (i + 1) + ' down'} onClick={() => move(id, i + 1)}><ChevronDown size={16}/></button></div></li>; })}</ol></section>; }
const questions = ['WHO DISAPPEARED?', 'WHY DID THE BROADCAST STOP?', 'WHAT IS THE GHOST CARRIER?', 'WHAT DID ECHO DO?', 'WHERE DID ADRIAN GO?', 'WHY WAS THE FINAL TRANSMISSION INTERRUPTED?', 'WHAT CAUSED THE BLACKOUT?'];
function Broadcast({ data, act, load, busy }: Any) { const s = data.team.state; const [key, setKey] = useState(''); const [ids, setIds] = useState<string[]>([]); const [tids, setTids] = useState<string[]>([]); const [answers, setAnswers] = useState<string[]>(Array(7).fill('')); const [explanation, setExplanation] = useState(''); const [playing, setPlaying] = useState(false); const [confirmed, setConfirmed] = useState(false); useEffect(() => { if (data.fragments.length && key !== data.team.id) {
    const v = s.draft;
    setIds(v?.fragments || data.fragments.map((x: Any) => x.id));
    setTids(v?.timeline || data.timeline.map((x: Any) => x.id));
    setAnswers(v?.answers || Array(7).fill(''));
    setExplanation(v?.explanation || '');
    setKey(data.team.id);
} }, [data, key, s.draft]); useEffect(() => () => { speechSynthesis.cancel(); }, []); if (!data.fragments.length)
    return <section className="center crt"><Lock size={42}/><h2>TRANSMISSION INCOMPLETE</h2><p>Recover all four main broadcast files to reconstruct Adrianâ€™s warning.</p></section>; const value = { fragments: ids, timeline: tids, answers, explanation }; return <><div className="sectiontitle"><h2>THE FINAL TRANSMISSION</h2><span>{s.broadcast ? 'BROADCAST RESTORED' : 'TRANSMISSION INCOMPLETE'}</span></div><p>Arrange the recovered fragments and incident timeline. Upload your teamâ€™s recovery, then explain the evidence.</p><div className="toolbar"><button className="quiet" onClick={() => { if (playing) {
    speechSynthesis.pause();
    setPlaying(false);
}
else {
    if (speechSynthesis.paused)
        speechSynthesis.resume();
    else {
        const speech = new SpeechSynthesisUtterance(ids.map(id => data.fragments.find((x: Any) => x.id === id)?.text).join('. '));
        speech.rate = .85;
        speech.onend = () => setPlaying(false);
        speechSynthesis.speak(speech);
    }
    setPlaying(true);
} }}>{playing ? 'PAUSE' : 'PLAY'} TRANSCRIPT PREVIEW</button><button className="quiet" onClick={() => { speechSynthesis.cancel(); setPlaying(false); }}>STOP</button><small>Synthesised reading of recovered text</small></div><div className="two"><Ordered items={data.fragments} ids={ids} setIds={setIds} label="01 / BROADCAST SEQUENCE"/><Ordered items={data.timeline} ids={tids} setIds={setTids} label="02 / WHAT REALLY HAPPENED?"/></div><MediaPanel data={data} act={act} load={load}/><section className="panel"><p className="eyebrow">03 / FINAL TRUTH SUBMISSION</p><div className="two">{questions.map((q, i) => <label key={q}>{i + 1}. {q}<textarea rows={3} maxLength={3000} value={answers[i]} onChange={e => setAnswers(answers.map((a, j) => i === j ? e.target.value : a))}/></label>)}</div><label>FINAL WRITTEN EXPLANATION<textarea rows={5} maxLength={10000} value={explanation} onChange={e => setExplanation(e.target.value)} placeholder="Connect the evidence. Distinguish the programme interruption from the station-wide blackout."/></label><label className="switchrow"><Switch checked={confirmed} onCheckedChange={setConfirmed}/> We confirm this is our final reconstruction of the archived warning.</label><div className="toolbar"><button className="quiet" disabled={busy} onClick={() => void act('draft', { value }).catch(() => { })}>SAVE DRAFT</button><button disabled={busy || !confirmed || answers.some(a => a.trim().length < 8) || explanation.trim().length < 80 || s.truth} onClick={() => void act('submit', { value }).catch(() => { })}>SUBMIT FINAL TRANSMISSION</button></div>{s.submittedAt && <p className="notice">Submitted {date(s.submittedAt)} / {s.truth ? 'TRUTH CONFIRMED' : 'THEORY AWAITING MARSHAL REVIEW'} / {s.accuracy} provisional points</p>}</section></>; }
async function uploadMedia(file: File, data: Any, load: () => Promise<void>, setProgress: (value: number) => void) {
    if (file.size > data.settings.maxUploadMB * 1024 * 1024) { toast.error('File exceeds upload limit.'); return; }
    const ext = file.name.split('.').pop()?.toLowerCase();
    const types: Record<string, string> = { mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };
    if (!ext || !types[ext]) { toast.error('Use MP3, WAV, M4A, MP4, WEBM or MOV.'); return; }
    const client = getBrowserSupabase();
    if (!client) { toast.error('Supabase Storage is not configured.'); return; }
    setProgress(0);
    try {
        const signedResponse = await fetch('/api/media', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: file.name, mime: types[ext], size: file.size }) });
        const signed: Any = await signedResponse.json();
        if (!signedResponse.ok) throw Error(signed.error);
        const { error } = await client.storage.from('media').uploadToSignedUrl(signed.path, signed.token, file, { contentType: types[ext] });
        if (error) throw error;
        setProgress(100);
        const finalized = await fetch('/api/media/finalize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: signed.id }) });
        const result: Any = await finalized.json();
        if (!finalized.ok) throw Error(result.error);
        toast.success('FRAGMENT ARCHIVED.');
        await load();
    } catch (error: Any) { toast.error(error.message || 'UPLOAD FAILED. Select the file to retry.'); }
    finally { setProgress(-1); }
}function MediaPanel({ data, act, load, admin = false }: Any) { const [progress, setProgress] = useState(-1); const [preview, setPreview] = useState<Any>(null); const [note, setNote] = useState(''); return <section className="panel"><div className="sectiontitle"><h2>{admin ? 'MEDIA CONTROL' : 'RECOVERED MEDIA'}</h2><span>{data.media.length} FRAGMENTS</span></div>{!admin && <><p>MP3, WAV, M4A, MP4, WEBM, MOV Â· up to {data.settings.maxUploadMB} MB each Â· {data.settings.requiredUploads} required {data.settings.requireApproval ? 'with marshal approval' : ''}</p><label className="uploadlabel"><Upload size={24}/> UPLOAD BROADCAST FRAGMENT<input aria-label="Choose broadcast fragment" type="file" accept=".mp3,.wav,.m4a,.mp4,.webm,.mov" disabled={progress >= 0 || !!data.team.state.submittedAt} onChange={e => { const file = e.target.files?.[0]; if (!file)
    return; if (file.size > data.settings.maxUploadMB * 1024 * 1024) {
    toast.error('File exceeds upload limit.');
    return;
} if (file) void uploadMedia(file, data, load, setProgress); e.target.value = ''; }}/></label>{progress >= 0 && <><Progress value={progress}/><p aria-live="polite">{progress === 100 ? 'PROCESSINGâ€¦' : 'UPLOADINGâ€¦ ' + progress + '%'}</p></>}</>}{data.media.length === 0 ? <p className="muted">NO FRAGMENTS ARCHIVED</p> : data.media.map((m: Any) => <div className="mediarow" key={m.id}><div><b>{m.name}</b><small>{admin ? (data.teams.find((t: Any) => t.id === m.team_id)?.code || '') + ' / ' : ''}{(m.size / 1048576).toFixed(1)} MB / {m.status}</small>{m.note && <p>{m.note}</p>}</div><div className="toolbar"><button className="quiet" onClick={() => { setPreview(m); setNote(m.note); }}>PREVIEW</button><a href={'/api/media?id=' + m.id + '&download=1'}>DOWNLOAD</a>{!admin && !data.team.state.submittedAt && <button className="quiet" onClick={async () => { const r = await fetch('/api/media?id=' + m.id, { method: 'DELETE' }); if (!r.ok) {
    toast.error(((await r.json()) as any).error);
    return;
} await load(); }}>REMOVE</button>}</div></div>)}<Dialog open={!!preview} onOpenChange={v => { if (!v)
    setPreview(null); }}><DialogContent className="modal"><DialogTitle>{preview?.name}</DialogTitle><DialogDescription>{preview?.status} / Media archive preview. Browser format support varies; download if playback is unavailable.</DialogDescription>{preview?.mime.startsWith('video') ? <video controls src={'/api/media?id=' + preview.id}/> : preview && <audio controls src={'/api/media?id=' + preview.id}/>}<p>Team-supplied media; captions or a transcript should accompany any spoken evidence in the written explanation.</p>{admin && <><label>REVIEW NOTE<textarea value={note} onChange={e => setNote(e.target.value)}/></label><div className="toolbar">{['APPROVED', 'REJECTED', 'USED', 'REMOVE'].map(status => <button className="quiet" key={status} onClick={async () => { try {
    await act('admin.media', { id: preview.id, status, note });
    setPreview(null);
}
catch { } }}>{status}</button>)}</div></>}</DialogContent></Dialog></section>; }
function Team({ data, act }: Any) { const s = data.team.state; const [members, setMembers] = useState(s.members.join('\n')); return <div className="two"><section className="panel"><p className="eyebrow">{data.team.code}</p><h2>{data.team.name}</h2><Progress value={pct(s)}/><p>{pct(s)}% overall progress</p><p>{Object.values(s.challenges).filter((x: Any) => x.status === 'COMPLETED').length}/8 challenges Â· {Object.keys(s.unlocks).length}/8 files Â· {s.hints.length} hints</p><p>Broadcast: {s.broadcast ? 'COMPLETE' : 'INCOMPLETE'}<br />Truth: {s.truth ? 'CONFIRMED' : 'UNCONFIRMED'}</p><p>Current objective: {s.broadcast ? 'Have your deduction reviewed.' : 'Recover records and reconstruct the warning.'}</p></section><form className="panel" onSubmit={e => { e.preventDefault(); void act('members', { members: members.split('\n') }).catch(() => { }); }}><label>TEAM MEMBERS / ONE PER LINE<textarea rows={7} value={members} onChange={e => setMembers(e.target.value)}/></label><button>SAVE MEMBERS</button></form></div>; }
function ActivityFeed({ items, compact = false }: Any) { const [query, setQuery] = useState(''); return <section className="panel"><h3>{compact ? 'INVESTIGATION LOG' : 'LIVE ACTIVITY FEED'}</h3>{!compact && <label>SEARCH ACTIVITY<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Team, action or detail"/></label>}<div className="feed">{items.filter((i: Any) => JSON.stringify(i).toLowerCase().includes(query.toLowerCase())).slice(0, compact ? 8 : 150).map((i: Any) => <div className="feedrow" key={i.id}><time>{date(i.created_at)}</time><div><b>{i.actor} / {i.action}</b><p>{i.detail}</p></div></div>)}{!items.length && <p>No activity recorded yet.</p>}</div></section>; }
const elapsedLabel = (milliseconds: number) => { const total = Math.max(0, Math.floor(milliseconds / 1000)); const hours = Math.floor(total / 3600); const minutes = Math.floor(total / 60) % 60; const seconds = total % 60; return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` : `${minutes}:${String(seconds).padStart(2, '0')}`; };
function Leaderboard({ data }: Any) {
    const rows = data.leaderboard || [];
    const eventStart = Number(data.settings?.startedAt || 0);
    const fastestId = rows.find((row: Any) => Number(row.files_unlocked) > 0)?.id;
    const viewerId = data.admin ? undefined : data.team?.id;
    if (!rows.length) return <p className="muted">NO TEAMS REGISTERED</p>;
    return <>
        {!rows.some((row: Any) => Number(row.files_unlocked) > 0) && <p className="muted">NO FILES UNLOCKED YET. ALL REGISTERED TEAMS ARE SHOWN BELOW.</p>}
        <Table><TableHeader><TableRow>{['RANK', 'TEAM / ID', 'FILES UNLOCKED', 'LATEST UNLOCK', 'PROGRESS', 'BROADCAST', 'TRUTH', 'ACCURACY', 'SCORE'].map(c => <TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map((t: Any) => {
            const unlocked = Number(t.files_unlocked) || 0;
            const latest = t.last_unlock_at ? elapsedLabel(Number(t.last_unlock_at) - eventStart) : '—';
            return <TableRow key={t.id} data-selected={t.id === viewerId || t.id === fastestId}>
                <TableCell>{t.rank}</TableCell><TableCell>{t.name}<small>{t.code}</small></TableCell>
                <TableCell>{unlocked} / 8<details><summary>FILE TIMES</summary><div className="matrix">{Array.from({ length: 8 }, (_, index) => {
                    const id = String(index).padStart(2, '0');
                    const at = t.unlock_times?.[id];
                    return <div className="matrixitem" key={id}><b>FILE {id}</b><small>{at && eventStart ? `${elapsedLabel(Number(at) - eventStart)} · ${new Date(Number(at)).toLocaleTimeString()}` : 'LOCKED'}</small></div>;
                })}</div></details></TableCell>
                <TableCell>{latest}</TableCell><TableCell>{t.progress}%</TableCell><TableCell>{t.broadcast ? 'âœ“' : 'â€”'}</TableCell><TableCell>{t.truth ? 'âœ“' : 'â€”'}</TableCell><TableCell>{t.accuracy}</TableCell><TableCell>{t.score}</TableCell>
            </TableRow>;
        })}</TableBody></Table>
    </>;
}
function download(name: string, text: string) { const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); }
function parseCsv(source: string) { return source.split(/\r?\n/).map(line => { const out: string[] = []; let value = '', quoted = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (ch === '"' && line[i + 1] === '"' && quoted) { value += '"'; i++; } else if (ch === '"') quoted = !quoted; else if (ch === ',' && !quoted) { out.push(value.trim()); value = ''; } else value += ch; } out.push(value.trim()); return out; }).filter(row => row.some(Boolean)); }
function RegistrationPanel({ data, act, busy, setCreds }: Any) { const [code, setCode] = useState(''); const [name, setName] = useState(''); const [access, setAccess] = useState(''); const [csv, setCsv] = useState(''); const rows = parseCsv(csv); const headers = rows[0]?.map(x => x.toLowerCase()); const header = !!headers?.some(x => ['id', 'code', 'team id'].includes(x)) && headers.some(x => ['name', 'team name'].includes(x)); const src = header ? rows.slice(1) : rows; const colCode = header ? Math.max(0, headers.findIndex(x => ['id', 'code', 'team id'].includes(x))) : 0; const colName = header ? headers.findIndex(x => ['name', 'team name'].includes(x)) : 1; const colAccess = header ? headers.findIndex(x => ['access code', 'accesscode', 'password'].includes(x)) : 2; const teams = src.map(r => ({ code: r[colCode] || '', name: r[colName] || '', accessCode: colAccess < 0 ? '' : r[colAccess] || '' })); const allTeams = data.teams; const normalize = (v: string) => { const code = v.trim().toUpperCase().replace(/\s+/g, ' '); const n = code.match(/^TEAM\s*0?(\d+)$/); return n ? 'TEAM ' + String(Number(n[1])).padStart(2, '0') : code; }; const errors = teams.flatMap((t, i) => { const e: string[] = []; if (!t.name || t.name.length > 80) e.push('Row ' + (i + 1) + ': name required (up to 80 characters).'); if (t.code && !/^[A-Z0-9][A-Z0-9 _-]{1,31}$/.test(normalize(t.code))) e.push('Row ' + (i + 1) + ': ID must be 2?32 characters using letters, numbers, spaces, hyphens or underscores.'); if (t.code && allTeams.some((x: Any) => normalize(x.code) === normalize(t.code))) e.push('Row ' + (i + 1) + ': ID already registered.'); if (t.name && allTeams.some((x: Any) => x.name.toLowerCase() === t.name.toLowerCase())) e.push('Row ' + (i + 1) + ': name already registered.'); if (t.accessCode.trim() && (t.accessCode.trim().length < 8 || t.accessCode.trim().length > 64)) e.push('Row ' + (i + 1) + ': access code must be 8?64 characters.'); return e; }); const tooMany = teams.length > 100; const duplicate = teams.some((t, i) => teams.slice(0, i).some(x => (t.code && normalize(x.code) === normalize(t.code)) || (t.name && x.name.toLowerCase() === t.name.toLowerCase()))); const singleErrors = (!name.trim() ? 'Enter a team name.' : name.trim().length > 80 ? 'Team name must be 80 characters or fewer.' : allTeams.some((x: Any) => x.name.toLowerCase() === name.trim().toLowerCase()) ? 'A team with that name already exists.' : code.trim() && !/^[A-Z0-9][A-Z0-9 _-]{1,31}$/.test(normalize(code)) ? 'Team ID must be 2?32 characters using letters, numbers, spaces, hyphens or underscores.' : code.trim() && allTeams.some((x: Any) => normalize(x.code) === normalize(code)) ? 'That team ID already exists.' : access.trim() && (access.trim().length < 8 || access.trim().length > 64) ? 'Access code must be 8?64 characters.' : ''); const register = async (items: Any[]) => { try { const result = await act('admin.addTeams', { teams: items }); setCreds(result.credentials); setCode(''); setName(''); setAccess(''); setCsv(''); } catch {} }; return <section className="panel"><h2>REGISTER TEAMS</h2><p>Leave the ID or access code blank to generate it. New access codes appear once after registration.</p><form className="two" onSubmit={e => { e.preventDefault(); if (!singleErrors) void register([{ code, name, accessCode: access }]); }}><label>TEAM ID<input value={code} onChange={e => setCode(e.target.value)} placeholder="Generated if blank" maxLength={32}/></label><label>TEAM NAME<input value={name} onChange={e => setName(e.target.value)} maxLength={80} required/></label><label>ACCESS CODE<input type="password" value={access} onChange={e => setAccess(e.target.value)} minLength={access ? 8 : undefined} maxLength={64} placeholder="Generated if blank"/></label><button disabled={busy || !!singleErrors}>REGISTER TEAM</button></form>{singleErrors && name && <p className="error">{singleErrors}</p>}<hr/><label>BULK CSV / ID, NAME, ACCESS CODE (HEADER OPTIONAL)<textarea rows={5} value={csv} onChange={e => setCsv(e.target.value)} placeholder={'TEAM 01,North Station,optional-code\nTEAM 02,South Station,'}/></label><p>{teams.length} teams in preview{errors.length ? ' / ' + errors.length + ' validation errors' : ' / ready to register'}</p>{(tooMany ? ['Import no more than 100 teams at a time.'] : duplicate ? ['Duplicate IDs or names in this file.'] : errors).map((x: string) => <p className="error" key={x}>{x}</p>)}<button disabled={busy || !teams.length || errors.length > 0 || duplicate || tooMany} onClick={() => void register(teams)}>REGISTER {teams.length} TEAMS</button>{!allTeams.length && <p className="notice">NO TEAMS REGISTERED YET. Commissioning prepared the archive; register the roster here.</p>}</section>; }
function AdminTeams({ data, selected, setSelected, fire, act, busy, confirm }: Any) { const [search, setSearch] = useState(''); const [note, setNote] = useState(''); const [secret, setSecret] = useState(''); const [reset, setReset] = useState(''); const [access, setAccess] = useState(''); const [deleteText, setDeleteText] = useState(''); const t = data.team; const s = t?.state; const command = (op: string, extra: Any = {}) => fire('admin.team', { teamId: t.id, op, ...extra }); return <><div className="stats"><div><span>ACTIVE / TOTAL TEAMS</span><strong>{data.teams.filter((t: Any) => Date.now() - t.updatedAt < 15 * 60000 && t.revision > 0).length} / {data.teams.length}</strong></div><div><span>BROADCASTS RESTORED</span><strong>{data.teams.filter((t: Any) => t.state.broadcast).length}</strong></div><div><span>THEORIES TO REVIEW</span><strong>{data.teams.filter((t: Any) => t.state.submittedAt && !t.state.truth).length}</strong></div></div><div className="toolbar"><label className="search">SEARCH TEAMS<input placeholder="Team ID or name" value={search} onChange={e => setSearch(e.target.value)}/></label>{selected && <button className="quiet" onClick={() => setSelected('')}>CLOSE TEAM</button>}<button className="quiet" onClick={() => download('meridian-results.csv', 'Team,Progress,Broadcast,Truth,Accuracy,Score\n' + data.leaderboard.map((t: Any) => [t.code, t.progress, t.broadcast, t.truth, t.accuracy, t.score].join(',')).join('\n'))}>EXPORT RESULTS</button></div>{t && <section className="panel teamcontrols"><div className="sectiontitle"><h2>{t.code} / {t.name}</h2><label className="switchrow">FLAG TEAM <Switch checked={s.flag} onCheckedChange={v => command('flag', { value: v })}/></label></div><p className="eyebrow">QUICK CHALLENGE MATRIX / CLICK COMPLETE AFTER PHYSICAL VERIFICATION</p><div className="matrix">{data.challenges.map((c: Any) => <div className="matrixitem" key={c.id}><div><b>{c.id} / {c.name}</b><small>{s.challenges[c.id]?.status || 'AVAILABLE'}</small></div><button disabled={busy || s.challenges[c.id]?.status === 'COMPLETED'} onClick={() => command('challenge', { id: c.id, status: 'COMPLETED' })}>{s.challenges[c.id]?.status === 'COMPLETED' ? 'âœ“ COMPLETE' : 'COMPLETE'}</button><Choice label={'State for ' + c.name} value={s.challenges[c.id]?.status || 'AVAILABLE'} onChange={(status: string) => command('challenge', { id: c.id, status })} options={['AVAILABLE', 'IN PROGRESS', 'COMPLETED', 'FAILED', 'LOCKED', 'DISABLED']}/></div>)}</div><div className="two"><section><h3>Archive access</h3><p>Complete the challenge, hand over the physical code, then approve entry. The team must enter the passkey to read the file.</p>{data.documents.map((d: Any) => {
    const approved = !!s.archiveApprovals[d.id];
    const completed = data.challenges.some((c: Any) => c.document === d.id && s.challenges[c.id]?.status === 'COMPLETED');
    return <div className="inlinecontrol" key={d.id}><div><span>FILE {d.id} / {d.title}</span><p className="muted">MARSHAL CODE / {d.passkey} Â· {s.unlocks[d.id] ? 'DECRYPTED BY TEAM' : approved ? 'CODE ENTRY APPROVED' : 'NOT APPROVED'}</p></div><button className="quiet" disabled={busy || (!completed && !approved)} onClick={() => command(approved ? 'lock' : 'unlock', { id: d.id })}>{approved ? 'REVOKE ACCESS' : 'APPROVE CODE ENTRY'}</button></div>;
})}</section><section><h3>Hints & internal notes</h3><label>MESSAGE<textarea value={note} onChange={e => setNote(e.target.value)} rows={3}/></label><div className="toolbar"><button className="quiet" disabled={!note.trim()} onClick={() => command('hint', { text: note })}>GRANT HINT</button><button className="quiet" disabled={!note.trim()} onClick={() => command('note', { text: note })}>INTERNAL NOTE</button></div>{s.hints.map((h: Any) => <div className="inlinecontrol" key={h.id}><span>{h.text}</span><button className="quiet" onClick={() => command('revokeHint', { id: h.id })}>REVOKE</button></div>)}{s.notes.map((n: Any, i: number) => <p className="notice" key={i}>{date(n.time)} / {n.text}</p>)}</section></div><div className="two"><section className="panel"><h3>Objective overrides</h3>{['broadcast', 'truth'].map(id => <label className="switchrow" key={id}>{id.toUpperCase()} CONFIRMED<Switch checked={s[id]} onCheckedChange={value => command('objective', { id, value })}/></label>)}<p>Overrides are logged. Review the written submission before confirming the truth.</p><label>DEDUCTION ACCURACY<input type="number" min={0} max={100} defaultValue={s.accuracy} key={t.id} onBlur={e => { if (Number(e.target.value) !== s.accuracy)
    command('objective', { id: 'truth', value: s.truth, accuracy: Number(e.target.value) }); }}/></label></section><section className="panel"><h3>Team access</h3><label>TEAM NAME<input defaultValue={t.name} key={t.id} onBlur={e => { if (e.target.value !== t.name)
    command('rename', { name: e.target.value }); }}/></label><button className="quiet" onClick={async () => { try {
    const v = await act('admin.team', { teamId: t.id, op: 'access' });
    setSecret(v.access);
}
catch { } }}>ISSUE NEW ACCESS CODE</button>{secret && <p className="notice">NEW CODE: <b>{secret}</b> Â· Existing sessions have been signed out.</p>}<label>SET NEW ACCESS CODE<input type="password" minLength={8} maxLength={64} value={access} onChange={e => setAccess(e.target.value)}/></label><button className="quiet" disabled={access.length < 8} onClick={async () => { try { await act('admin.team', { teamId: t.id, op: 'setPassword', accessCode: access }); setAccess(''); } catch {} }}>SET ACCESS CODE</button><label>TYPE {t.code} TO RESET PROGRESS<input value={reset} onChange={e => setReset(e.target.value)}/></label><button className="danger" disabled={reset !== t.code} onClick={() => confirm({ title: 'Reset ' + t.code + '?', description: 'This clears challenges, discoveries, hints and submissions. Uploaded media remains available to control.', run: () => command('reset', { confirm: reset }) })}>RESET TEAM</button><hr/><label>TYPE {t.code} TO DELETE TEAM<input value={deleteText} onChange={e => setDeleteText(e.target.value)}/></label><button className="danger" disabled={deleteText !== t.code} onClick={() => confirm({ title: "Delete " + t.code + "?", description: "This permanently removes the team, its sessions, activity and uploaded media.", run: async () => { try { await request("admin.team", { teamId: t.id, op: "delete", confirm: deleteText }); setDeleteText(""); setSelected(""); location.href = "/admin/teams"; } catch (e: Any) { toast.error(e.message); } } })}>DELETE TEAM</button></section></div>{s.submission && <section className="panel"><h3>Final theory / {s.accuracy} provisional points</h3>{questions.map((q, i) => <p key={q}><b>{q}</b><br />{s.submission.answers[i]}</p>)}<p>{s.submission.explanation}</p><button disabled={s.accuracy < data.settings.threshold} onClick={() => command('objective', { id: 'truth', value: true, accuracy: s.accuracy })}>CONFIRM TRUTH OBJECTIVE</button><p className="muted">Required threshold: {data.settings.threshold}. Adjust deduction accuracy after reviewing the evidence when the provisional score is inaccurate.</p></section>}</section>}<Table><TableHeader><TableRow>{['TEAM', 'STATUS', 'CHALLENGES', 'MAIN FILES', 'EVIDENCE', 'BROADCAST', 'TRUTH', 'PROGRESS', 'LAST ACTIVITY'].map(c => <TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader><TableBody>{data.teams.filter((t: Any) => (t.code + ' ' + t.name).toLowerCase().includes(search.toLowerCase())).map((t: Any) => { const s = t.state; return <TableRow key={t.id} data-selected={selected === t.id}><TableCell><button className="quiet" onClick={() => { setSelected(t.id); setSecret(''); setReset(''); setAccess(''); setDeleteText(''); }}>{t.code}<br />{t.name !== t.code ? t.name : ''}</button></TableCell><TableCell>{s.flag ? 'FLAGGED' : s.truth && s.broadcast ? 'COMPLETE' : t.revision ? 'INVESTIGATING' : 'WAITING'}</TableCell><TableCell>{Object.values(s.challenges).filter((c: Any) => c.status === 'COMPLETED').length}/8</TableCell><TableCell>{Object.keys(s.unlocks).filter(x => /^0/.test(x)).length}/4</TableCell><TableCell>{Object.keys(s.unlocks).filter(x => !/^0/.test(x)).length}/4</TableCell><TableCell>{s.broadcast ? 'âœ“' : 'â€”'}</TableCell><TableCell>{s.truth ? 'âœ“' : s.submittedAt ? 'REVIEW' : 'â€”'}</TableCell><TableCell>{pct(s)}%</TableCell><TableCell>{date(t.updatedAt)}</TableCell></TableRow>; })}</TableBody></Table></>; }
function AdminStations({ data, act }: Any) { const [edit, setEdit] = useState<Any>(null); return <><h2>STATION CONTROL BOARD</h2><div className="challengegrid">{data.challenges.map((c: Any) => { const states = data.teams.map((t: Any) => t.state.challenges[c.id]).filter(Boolean); const complete = states.filter((s: Any) => s.status === 'COMPLETED'); const avg = complete.length ? Math.round(complete.reduce((a: number, s: Any) => a + (s.time - s.startedAt) / 1000, 0) / complete.length) : 0; return <section className="panel" key={c.id}><p className="eyebrow">STATION {c.id} / {c.enabled ? 'AVAILABLE' : 'OFFLINE'}</p><h3>{c.name}</h3><p>{complete.length} completions Â· {states.filter((s: Any) => s.status === 'IN PROGRESS').length} active teams</p><p>Mean recorded time: {clock(avg)}</p><p>REWARD / FILE {c.document} Â· PASSKEY {c.passkey}</p><div className="toolbar"><button className="quiet" onClick={() => void act('admin.challenge', { id: c.id, value: { enabled: !c.enabled } }).catch(() => { })}>{c.enabled ? 'DISABLE' : 'REACTIVATE'}</button><button onClick={() => setEdit({ ...c })}>CONFIGURE</button></div></section>; })}</div><Dialog open={!!edit} onOpenChange={v => { if (!v)
    setEdit(null); }}><DialogContent className="modal"><DialogTitle>CONFIGURE STATION {edit?.id}</DialogTitle><DialogDescription>Changes apply to all teams. Existing completed challenges remain recorded.</DialogDescription>{edit && <form onSubmit={async (e) => { e.preventDefault(); try {
    await act('admin.challenge', { id: edit.id, value: edit });
    setEdit(null);
}
catch { } }}>{['name', 'description', 'instructions'].map(k => <label key={k}>{k.toUpperCase()}<textarea value={edit[k]} onChange={e => setEdit({ ...edit, [k]: e.target.value })}/></label>)}<label>TARGET DOCUMENT</label><Choice label="Target document" value={edit.document} onChange={(document: string) => setEdit({ ...edit, document })} options={data.documents.map((d: Any) => ({ value: d.id, label: d.id + ' / ' + d.title }))}/><p>Change passkeys in the Documents tab.</p><button>SAVE STATION</button></form>}</DialogContent></Dialog></>; }
function AdminDocuments({ data, act }: Any) { const [edit, setEdit] = useState<Any>(null); return <><h2>ARCHIVE CONFIGURATION</h2><p>Passkeys and narrative content below are visible only to authorised control room sessions.</p><div className="filegrid">{data.documents.map((d: Any) => <section className="panel" key={d.id}><p className="eyebrow">FILE {d.id}</p><h3>{d.title}</h3><p>PASSKEY / <b>{d.passkey}</b></p><button className="quiet" onClick={() => setEdit({ ...d })}>EDIT RECORD</button></section>)}</div><Dialog open={!!edit} onOpenChange={v => { if (!v)
    setEdit(null); }}><DialogContent className="modal"><DialogTitle>EDIT FILE {edit?.id}</DialogTitle><DialogDescription>Locked teams cannot fetch the content. Passkey changes take effect immediately.</DialogDescription>{edit && <form onSubmit={async (e) => { e.preventDefault(); try {
    await act('admin.document', { id: edit.id, value: edit });
    setEdit(null);
}
catch { } }}>{['title', 'subtitle', 'classification', 'description', 'passkey', 'question', 'echo'].map(k => <label key={k}>{k.toUpperCase()}<input value={edit[k] || ''} maxLength={k === 'passkey' ? 4 : 1000} onChange={e => setEdit({ ...edit, [k]: e.target.value })}/></label>)}<label>DOCUMENT CONTENT<textarea rows={12} value={edit.content} onChange={e => setEdit({ ...edit, content: e.target.value })}/></label><button>SAVE ARCHIVE</button></form>}</DialogContent></Dialog></>; }
function Review({ data, setSelected, navigate }: Any) { return <section className="panel"><h2>TRUTH SUBMISSION QUEUE</h2>{data.teams.filter((t: Any) => t.state.submittedAt && !t.state.truth).map((t: Any) => <div className="inlinecontrol" key={t.id}><span>{t.code} / {t.state.accuracy} provisional points / {date(t.state.submittedAt)}</span><button onClick={() => { setSelected(t.id); navigate('teams'); }}>REVIEW THEORY</button></div>)}{!data.teams.some((t: Any) => t.state.submittedAt && !t.state.truth) && <p>No theories awaiting review.</p>}</section>; }
function Settings({ data, act, fire, confirm }: Any) { const [v, setV] = useState({ ...data.settings }); const [extend, setExtend] = useState(10); const [start, setStart] = useState(''); const [end, setEnd] = useState(''); return <div className="two"><section className="panel"><h2>TRANSMISSION CONTROL</h2><label>PLANNED START<input type="datetime-local" value={start} onChange={e => setStart(e.target.value)}/></label><label>PLANNED END<input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)}/></label><button className="quiet" disabled={!start || !end} onClick={() => fire('admin.event', { mode: 'schedule', start: new Date(start).getTime(), end: new Date(end).getTime() })}>SCHEDULE TRANSMISSION</button><hr /><p className="eyebrow">{data.settings.status}</p><div className="toolbar"><button onClick={() => fire('admin.event', { mode: data.settings.status === 'WAITING' ? 'start' : data.settings.status === 'RUNNING' ? 'pause' : 'resume' })}>{data.settings.status === 'WAITING' ? 'START EVENT' : data.settings.status === 'RUNNING' ? 'PAUSE EVENT' : 'RESUME EVENT'}</button><button className="quiet" onClick={() => confirm({ title: 'Close the transmission window?', description: 'New team changes and submissions will stop. Existing progress remains available.', run: () => fire('admin.event', { mode: 'end' }) })}>END EVENT</button></div><label>EXTEND BY MINUTES<input type="number" min={1} max={1440} value={extend} onChange={e => setExtend(Number(e.target.value))}/></label><button className="quiet" onClick={() => fire('admin.event', { mode: 'extend', seconds: extend * 60 })}>EXTEND TIMER</button><hr /><button className="danger" onClick={() => confirm({ title: 'Restart event timer?', description: 'Starts a new full transmission window. Team progress is preserved.', run: () => fire('admin.event', { mode: 'restart' }) })}>RESTART TIMER</button><p>Start and end timestamps are controlled centrally. Pauses preserve the remaining duration. Restarting does not reset teams.</p></section><form className="panel" onSubmit={async (e) => { e.preventDefault(); try {
    await act('admin.settings', { value: v });
}
catch { } }}><h2>EVENT SETTINGS</h2><label>EVENT NAME<input value={v.name} onChange={e => setV({ ...v, name: e.target.value })}/></label><label>CONTROL ANNOUNCEMENT<textarea value={v.announcement} onChange={e => setV({ ...v, announcement: e.target.value })}/></label>{[['duration', 'DURATION (SECONDS)'], ['hintCost', 'HINT COST PER LEVEL'], ['threshold', 'TRUTH THRESHOLD (0â€“100)'], ['maxUploadMB', 'MAXIMUM UPLOAD (MB)'], ['requiredUploads', 'REQUIRED MEDIA COUNT']].map(([k, l]) => <label key={k}>{l}<input type="number" value={v[k]} onChange={e => setV({ ...v, [k]: Number(e.target.value) })}/></label>)}{[['leaderboard', 'PARTICIPANT LEADERBOARD'], ['hintPenalty', 'HINT SCORE PENALTIES'], ['requireApproval', 'REQUIRE MEDIA APPROVAL']].map(([k, l]) => <label className="switchrow" key={k}>{l}<Switch checked={v[k]} onCheckedChange={checked => setV({ ...v, [k]: checked })}/></label>)}<h3>Deduction weights / must total 100</h3>{questions.map((q, i) => <label key={q}>{q}<input type="number" min={0} max={100} value={v.weights[i]} onChange={e => setV({ ...v, weights: v.weights.map((n: number, j: number) => i === j ? Number(e.target.value) : n) })}/></label>)}<button>SAVE EVENT SETTINGS</button></form></div>; }
