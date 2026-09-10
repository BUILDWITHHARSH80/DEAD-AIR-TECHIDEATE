
import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  Radio, LayoutDashboard, Users, Archive, Bot, Flag,
  Trophy, Settings, LogOut, Lock, Send, Zap, FileText,
  ChevronDown, ChevronUp
} from "lucide-react";
import "./index.css";

const API = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/+$/, "");

async function req(path, opts = {}) {
  const token = localStorage.getItem("da_token");
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers.Authorization = "Bearer " + token;
  const r = await fetch(API + path, { ...opts, headers });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.detail || "Request failed");
  return d;
}

// ─── SHARED UI PRIMITIVES ─────────────────────────────────────────────────────

function Waveform() {
  return (
    <div className="waveform">
      {[1, 2, 3, 4, 5, 6].map(i => <span key={i} />)}
    </div>
  );
}

function DecryptedBadge() {
  return (
    <span className="decrypted-badge">
      <Waveform /> DECRYPTED
    </span>
  );
}

function Title({ e, t, d }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div className="tiny" style={{ color: "var(--blue)", marginBottom: 7 }}>{e}</div>
      <h2 style={{ fontSize: 27, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.01em" }}>{t}</h2>
      {d && <div className="muted">{d}</div>}
    </div>
  );
}

function Stat({ n, v, accent }) {
  return (
    <div className="stat-card">
      <div className="tiny">{n}</div>
      <div className="stat-value" style={accent ? { color: accent } : {}}>{v}</div>
    </div>
  );
}

function fmt(s) {
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
  return [h, m, sec].map(x => String(x).padStart(2, "0")).join(":");
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

function App() {
  const [role, setRole] = useState(localStorage.getItem("da_role"));
  if (!role) return <Login onLogin={setRole} />;
  return <Shell role={role} logout={() => { localStorage.clear(); setRole(null); }} />;
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────

function Login({ onLogin }) {
  const [mode, setMode] = useState("team");
  const [id, setId] = useState("MDN-01");
  const [pw, setPw] = useState("deadair123");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  function switchMode() {
    const next = mode === "team" ? "admin" : "team";
    setMode(next);
    setId(next === "admin" ? "admin" : "MDN-01");
    setPw(next === "admin" ? "admin123" : "deadair123");
    setErr("");
  }

  async function go() {
    setLoading(true); setErr("");
    try {
      const d = await req(mode === "team" ? "/auth/team" : "/auth/admin", {
        method: "POST",
        body: JSON.stringify(mode === "team" ? { team_id: id, password: pw } : { username: id, password: pw })
      });
      localStorage.setItem("da_token", d.token);
      localStorage.setItem("da_role", d.role);
      if (d.team) localStorage.setItem("da_team", JSON.stringify(d.team));
      onLogin(d.role);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }

  return (
    <div className="app login-wrap">
      <div style={{ width: "min(900px,100%)" }}>
        <div className="tiny" style={{ marginBottom: 22, display: "flex", alignItems: "center", gap: 10 }}>
          <Radio size={11} /> RADIO MERIDIAN — EMERGENCY INVESTIGATOR ACCESS PORTAL
        </div>
        <div className="grid g2">

          {/* LEFT: Branding */}
          <div className="card">
            <div className="pill pill-red" style={{ marginBottom: 22 }}>● BROADCAST BLACKOUT DETECTED</div>
            <h1 style={{
              fontFamily: "var(--mono)", fontSize: 72, lineHeight: 0.82,
              fontWeight: 900, margin: "0 0 20px", letterSpacing: "-0.02em"
            }}>
              DEAD<br />
              <span style={{ color: "var(--text-muted)" }}>AIR</span>
            </h1>
            <p className="muted" style={{ lineHeight: 1.75, fontSize: 14 }}>
              Radio Meridian has gone completely silent — mid-broadcast. The lead host has vanished, leaving
              behind a locked AI terminal and four encrypted broadcast files. You are a digital investigator.
              Decrypt the files. Interrogate ECHO. Reconstruct the truth before the signal is lost forever.
            </p>
            <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 12 }}>
              <Waveform />
              <span className="tiny">SIGNAL FLATLINED // 04:37 AGO</span>
            </div>
          </div>

          {/* RIGHT: Login form */}
          <div className="card">
            <div className="row" style={{ marginBottom: 20 }}>
              <b style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em" }}>
                {mode === "team" ? "// INVESTIGATOR LOGIN" : "// CONTROL CONSOLE"}
              </b>
              <button className="btn" style={{ fontSize: 11, padding: "5px 10px" }} onClick={switchMode}>
                Switch
              </button>
            </div>
            <div className="space">
              <div className="tiny" style={{ marginBottom: 8 }}>{mode === "team" ? "TEAM ID" : "USERNAME"}</div>
              <input className="input" value={id} onChange={e => setId(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} />
            </div>
            <div className="space">
              <div className="tiny" style={{ marginBottom: 8 }}>ACCESS CODE</div>
              <input className="input" type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} />
            </div>
            {err && (
              <p style={{ fontFamily: "var(--mono)", color: "var(--red)", fontSize: 12, marginTop: 12 }}>
                ✕ {err}
              </p>
            )}
            <button
              className="btn primary space"
              style={{ width: "100%", marginTop: 20, justifyContent: "center", padding: "13px" }}
              onClick={go}
              disabled={loading}
            >
              {loading ? "AUTHENTICATING..." : "ENTER TERMINAL →"}
            </button>
            <p className="muted" style={{ fontSize: 11, marginTop: 14, textAlign: "center" }}>
              Team: deadair123 · Admin: admin / admin123
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── SHELL (sidebar + header wrapper) ────────────────────────────────────────

function Shell({ role, logout }) {
  const [page, setPage] = useState(role === "admin" ? "overview" : "dashboard");
  const team = JSON.parse(localStorage.getItem("da_team") || "{}");

  const nav = role === "admin"
    ? [
        ["overview",     "Overview",       LayoutDashboard],
        ["teams",        "Teams",          Users],
        ["leaderboard",  "Leaderboard",    Trophy],
        ["submissions",  "Submissions",    FileText],
        ["controls",     "Controls",       Settings],
      ]
    : [
        ["dashboard",    "Investigator Terminal", LayoutDashboard],
        ["files",        "Broadcast Files",       Zap],
        ["evidence",     "Evidence Room",         Archive],
        ["echo",         "ECHO Terminal",         Bot],
        ["submission",   "Final Report",          Flag],
      ];

  return (
    <div className="shell app">
      <aside className="side">
        <div className="logo"><Radio size={13} /> DEAD AIR</div>
        <div className="team-badge">
          <div className="tiny">{role === "admin" ? "CONTROL" : "INVESTIGATOR"}</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, marginTop: 5, color: "var(--text-dim)" }}>
            {role === "admin" ? "ADMIN // PRIMARY" : `${team.team_id} // ${team.name}`}
          </div>
        </div>
        <nav className="nav">
          {nav.map(([id, n, I]) => (
            <button key={id} className={page === id ? "active" : ""} onClick={() => setPage(id)}>
              <I size={14} />{n}
            </button>
          ))}
        </nav>
        <button className="nav-exit" onClick={logout}><LogOut size={14} />Exit terminal</button>
      </aside>

      <section className="main">
        <header className="top">
          <span className="tiny">◈ SYSTEM ONLINE // RADIO MERIDIAN INCIDENT RESPONSE</span>
          <div className="flex">
            <Waveform />
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-muted)" }}>LIVE</span>
          </div>
        </header>
        <main className="content">
          {role === "admin" ? <Admin page={page} /> : <Team page={page} />}
        </main>
      </section>
    </div>
  );
}

// ─── TEAM PAGE ROUTER ─────────────────────────────────────────────────────────

function Team({ page }) {
  if (page === "files")      return <BroadcastFiles />;
  if (page === "evidence")   return <Evidence />;
  if (page === "echo")       return <Echo />;
  if (page === "submission") return <FinalReport />;
  return <Dashboard />;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

function Dashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { req("/team/dashboard").then(setD); }, []);
  if (!d) return <div className="muted mono" style={{ padding: 40 }}>LOADING TERMINAL...</div>;

  const unlocked = d.challenges.filter(x => x.solved).length;

  return (
    <>
      <Title
        e="// INVESTIGATOR TERMINAL"
        t={d.team.name}
        d={`${d.team.team_id} · Station: ${d.team.room}`}
      />
      <div className="grid g4" style={{ marginBottom: 20 }}>
        <Stat
          n="TIME REMAINING"
          v={fmt(d.timer.remaining_seconds)}
          accent={d.timer.remaining_seconds < 600 ? "var(--red)" : d.timer.remaining_seconds < 1800 ? "var(--amber)" : undefined}
        />
        <Stat
          n="BROADCAST FILES"
          v={`${unlocked} / 4`}
          accent={unlocked === 4 ? "var(--green)" : undefined}
        />
        <Stat n="ECHO QUERIES" v={`${d.echo_used} / 5`} />
        <Stat
          n="PASSKEYS ENTERED"
          v={unlocked}
          accent={unlocked > 0 ? "var(--blue)" : undefined}
        />
      </div>

      <div className="card">
        <div className="tiny" style={{ marginBottom: 16 }}>ENCRYPTED BROADCAST LOG — FILE STATUS</div>
        {d.challenges.map(c => (
          <div
            key={c.id}
            className="row"
            style={{ padding: "13px 0", borderBottom: "1px solid var(--border)" }}
          >
            <div>
              <b style={{ fontFamily: "var(--mono)", fontSize: 13 }}>FILE {c.code} · {c.name}</b>
              <div className="muted" style={{ fontSize: 11, marginTop: 3, fontFamily: "var(--mono)" }}>
                {c.type}
              </div>
            </div>
            {c.solved
              ? <DecryptedBadge />
              : <span className="flex" style={{ color: "var(--text-muted)", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em" }}>
                  <Lock size={11} /> LOCKED
                </span>
            }
          </div>
        ))}
      </div>
    </>
  );
}

// ─── BROADCAST FILES (PASSKEY ENTRY) ─────────────────────────────────────────

function BroadcastFiles() {
  const [cs, setCs] = useState([]);
  const [passkeys, setPasskeys] = useState({});
  const [flash, setFlash] = useState(null);   // { slug, text, ok }

  const load = () => req("/challenges").then(setCs);
  useEffect(load, []);

  function handlePasskeyChange(slug, raw) {
    const val = raw.replace(/\D/g, "").slice(0, 4);
    setPasskeys(prev => ({ ...prev, [slug]: val }));
  }

  async function submitPasskey(c) {
    const pk = (passkeys[c.slug] || "").trim();
    if (pk.length !== 4) {
      setFlash({ slug: c.slug, text: "Passkey must be exactly 4 digits.", ok: false });
      return;
    }
    try {
      const d = await req(`/challenges/${c.slug}/submit`, {
        method: "POST",
        body: JSON.stringify({ answer: pk })
      });
      setFlash(d.correct
        ? { slug: c.slug, text: `▓▓▓▓ FILE ${c.code} DECRYPTED — evidence now accessible.`, ok: true }
        : { slug: c.slug, text: `✕ Wrong passkey for ${c.name}. Check the physical station again.`, ok: false }
      );
      load();
    } catch (e) {
      setFlash({ slug: c.slug, text: e.message, ok: false });
    }
  }

  return (
    <>
      <Title
        e="// ENCRYPTED BROADCAST FILES"
        t="Broadcast Files"
        d="Visit each physical station to complete the challenge and receive your 4-digit passkey. Enter it below to decrypt the file."
      />
      <div className="grid g2">
        {cs.map(c => (
          <div className="card file-card" key={c.slug}>
            <div className="row">
              <span className="file-num">FILE {c.code}</span>
              {c.solved
                ? <DecryptedBadge />
                : <span className="pill pill-muted">ENCRYPTED</span>
              }
            </div>

            <div>
              <b style={{ fontFamily: "var(--mono)", fontSize: 15 }}>{c.name}</b>
              <div className="muted" style={{ fontSize: 12, marginTop: 5 }}>{c.challenge_type}</div>
            </div>

            {c.solved ? (
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                ▸ File accessible in Evidence Room
              </div>
            ) : (
              <div>
                <div className="tiny" style={{ marginBottom: 10 }}>ENTER PASSKEY FROM STATION</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    className="passkey-input"
                    value={passkeys[c.slug] || ""}
                    onChange={e => handlePasskeyChange(c.slug, e.target.value)}
                    placeholder="_ _ _ _"
                    maxLength={4}
                    inputMode="numeric"
                    autoComplete="off"
                    onKeyDown={e => e.key === "Enter" && submitPasskey(c)}
                  />
                  <button
                    className="btn primary"
                    disabled={(passkeys[c.slug] || "").length !== 4}
                    onClick={() => submitPasskey(c)}
                  >
                    ENTER PASSKEY
                  </button>
                </div>
                {flash && flash.slug === c.slug && (
                  <div style={{
                    marginTop: 12, padding: "10px 14px", borderRadius: 8,
                    fontFamily: "var(--mono)", fontSize: 12,
                    background: flash.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                    border: `1px solid ${flash.ok ? "var(--green-dim)" : "#7f1d1d"}`,
                    color: flash.ok ? "var(--green)" : "var(--red)"
                  }}>
                    {flash.text}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ─── EVIDENCE ROOM ────────────────────────────────────────────────────────────

function Evidence() {
  const [d, setD] = useState([]);
  useEffect(() => { req("/evidence").then(setD); }, []);

  function openFile(item) {
    if (!item.unlocked) return;
    const url = item.url || (API.replace(/\/api$/, "") + "/evidence/" + encodeURIComponent(item.name));
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <Title
        e="// EVIDENCE ROOM"
        t="Recovered Files"
        d="Evidence files are unlocked when you enter the correct passkey at each station."
      />
      <div className="grid g2">
        {d.map(x => (
          <div className="card row" key={x.name}>
            <div>
              <b style={{ fontFamily: "var(--mono)", fontSize: 13 }}>{x.name}</b>
              <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{x.challenge}</div>
            </div>
            {x.unlocked
              ? <button className="btn success-btn" onClick={() => openFile(x)}>Open File</button>
              : <span className="flex" style={{ color: "var(--text-muted)", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em" }}>
                  <Lock size={11} /> LOCKED
                </span>
            }
          </div>
        ))}
      </div>
    </>
  );
}

// ─── ECHO TERMINAL ────────────────────────────────────────────────────────────

function Echo() {
  const [history, setHistory] = useState([]);
  const [text, setText] = useState("");
  const [used, setUsed] = useState(0);
  const chatRef = useRef(null);

  async function send() {
    const q = text.trim();
    if (!q || used >= 5) return;
    setText("");
    try {
      const d = await req("/echo", { method: "POST", body: JSON.stringify({ message: q }) });
      setHistory(d.history);
      setUsed(d.used);
    } catch (e) { alert(e.message); }
  }

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [history]);

  const exhausted = used >= 5;

  return (
    <>
      <Title
        e="// LOCKED AI TERMINAL"
        t="ECHO"
        d="The AI of the missing host. Its memory is fragmented. Use clues from the unlocked broadcast files to interrogate it."
      />
      <div className="echo-terminal">
        <div className="echo-header">
          <div className="flex">
            <Bot size={14} style={{ color: "var(--blue)" }} />
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em" }}>
              ECHO // DJ MERIDIAN'S AI
            </span>
            <span className="pill pill-blue">RESTRICTED ACCESS</span>
          </div>
          <span className="tiny" style={{ color: exhausted ? "var(--red)" : "var(--text-muted)" }}>
            {used}/5 INTERROGATIONS {exhausted ? "— LIMIT REACHED" : "USED"}
          </span>
        </div>

        <div className="echo-body">
          <div className="chat" ref={chatRef}>
            {history.length === 0 && (
              <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>
                <span style={{ color: "var(--green)" }}>ECHO_ONLINE</span> // MEMORY CORRUPTED<br />
                <span style={{ color: "var(--green)" }}>▶</span>&nbsp;I remember the broadcast. I remember the silence. Ask me what you need to know.
              </div>
            )}
            {history.map((m, i) => (
              <div key={i} className={`msg ${m.role === "user" ? "user" : "echo"}`}>
                {m.content}
              </div>
            ))}
          </div>
          <div className="echo-input-row">
            <input
              className="input"
              value={text}
              disabled={exhausted}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder={exhausted ? "INTERROGATION LIMIT REACHED" : "Ask ECHO about the incident..."}
            />
            <button className="btn primary" onClick={send} disabled={exhausted || !text.trim()}>
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── FINAL REPORT ─────────────────────────────────────────────────────────────

function FinalReport() {
  const [x, setX] = useState({ broadcast_schedule: "", truth_theory: "" });
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!x.broadcast_schedule.trim() || !x.truth_theory.trim()) {
      alert("Both fields are required before transmitting your report.");
      return;
    }
    setLoading(true);
    try {
      await req("/submission", { method: "POST", body: JSON.stringify(x) });
      setDone(true);
    } catch (e) { alert(e.message); }
    setLoading(false);
  }

  if (done) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "70px 40px" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 32, fontWeight: 900, color: "var(--green)", letterSpacing: "0.2em", marginBottom: 16 }}>
          ▓▓▓▓ TRANSMITTED
        </div>
        <h2 style={{ marginBottom: 10 }}>Final Report Locked</h2>
        <p className="muted">Your investigation has been submitted. No further edits are permitted.</p>
      </div>
    );
  }

  return (
    <>
      <Title
        e="// FINAL REPORT"
        t="Transmit Your Findings"
        d="Complete both tasks and submit your final report. This action is permanent and irreversible."
      />
      <div className="card">

        {/* Task 1 */}
        <div style={{ marginBottom: 24 }}>
          <div className="tiny" style={{ marginBottom: 8, color: "var(--blue)" }}>
            TASK 1 — COMPLETE THE RADIO BROADCAST SCHEDULE
          </div>
          <p className="muted" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.65 }}>
            Reconstruct the interrupted broadcast programme. List each scheduled segment, its timestamp, and whether it aired, was interrupted, or was replaced. Be as precise as possible.
          </p>
          <textarea
            className="textarea"
            style={{ minHeight: 150, fontFamily: "var(--mono)", fontSize: 13 }}
            value={x.broadcast_schedule}
            onChange={e => setX({ ...x, broadcast_schedule: e.target.value })}
            placeholder={"e.g.\n23:30 — Evening News (aired in full)\n23:38 — Frequency Log (interrupted at 23:41)\n23:42 — Emergency tone (played unexpectedly)\n..."}
          />
        </div>

        <hr className="divider" />

        {/* Task 2 */}
        <div>
          <div className="tiny" style={{ marginBottom: 8, color: "var(--blue)" }}>
            TASK 2 — REVEAL THE TRUTH
          </div>
          <p className="muted" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.65 }}>
            Submit your exact theory: what happened, when it happened, why the host disappeared, and who or what caused the blackout. Accuracy is scored — be specific.
          </p>
          <textarea
            className="textarea"
            style={{ minHeight: 170, fontFamily: "var(--mono)", fontSize: 13 }}
            value={x.truth_theory}
            onChange={e => setX({ ...x, truth_theory: e.target.value })}
            placeholder={"e.g.\nAt 23:41, the transmitter was manually disabled by...\nThe host disappeared because...\nThe blackout was caused by...\nKey evidence: ..."}
          />
        </div>

        <button
          className="btn danger"
          style={{ width: "100%", marginTop: 24, justifyContent: "center", padding: "14px", fontSize: 13, letterSpacing: "0.08em" }}
          onClick={send}
          disabled={loading}
        >
          {loading ? "TRANSMITTING..." : "▓ TRANSMIT FINAL REPORT"}
        </button>
        <p className="muted" style={{ fontSize: 11, marginTop: 10, textAlign: "center" }}>
          ⚠ Once submitted, this report is permanently locked. No changes permitted.
        </p>
      </div>
    </>
  );
}

// ─── ADMIN PAGE ROUTER ────────────────────────────────────────────────────────

function Admin({ page }) {
  if (page === "teams")       return <AdminTeams />;
  if (page === "leaderboard") return <AdminBoard />;
  if (page === "submissions") return <AdminSubmissions />;
  if (page === "controls")    return <Controls />;
  return <AdminOverview />;
}

// ─── ADMIN OVERVIEW ───────────────────────────────────────────────────────────

function AdminOverview() {
  const [d, setD] = useState(null);
  const load = () => req("/admin/overview").then(setD);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);
  if (!d) return <div className="muted mono" style={{ padding: 40 }}>LOADING...</div>;

  return (
    <>
      <Title e="// ADMIN LIVE CONTROL" t="Event Overview" />
      <div className="grid g4" style={{ marginBottom: 20 }}>
        <Stat n="ACTIVE TEAMS"    v={d.active} />
        <Stat n="SUBMITTED"       v={d.submissions} accent={d.submissions > 0 ? "var(--green)" : undefined} />
        <Stat n="FILES UNLOCKED"  v={d.files_unlocked} accent="var(--blue)" />
        <Stat n="AVG SCORE"       v={d.avg_score} />
      </div>

      <div className="card">
        <div className="row" style={{ flexWrap: "wrap", gap: 18 }}>
          <div>
            <div className="tiny" style={{ marginBottom: 8 }}>EVENT TIMER</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 52, fontWeight: 900, lineHeight: 1 }}>
              {fmt(d.timer.remaining_seconds)}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
            <span className={`pill ${d.timer.status === "running" ? "pill-green" : d.timer.status === "paused" ? "pill-amber" : "pill-muted"}`}>
              {d.timer.status.replace("_", " ").toUpperCase()}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn danger" onClick={() => req("/admin/event/pause", { method: "POST" }).then(load)}>Pause</button>
              <button className="btn primary" onClick={() => req("/admin/event/start", { method: "POST" }).then(load)}>Start</button>
              <button className="btn" onClick={() => req("/admin/event/end", { method: "POST" }).then(load)}>End</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── ADMIN TEAMS ──────────────────────────────────────────────────────────────

function AdminTeams() {
  const [room, setRoom] = useState("ALL");
  const [rows, setRows] = useState([]);
  useEffect(() => { req("/admin/teams?room=" + encodeURIComponent(room)).then(setRows); }, [room]);

  return (
    <>
      <Title e="// ADMIN TEAMS" t="Live Progress" d="Real-time team passkey and submission status." />
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {["ALL", "ROOM A", "ROOM B", "ROOM C", "ROOM D"].map(r => (
          <button key={r} className={`btn${room === r ? " primary" : ""}`} style={{ fontSize: 11 }} onClick={() => setRoom(r)}>
            {r}
          </button>
        ))}
      </div>
      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              {["Team", "Station", "Status", "Passkeys", "Files", "ECHO Used", "Score"].map(x => <th key={x}>{x}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.team_id}>
                <td>
                  <b style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{r.team_id}</b>
                  <div className="muted" style={{ fontSize: 11 }}>{r.name}</div>
                </td>
                <td style={{ color: "var(--text-dim)" }}>{r.room}</td>
                <td>
                  <span className={`pill ${r.status === "Submitted" ? "pill-green" : "pill-amber"}`}>
                    {r.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ fontFamily: "var(--mono)" }}>{r.challenges}/4</td>
                <td style={{ fontFamily: "var(--mono)" }}>{r.files}/4</td>
                <td style={{ fontFamily: "var(--mono)" }}>{r.echo_used}/5</td>
                <td style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--blue)" }}>{r.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── ADMIN LEADERBOARD ────────────────────────────────────────────────────────

function AdminBoard() {
  const [rows, setRows] = useState([]);
  useEffect(() => { req("/admin/leaderboard").then(setRows); }, []);

  return (
    <>
      <Title
        e="// ADMIN RANKINGS"
        t="Leaderboard"
        d="Sorted by: both tasks submitted → accuracy score → submission time → passkey score."
      />
      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              {["Rank","Team","Station","Files","Tasks","Accuracy","Sub. Time","Score"].map(x => <th key={x}>{x}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.team_id}>
                <td style={{ fontFamily: "var(--mono)", fontWeight: 800, color: r.rank <= 3 ? "var(--amber)" : undefined }}>
                  #{r.rank}
                </td>
                <td>
                  <b style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{r.team_id}</b>
                  <div className="muted" style={{ fontSize: 11 }}>{r.name}</div>
                </td>
                <td style={{ color: "var(--text-dim)", fontSize: 12 }}>{r.room}</td>
                <td style={{ fontFamily: "var(--mono)" }}>{r.files}/4</td>
                <td>
                  {r.both_tasks
                    ? <span className="pill pill-green">BOTH</span>
                    : r.submitted
                      ? <span className="pill pill-amber">PARTIAL</span>
                      : <span className="pill pill-muted">NONE</span>
                  }
                </td>
                <td style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>
                  {r.accuracy_score !== null && r.accuracy_score !== undefined
                    ? <span style={{ color: r.accuracy_score === 100 ? "var(--green)" : r.accuracy_score >= 50 ? "var(--amber)" : "var(--red)" }}>
                        {r.accuracy_score}%
                      </span>
                    : <span style={{ color: "var(--text-muted)" }}>—</span>
                  }
                </td>
                <td style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-muted)" }}>
                  {r.submitted_at ? new Date(r.submitted_at + "Z").toLocaleTimeString() : "—"}
                </td>
                <td style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--blue)" }}>{r.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── ADMIN SUBMISSIONS (THEORY JUDGE) ────────────────────────────────────────

function AdminSubmissions() {
  const [rows, setRows] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [saving, setSaving] = useState({});
  useEffect(() => { req("/admin/submissions").then(setRows); }, []);

  function toggle(id) { setExpanded(prev => ({ ...prev, [id]: !prev[id] })); }

  async function setAccuracy(id, score) {
    setSaving(prev => ({ ...prev, [id]: true }));
    try {
      await req(`/admin/submissions/${id}/accuracy`, { method: "POST", body: JSON.stringify({ score }) });
      setRows(prev => prev.map(r => r.id === id ? { ...r, accuracy_score: score } : r));
    } catch (e) { alert(e.message); }
    setSaving(prev => ({ ...prev, [id]: false }));
  }

  return (
    <>
      <Title
        e="// THEORY JUDGE"
        t="Submission Review"
        d="Review each team's final report and rate their theory accuracy. This determines leaderboard placement and breaks ties."
      />

      {rows.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <div className="muted mono" style={{ fontSize: 13 }}>No final reports submitted yet.</div>
        </div>
      )}

      {rows.map(r => (
        <div className="theory-card" key={r.id}>
          <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
            <div>
              <b style={{ fontFamily: "var(--mono)", fontSize: 13 }}>{r.team_id} · {r.team_name}</b>
              <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>
                Station: {r.room} · Submitted: {r.submitted_at ? new Date(r.submitted_at + "Z").toLocaleTimeString() : "—"}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {r.accuracy_score !== null && r.accuracy_score !== undefined && (
                <span className={`pill ${r.accuracy_score === 100 ? "pill-green" : r.accuracy_score >= 50 ? "pill-amber" : "pill-red"}`}>
                  {r.accuracy_score}% ACCURACY
                </span>
              )}
              <button className="btn" style={{ fontSize: 11, padding: "6px 12px" }} onClick={() => toggle(r.id)}>
                {expanded[r.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {expanded[r.id] ? "Collapse" : "Review Theory"}
              </button>
            </div>
          </div>

          {expanded[r.id] && (
            <div style={{ marginTop: 16 }}>
              <div className="tiny" style={{ marginBottom: 6 }}>BROADCAST SCHEDULE</div>
              <div className="theory-text">{r.broadcast_schedule || "— Not provided —"}</div>

              <div className="tiny" style={{ marginBottom: 6, marginTop: 16 }}>TRUTH THEORY</div>
              <div className="theory-text">{r.truth_theory || "— Not provided —"}</div>

              <div className="accuracy-btns">
                <div className="tiny" style={{ width: "100%", marginBottom: 4 }}>SET ACCURACY SCORE:</div>
                {[0, 50, 100].map(s => (
                  <button
                    key={s}
                    className={`btn${r.accuracy_score === s ? " primary" : ""}`}
                    style={{ fontSize: 12 }}
                    onClick={() => setAccuracy(r.id, s)}
                    disabled={saving[r.id]}
                  >
                    {s === 0 ? "✕  0% — Wrong" : s === 50 ? "◑  50% — Partial" : "✓  100% — Correct"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

// ─── ADMIN CONTROLS ───────────────────────────────────────────────────────────

function Controls() {
  return (
    <>
      <Title e="// ADMIN OVERRIDE" t="Controls" d="Server-side controls for the live event." />
      <div className="grid g2">
        {[
          ["Event Timer",       "Start, pause, resume, or end the event clock."],
          ["File Locks",        "Enable or disable individual broadcast file stations."],
          ["Score Override",    "Award or revoke passkey score for any team."],
          ["Attempt Reset",     "Clear a team's passkey attempts for a specific station."],
          ["Evidence Upload",   "Upload broadcast file evidence directly to storage."],
          ["Backup Scoring",    "Manual fallback scoring if the system is unavailable."],
        ].map(([t, desc]) => (
          <div className="card" key={t}>
            <b style={{ fontFamily: "var(--mono)", fontSize: 13 }}>{t}</b>
            <p className="muted" style={{ fontSize: 13, marginTop: 7, lineHeight: 1.6 }}>{desc}</p>
            <button className="btn" style={{ marginTop: 14, fontSize: 12 }}>Open control</button>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── MOUNT ────────────────────────────────────────────────────────────────────

createRoot(document.getElementById("root")).render(<App />);
