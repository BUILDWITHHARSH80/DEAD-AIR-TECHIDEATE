# DEAD AIR (W-DEAD 94.7 FM) — Live Event Platform

[![Full-Stack Event Platform](https://img.shields.io/badge/Stack-React%20%2B%20FastAPI%20%2B%20Supabase-00ff66.svg)](#tech-stack)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20RLS%20%26%20Triggers-00e5ff.svg)](#database-schema--integrity-rules)
[![Deployment](https://img.shields.io/badge/Deployment-Vercel%20Serverless-ffb000.svg)](#vercel-deployment-guide)

**DEAD AIR** is a full-stack, real-time web application built for an in-person mystery / escape-room event across multiple rooms. Teams log in on their devices, solve a sequence of audio and forensic challenges, decrypt evidence files, interrogate a terminal AI character named **ECHO**, reconstruct a chronological timeline, and submit a sealed case theory dossier. An administrator console controls global countdown timers, room coordinators, dispute resets, and the Round 2 "On Air" finale stage presentation.

---

## 📻 The Mystery Storyline: "The Disappearance of Alan Vance"

> **Setting:** Radio Station W-DEAD 94.7 FM ("The Midnight Beacon")  
> **Date:** October 31, 1984 — 23:54 EST  
> During the annual Halloween midnight broadcast, veteran radio host **Alan Vance** vanished from Booth B during an unexplained 7-minute power blackout. A 40-year-old encrypted radio archive and terminal intelligence system named **ECHO** has been restored. 

Teams must investigate five core puzzle frequencies:
1. **Frequency (`/challenges/frequency`)**: Sweep the VHF radio spectrum to locate the ghost carrier harmonic at `96.4 MHz` (**Answer:** `HARBOR_LIGHTS`).
2. **Static (`/challenges/static`)**: Equalize and filter out audio interference to reveal high-pitch Morse code pulses (**Answer:** `NIGHTSHADE_1984`).
3. **Script (`/challenges/script`)**: Unscramble circled red margin notes on Vance's censored on-air cue sheet (**Answer:** `DEAD_AIR_SILENCE`).
4. **Frame (`/challenges/frame`)**: Enhance corrupted CAM-04 security corridor tape frames at 23:52 to read the restricted room stencil (**Answer:** `TRANSMITTER_VAULT_B`).
5. **ECHO (`/challenges/echo`)**: Interrogate the vintage AI terminal (5-prompt quota) to extract the secret military operation codename (**Answer:** `PROJECT_OBLIVION`).

---

## ⚙️ Non-Negotiable Core Engine Rules

1. **Unlimited Server-Side Attempts with Audit Trail:**
   - Every attempt (correct or wrong) writes an immutable row to the `attempts` table.
   - The official solve timestamp (`solved_at` on `team_challenge_progress`) is set **only on the first verified correct solve**.
2. **Database Trigger Enforced Immutability:**
   - A PostgreSQL trigger (`trg_protect_solved_at`) raises a database exception if any query attempts to modify, rewrite, or clear `solved_at` once set.
   - A PostgreSQL trigger (`trg_protect_final_submission`) locks the final case dossier once submitted (`locked = true`), preventing any participant modifications.
3. **Atomic AI Prompt Quotas:**
   - `echo_usage.prompts_used` is checked and incremented atomically via conditional updates before calling the AI, eliminating race-condition overuse.
4. **Serverless Timer as Source of Truth:**
   - Event time is stored in Postgres (`event_start_time`, `event_end_time`, `is_paused`, `paused_duration_accumulated`). The frontend calculates remaining seconds client-side and resyncs periodically against `/api/event/state`.
5. **Single Active Team Session:**
   - Teams track `is_logged_in` and `current_session_token`. Logging in from a new device generates a new session token and terminates any prior active session.

---

## 🏗️ Architecture & Project Structure

```
DEAD-AIR-TECHIDEATE/
├── api/                             # FastAPI Serverless Backend (for Vercel)
│   ├── index.py                     # Main FastAPI app & Vercel entrypoint
│   ├── config.py                    # Environment settings & JWT config
│   ├── database.py                  # Supabase client & local mock fallback
│   ├── auth.py                      # Session validation & password hashing
│   ├── rate_limiter.py              # In-memory per-team rate limiter
│   ├── ai_service.py                # Multi-provider LLM caller + Lore System Prompt
│   └── routers/
│       ├── auth_routes.py           # Team and Admin authentication
│       ├── challenge_routes.py      # Unlimited attempts & solve verification
│       ├── evidence_routes.py       # Decrypted evidence files locker
│       ├── echo_routes.py           # ECHO AI chat & atomic prompt quota
│       ├── timeline_routes.py       # Forensic timeline evaluation
│       ├── submission_routes.py     # Final case dossier submission & lock
│       ├── timer_routes.py          # Event countdown state sync
│       ├── admin_routes.py          # Live admin matrix, scores, resets, timer
│       └── finale_routes.py         # Round 2 question launcher & projector feed
├── frontend/                        # React + Tailwind CSS + Vite
│   ├── index.html                   # HTML template with CRT typography
│   ├── tailwind.config.js           # Custom phosphor green/amber dark theme
│   ├── vite.config.js               # Vite config with /api proxy
│   └── src/
│       ├── App.jsx                  # React Router & protected routes
│       ├── context/
│       │   ├── AuthContext.jsx      # Session management & takeover detection
│       │   ├── TimerContext.jsx     # Countdown sync & client ticking
│       │   └── ToastContext.jsx     # Notifications (success, error, warning)
│       ├── utils/
│       │   ├── api.js               # Central fetch client with JWT headers
│       │   ├── audio.js             # Web Audio API synthesized radio SFX
│       │   └── storage.js           # LocalStorage auto-save for case draft
│       ├── components/
│       │   ├── Navbar.jsx           # Top status bar, live timer pill, score
│       │   ├── EvidenceViewer.jsx   # Document, tape transcript, and log modal
│       │   └── ConfirmationModal.jsx# Reusable danger/warning confirmation
│       └── pages/
│           ├── TeamLogin.jsx        # Participant login
│           ├── TeamDashboard.jsx    # Overview of challenges & stats
│           ├── challenges/          # 5 interactive puzzle interfaces
│           ├── EvidenceRoom.jsx     # Decrypted archive locker
│           ├── TimelineModule.jsx   # Milestone timeline reconstructor
│           ├── FinalSubmission.jsx  # Sealed case theory dossier
│           ├── admin/
│           │   ├── AdminLogin.jsx       # Game Master / Coordinator login
│           │   ├── AdminDashboard.jsx   # Live team matrix, timer, dispute resets
│           │   ├── CoordinatorView.jsx  # Roaming mobile phone panel
│           │   ├── Leaderboard.jsx      # Ranked leaderboard
│           │   └── FinaleConsole.jsx    # Round 2 question launcher & buzzer
│           └── ProjectorView.jsx        # Venue widescreen projector display
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql   # Tables, UUIDs, constraints, indexes
│   │   ├── 002_triggers_and_rules.sql# Immutable solve triggers & atomic RPCs
│   │   └── 003_rls_policies.sql     # Supabase Row Level Security
│   └── seed.sql                     # 5 challenges, evidence, timeline, teams
├── scripts/
│   └── seed_data.py                 # Standalone database seeding script
├── requirements.txt                 # Backend Python dependencies
├── package.json                     # Root npm script runner
├── vercel.json                      # Vercel serverless routing config
└── README.md                        # Project documentation
```

---

## 🚀 Local Development Setup

### Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **Python**: v3.10+ (tested on Python 3.12)

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/dishab777/DEAD-AIR-TECHIDEATE.git
cd DEAD-AIR-TECHIDEATE

# Install Frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Environment Variables Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Supabase credentials and Gemini/OpenAI API key. *(If running locally without Supabase/LLM keys, the backend automatically uses the built-in MockDB and atmospheric AI fallback mode!)*

### 3. Run Backend & Frontend Locally
```bash
# Terminal 1: Run Python FastAPI server (Port 8000)
python -m uvicorn api.index:app --reload --port 8000

# Terminal 2: Run Vite React Frontend (Port 3000)
cd frontend
npm run dev
```

Visit **`http://localhost:3000`** in your browser.

---

## 🗄️ Database Setup (Supabase)

1. Create a new project in [Supabase](https://supabase.com).
2. Open the **SQL Editor** in the Supabase Dashboard.
3. Run the migrations in order:
   - Paste & execute `supabase/migrations/001_initial_schema.sql`
   - Paste & execute `supabase/migrations/002_triggers_and_rules.sql`
   - Paste & execute `supabase/migrations/003_rls_policies.sql`
   - Paste & execute `supabase/seed.sql`
4. Copy your **Project URL**, **anon key**, and **service_role key** from *Project Settings -> API* into your `.env` or Vercel Environment Variables.

---

## 🔑 Default Test Credentials

| Role | Username / Team ID | Password | Access Route |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin` | `DeadAir2026!` | `/admin/login` |
| **Room A Coordinator** | `coord_a` | `playdeadair` | `/admin/login` |
| **Room B Coordinator** | `coord_b` | `playdeadair` | `/admin/login` |
| **Team 01 (Room A)** | `TEAM-01` | `playdeadair` | `/login` |
| **Team 02 (Room A)** | `TEAM-02` | `playdeadair` | `/login` |
| **Team 03 (Room B)** | `TEAM-03` | `playdeadair` | `/login` |
| **Team 04 (Room B)** | `TEAM-04` | `playdeadair` | `/login` |

---

## 🌐 Vercel Deployment Guide

1. Push your code to your GitHub repository:
   ```bash
   git add .
   git commit -m "Deploy DEAD AIR full-stack platform"
   git push origin main
   ```
2. Import the repository in [Vercel](https://vercel.com/new).
3. In Vercel Project Settings -> **Environment Variables**, configure:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY` (or `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`)
   - `JWT_SECRET`
4. Click **Deploy**. Vercel will build the React frontend and deploy the `/api` directory as Python serverless functions in the same project.

---

## 📺 Venue Projector & Stage Displays
- Cast **`https://your-app.vercel.app/projector`** to the event hall projector / stage screens.
- Open **`/admin/finale`** on the Game Master laptop to launch rapid-fire buzzer countdowns and push live questions directly to the projector screen during Round 2.