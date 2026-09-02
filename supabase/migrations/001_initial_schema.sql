-- ==============================================================================
-- DEAD AIR EVENT PLATFORM — DATABASE SCHEMA MIGRATION 001
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE room_enum AS ENUM ('A', 'B', 'C', 'D');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE team_status_enum AS ENUM ('active', 'disqualified', 'finalist');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE admin_role_enum AS ENUM ('super_admin', 'room_coordinator');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE file_type_enum AS ENUM ('text', 'image', 'pdf', 'transcript', 'log');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TEAMS TABLE
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id VARCHAR(32) UNIQUE NOT NULL,               -- Short human code e.g. "TEAM-ALPHA", "DEAD-01"
    team_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    room room_enum NOT NULL DEFAULT 'A',
    members JSONB NOT NULL DEFAULT '[]'::jsonb,        -- Array of member names e.g. ["Alice", "Bob"]
    status team_status_enum NOT NULL DEFAULT 'active',
    current_score INTEGER NOT NULL DEFAULT 0,
    echo_prompts_used INTEGER NOT NULL DEFAULT 0,
    is_logged_in BOOLEAN NOT NULL DEFAULT FALSE,       -- Enforce single active session
    current_session_token VARCHAR(255) DEFAULT NULL,   -- Active JWT / session token ID
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ADMINS / ROOM COORDINATORS TABLE
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role admin_role_enum NOT NULL DEFAULT 'room_coordinator',
    assigned_room room_enum DEFAULT NULL,              -- Nullable for super_admin, required for room_coordinator
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CHALLENGES TABLE
CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,                  -- 'frequency', 'static', 'script', 'frame', 'echo'
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    challenge_type VARCHAR(50) NOT NULL,               -- 'frequency_tuner', 'spectrogram_morse', 'censored_script', 'cctv_frame', 'ai_echo'
    correct_answer_hash VARCHAR(255) NOT NULL,         -- SHA-256 hash of normalized answer
    points_value INTEGER NOT NULL DEFAULT 100,
    unlock_order INTEGER NOT NULL DEFAULT 1,           -- Order of presentation / dependency
    is_locked_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
    hint TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ATTEMPTS TABLE (Full audit trail for unlimited retries)
CREATE TABLE IF NOT EXISTS attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE RESTRICT,
    submitted_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TEAM CHALLENGE PROGRESS TABLE (Set-once solve record)
CREATE TABLE IF NOT EXISTS team_challenge_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE RESTRICT,
    is_solved BOOLEAN NOT NULL DEFAULT FALSE,
    solved_at TIMESTAMPTZ DEFAULT NULL,                -- Set exactly once upon first correct solve
    attempt_count INTEGER NOT NULL DEFAULT 0,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_team_challenge UNIQUE (team_id, challenge_id)
);

-- 7. EVIDENCE FILES TABLE
CREATE TABLE IF NOT EXISTS evidence_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    file_type file_type_enum NOT NULL DEFAULT 'text',
    storage_path VARCHAR(255) DEFAULT NULL,            -- Path in Supabase Storage or relative asset path
    content TEXT NOT NULL,                             -- Inlined markdown/transcript/data or file description
    unlocked_description TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. TEAM UNLOCKED FILES
CREATE TABLE IF NOT EXISTS team_unlocked_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    evidence_file_id UUID NOT NULL REFERENCES evidence_files(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_team_evidence UNIQUE (team_id, evidence_file_id)
);

-- 9. ECHO CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS echo_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. ECHO USAGE TABLE (Atomic Prompt Quota Tracking)
CREATE TABLE IF NOT EXISTS echo_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID UNIQUE NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    prompts_used INTEGER NOT NULL DEFAULT 0 CHECK (prompts_used >= 0 AND prompts_used <= 5),
    max_prompts INTEGER NOT NULL DEFAULT 5,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. TIMELINE EVENTS TABLE (Answer key & event definitions)
CREATE TABLE IF NOT EXISTS timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_index INTEGER NOT NULL,
    correct_timestamp_label VARCHAR(50) NOT NULL,       -- e.g. "23:15", "23:38", "23:54", "00:12"
    correct_event_text TEXT NOT NULL,                  -- Hidden from participants
    hint_title VARCHAR(150) NOT NULL,                  -- Public slot label e.g. "The First Interruption"
    points_value INTEGER NOT NULL DEFAULT 50,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. TIMELINE SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS timeline_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    timeline_event_id UUID NOT NULL REFERENCES timeline_events(id) ON DELETE RESTRICT,
    submitted_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_team_timeline_event UNIQUE (team_id, timeline_event_id)
);

-- 13. FINAL SUBMISSIONS TABLE (Locked case theory dossier)
CREATE TABLE IF NOT EXISTS final_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    round INTEGER NOT NULL DEFAULT 1,
    what_happened TEXT NOT NULL,
    who_was_involved TEXT NOT NULL,
    reconstructed_timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
    key_evidence TEXT NOT NULL,
    final_explanation TEXT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked BOOLEAN NOT NULL DEFAULT TRUE,              -- Immutable once written
    admin_score INTEGER DEFAULT NULL,
    admin_feedback TEXT DEFAULT NULL,
    CONSTRAINT unique_team_final_submission UNIQUE (team_id, round)
);

-- 14. EVENT STATE TABLE (Single source of truth for countdown & rounds)
CREATE TABLE IF NOT EXISTS event_state (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),   -- Singleton row
    round INTEGER NOT NULL DEFAULT 1,
    event_start_time TIMESTAMPTZ DEFAULT NULL,
    event_end_time TIMESTAMPTZ DEFAULT NULL,
    is_paused BOOLEAN NOT NULL DEFAULT FALSE,
    paused_at TIMESTAMPTZ DEFAULT NULL,
    paused_duration_accumulated INTEGER NOT NULL DEFAULT 0, -- Total seconds paused
    duration_minutes INTEGER NOT NULL DEFAULT 90,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. SCORE LOG TABLE (Append-only audit trail for all score mutations)
CREATE TABLE IF NOT EXISTS score_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    delta INTEGER NOT NULL,
    reason TEXT NOT NULL,
    source VARCHAR(20) NOT NULL DEFAULT 'auto' CHECK (source IN ('auto', 'admin')),
    admin_id UUID DEFAULT NULL REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. FINALE STATE TABLE (Round 2 Stage & Projector Controls)
CREATE TABLE IF NOT EXISTS finale_state (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),   -- Singleton row
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    finalist_team_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    current_question_index INTEGER NOT NULL DEFAULT 0,
    current_question JSONB DEFAULT NULL,               -- e.g. {"id": 1, "title": "...", "points": 100, "time_limit": 60}
    timer_seconds INTEGER NOT NULL DEFAULT 60,
    timer_end_time TIMESTAMPTZ DEFAULT NULL,
    is_timer_running BOOLEAN NOT NULL DEFAULT FALSE,
    scores JSONB NOT NULL DEFAULT '{}'::jsonb,          -- e.g. {"team_id_1": 150, "team_id_2": 200}
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_attempts_team_challenge ON attempts(team_id, challenge_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_attempted_at ON attempts(attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_progress_lookup ON team_challenge_progress(team_id, challenge_id);
CREATE INDEX IF NOT EXISTS idx_score_log_team ON score_log(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_echo_conv_team ON echo_conversations(team_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_unlocked_files_team ON team_unlocked_files(team_id);
